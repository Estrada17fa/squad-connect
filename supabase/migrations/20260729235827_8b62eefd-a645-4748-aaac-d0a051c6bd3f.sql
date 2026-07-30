CREATE OR REPLACE FUNCTION public.request_approver_module(_type public.request_type)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _type
    WHEN 'material' THEN 'inventario'
    WHEN 'medica' THEN 'salud'
    WHEN 'compra' THEN 'compras_facturas'
    WHEN 'pago_proveedor' THEN 'compras_facturas'
    WHEN 'reembolso' THEN 'compras_facturas'
    ELSE 'coordinacion_interna'
  END
$$;

CREATE OR REPLACE FUNCTION public.has_module_approver_any(_user_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    LEFT JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = _user_id
      AND rp.module_key = _module_key
      AND rp.access_level = 'approver'
      AND r.club_id = public.get_user_club_id(_user_id)
      AND (tm.team_id IS NULL OR t.club_id = public.get_user_club_id(_user_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_approve_request_type(_user_id uuid, _type public.request_type, _requester_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS DISTINCT FROM _requester_id
     AND (
       public.is_super_admin(_user_id)
       OR public.has_module_approver_any(_user_id, public.request_approver_module(_type))
     )
$$;

CREATE OR REPLACE FUNCTION public.can_view_request(_user_id uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = _request_id
      AND public.has_club_access(_user_id, r.club_id)
      AND (
        r.requester_id = _user_id
        OR public.is_super_admin(_user_id)
        OR public.has_module_editor_any(_user_id, 'solicitudes')
        OR public.has_module_approver_any(_user_id, 'solicitudes')
        OR public.has_module_approver_any(_user_id, public.request_approver_module(r.type))
      )
  )
$$;

CREATE TABLE IF NOT EXISTS public.request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  from_status public.request_status,
  to_status public.request_status NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.request_status_history TO authenticated;
GRANT ALL ON public.request_status_history TO service_role;

ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rsh_select ON public.request_status_history;
CREATE POLICY rsh_select ON public.request_status_history
  FOR SELECT TO authenticated
  USING (public.can_view_request(auth.uid(), request_id));

CREATE INDEX IF NOT EXISTS idx_rsh_request ON public.request_status_history(request_id, created_at);

CREATE OR REPLACE FUNCTION public.requests_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      OR (OLD.status = 'aprobada' AND NEW.status = 'completada' AND NEW.type IN ('material', 'compra'))
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
$$;

DROP TRIGGER IF EXISTS trg_requests_status_guard_ins ON public.requests;
CREATE TRIGGER trg_requests_status_guard_ins
  AFTER INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.requests_status_guard();

DROP TRIGGER IF EXISTS trg_requests_status_guard_upd ON public.requests;
CREATE TRIGGER trg_requests_status_guard_upd
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.requests_status_guard();

DROP TRIGGER IF EXISTS trg_requests_touch ON public.requests;
CREATE TRIGGER trg_requests_touch
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS requests_select_club ON public.requests;
CREATE POLICY requests_select_club ON public.requests
  FOR SELECT TO authenticated
  USING (
    has_club_access(auth.uid(), club_id)
    AND (
      requester_id = auth.uid()
      OR is_super_admin(auth.uid())
      OR has_module_editor_any(auth.uid(), 'solicitudes')
      OR has_module_approver_any(auth.uid(), 'solicitudes')
      OR has_module_approver_any(auth.uid(), public.request_approver_module(type))
    )
  );

DROP POLICY IF EXISTS requests_insert_self ON public.requests;
CREATE POLICY requests_insert_self ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND has_club_access(auth.uid(), club_id));

DROP POLICY IF EXISTS requests_update ON public.requests;
CREATE POLICY requests_update ON public.requests
  FOR UPDATE TO authenticated
  USING (
    has_club_access(auth.uid(), club_id)
    AND (
      (requester_id = auth.uid() AND status = 'pendiente')
      OR is_super_admin(auth.uid())
      OR has_module_editor_any(auth.uid(), 'solicitudes')
      OR public.can_approve_request_type(auth.uid(), type, requester_id)
    )
  )
  WITH CHECK (
    has_club_access(auth.uid(), club_id)
    AND NOT (requester_id = auth.uid() AND status IN ('aprobada', 'rechazada'))
  );

DROP POLICY IF EXISTS requests_delete ON public.requests;
CREATE POLICY requests_delete ON public.requests
  FOR DELETE TO authenticated
  USING (
    has_club_access(auth.uid(), club_id)
    AND (
      (requester_id = auth.uid() AND status IN ('pendiente', 'cancelada', 'rechazada'))
      OR has_module_editor_any(auth.uid(), 'solicitudes')
      OR is_super_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS req_comments_select ON public.request_comments;
CREATE POLICY req_comments_select ON public.request_comments
  FOR SELECT TO authenticated
  USING (public.can_view_request(auth.uid(), request_id));

DROP POLICY IF EXISTS req_comments_insert ON public.request_comments;
CREATE POLICY req_comments_insert ON public.request_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_view_request(auth.uid(), request_id));

CREATE INDEX IF NOT EXISTS idx_requests_club_status ON public.requests(club_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_type ON public.requests(club_id, type);

INSERT INTO public.role_permissions (role_id, module_key, access_level)
SELECT r.id, 'compras_facturas',
       CASE WHEN COALESCE(r.base_role, lower(r.name)) = 'admin' THEN 'editor'::public.access_level
            ELSE 'none'::public.access_level END
FROM public.roles r
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.module_key = 'compras_facturas'
);