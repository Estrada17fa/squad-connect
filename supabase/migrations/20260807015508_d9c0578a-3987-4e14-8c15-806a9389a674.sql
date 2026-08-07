CREATE OR REPLACE FUNCTION public.requests_status_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pendiente' THEN
      RAISE EXCEPTION 'Una solicitud nueva debe iniciar en estatus pendiente';
    END IF;
    INSERT INTO public.request_status_history (request_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, v_actor);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('aprobada', 'rechazada') AND v_actor IS NOT NULL AND v_actor = OLD.requester_id THEN
      RAISE EXCEPTION 'No puedes aprobar ni rechazar tu propia solicitud';
    END IF;

    IF NOT (
      (OLD.status = 'pendiente' AND NEW.status IN ('aprobada', 'rechazada', 'cancelada'))
      OR (OLD.status = 'aprobada' AND NEW.status = 'completada'
          AND NEW.type IN ('material', 'compra', 'pago_proveedor', 'reembolso', 'medica'))
    ) THEN
      RAISE EXCEPTION 'Transición de estatus no permitida: % → %', OLD.status, NEW.status;
    END IF;

    IF NEW.status = 'cancelada' AND v_actor IS NOT NULL AND v_actor <> OLD.requester_id THEN
      RAISE EXCEPTION 'Solo el solicitante puede cancelar su solicitud';
    END IF;

    IF NEW.status IN ('aprobada', 'rechazada') THEN
      NEW.decided_at := now();
      NEW.decided_by := v_actor;
    END IF;

    INSERT INTO public.request_status_history (request_id, from_status, to_status, note, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.decision_note, v_actor);
  END IF;

  RETURN NEW;
END;
$function$;