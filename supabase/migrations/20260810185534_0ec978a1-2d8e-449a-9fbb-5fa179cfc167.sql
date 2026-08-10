ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'requiere_info';

DROP POLICY IF EXISTS requests_update ON public.requests;
CREATE POLICY requests_update ON public.requests
FOR UPDATE
USING (
  has_club_access(auth.uid(), club_id) AND (
    ((requester_id = auth.uid()) AND status::text = ANY (ARRAY['pendiente','requiere_info']))
    OR is_super_admin(auth.uid())
    OR request_scope_ok(auth.uid(), team_id, true)
    OR (can_approve_request_type(auth.uid(), type, requester_id) AND ((team_id IS NULL) OR has_team_scope(auth.uid(), team_id)))
  )
)
WITH CHECK (
  has_club_access(auth.uid(), club_id)
  AND NOT ((requester_id = auth.uid()) AND status::text = ANY (ARRAY['aprobada','rechazada']))
);

DROP POLICY IF EXISTS requests_delete ON public.requests;
CREATE POLICY requests_delete ON public.requests
FOR DELETE
USING (
  has_club_access(auth.uid(), club_id) AND (
    ((requester_id = auth.uid()) AND status::text = ANY (ARRAY['pendiente','requiere_info','cancelada','rechazada']))
    OR is_super_admin(auth.uid())
    OR request_scope_ok(auth.uid(), team_id, true)
  )
);

CREATE OR REPLACE FUNCTION public.requests_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old text;
  v_new text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status::text <> 'pendiente' THEN
      RAISE EXCEPTION 'Una solicitud nueva debe iniciar en estatus pendiente';
    END IF;
    INSERT INTO public.request_status_history (request_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, v_actor);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_old := OLD.status::text;
    v_new := NEW.status::text;

    IF v_new IN ('aprobada','rechazada','requiere_info') AND v_actor IS NOT NULL AND v_actor = OLD.requester_id THEN
      RAISE EXCEPTION 'No puedes resolver tu propia solicitud';
    END IF;

    IF NOT (
      (v_old = 'pendiente' AND v_new IN ('aprobada','rechazada','cancelada','requiere_info'))
      OR (v_old = 'requiere_info' AND v_new IN ('pendiente','aprobada','rechazada','cancelada'))
      OR (v_old = 'aprobada' AND v_new = 'completada'
          AND NEW.type IN ('material','compra','pago_proveedor','reembolso','medica'))
    ) THEN
      RAISE EXCEPTION 'Transición de estatus no permitida: % → %', v_old, v_new;
    END IF;

    IF v_new = 'cancelada' AND v_actor IS NOT NULL AND v_actor <> OLD.requester_id THEN
      RAISE EXCEPTION 'Solo el solicitante puede cancelar su solicitud';
    END IF;

    IF v_old = 'requiere_info' AND v_new = 'pendiente'
       AND v_actor IS NOT NULL AND v_actor <> OLD.requester_id THEN
      RAISE EXCEPTION 'Solo el solicitante puede reenviar su solicitud';
    END IF;

    IF v_new IN ('aprobada','rechazada') THEN
      NEW.decided_at := now();
      NEW.decided_by := v_actor;
    END IF;

    IF v_old = 'requiere_info' AND v_new = 'pendiente' THEN
      NEW.decided_at := NULL;
      NEW.decided_by := NULL;
    END IF;

    INSERT INTO public.request_status_history (request_id, from_status, to_status, note, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.decision_note, v_actor);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_request_decided()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new text;
  v_old text;
  v_ids uuid[];
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  v_new := NEW.status::text;
  v_old := OLD.status::text;

  IF v_new IN ('aprobada','rechazada') THEN
    PERFORM public.notify_users(
      NEW.club_id, ARRAY[NEW.requester_id],
      CASE WHEN v_new = 'aprobada' THEN 'solicitud_aprobada' ELSE 'solicitud_rechazada' END,
      CASE WHEN v_new = 'aprobada'
        THEN 'Tu solicitud de ' || NEW.title || ' fue aprobada'
        ELSE 'Tu solicitud de ' || NEW.title || ' fue rechazada' END,
      NEW.decision_note,
      'solicitudes', NEW.id
    );
    RETURN NEW;
  END IF;

  IF v_new = 'requiere_info' THEN
    PERFORM public.notify_users(
      NEW.club_id, ARRAY[NEW.requester_id],
      'solicitud_info',
      'Te piden más información sobre tu solicitud de ' || NEW.title,
      NEW.decision_note,
      'solicitudes', NEW.id
    );
    RETURN NEW;
  END IF;

  IF v_old = 'requiere_info' AND v_new = 'pendiente' THEN
    SELECT array_agg(user_id) INTO v_ids
    FROM public.request_type_approver_ids(NEW.club_id, NEW.type)
    WHERE user_id <> NEW.requester_id;

    IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
      PERFORM public.notify_users(
        NEW.club_id, v_ids,
        'solicitud_actualizada',
        'Actualizaron la solicitud de ' || NEW.title,
        'El solicitante respondió a la petición de información',
        'solicitudes', NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;