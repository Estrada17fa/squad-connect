-- 1. Tabla de aprobaciones por rol
CREATE TABLE public.role_request_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  request_type public.request_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, request_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_request_approvals TO authenticated;
GRANT ALL ON public.role_request_approvals TO service_role;

ALTER TABLE public.role_request_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view role request approvals"
ON public.role_request_approvals FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.roles r
  WHERE r.id = role_id AND public.has_club_access(auth.uid(), r.club_id)
));

CREATE POLICY "User editors manage role request approvals"
ON public.role_request_approvals FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.club_id = public.get_user_club_id(auth.uid()))
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.club_id = public.get_user_club_id(auth.uid()))
  )
);

-- 2. Overrides individuales
CREATE TYPE public.approver_override_mode AS ENUM ('grant', 'revoke');

CREATE TABLE public.request_type_user_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  request_type public.request_type NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode public.approver_override_mode NOT NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, request_type, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_type_user_overrides TO authenticated;
GRANT ALL ON public.request_type_user_overrides TO service_role;

ALTER TABLE public.request_type_user_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or managed request type overrides"
ON public.request_type_user_overrides FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR (public.has_module_access(auth.uid(), 'usuarios') AND club_id = public.get_user_club_id(auth.uid()))
);

CREATE POLICY "User editors manage request type overrides"
ON public.request_type_user_overrides FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (public.has_module_editor_any(auth.uid(), 'usuarios') AND club_id = public.get_user_club_id(auth.uid()))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (public.has_module_editor_any(auth.uid(), 'usuarios') AND club_id = public.get_user_club_id(auth.uid()))
);

CREATE TRIGGER set_request_type_user_overrides_updated_at
BEFORE UPDATE ON public.request_type_user_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Semilla desde la configuración actual (módulo con nivel 'approver')
INSERT INTO public.role_request_approvals (role_id, request_type)
SELECT DISTINCT rp.role_id, t.request_type
FROM public.role_permissions rp
CROSS JOIN (
  SELECT unnest(enum_range(NULL::public.request_type)) AS request_type
) t
WHERE rp.access_level = 'approver'
  AND rp.module_key = public.request_approver_module(t.request_type)
ON CONFLICT DO NOTHING;

-- 4. Nueva regla de aprobación
CREATE OR REPLACE FUNCTION public.can_approve_request_type(_user_id uuid, _type public.request_type, _requester_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_club uuid;
  v_mode public.approver_override_mode;
BEGIN
  IF _user_id IS NULL OR _user_id = _requester_id THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  v_club := public.get_user_club_id(_user_id);
  IF v_club IS NULL THEN
    RETURN false;
  END IF;

  SELECT o.mode INTO v_mode
  FROM public.request_type_user_overrides o
  WHERE o.user_id = _user_id AND o.club_id = v_club AND o.request_type = _type
  LIMIT 1;

  IF v_mode = 'revoke' THEN
    RETURN false;
  ELSIF v_mode = 'grant' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    JOIN public.role_request_approvals rra ON rra.role_id = r.id
    WHERE tm.user_id = _user_id
      AND r.club_id = v_club
      AND rra.request_type = _type
  );
END;
$$;

-- 5. Lista efectiva de aprobadores
CREATE OR REPLACE FUNCTION public.request_type_approver_ids(_club_id uuid, _type public.request_type)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT u.user_id FROM (
    SELECT tm.user_id
    FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    JOIN public.role_request_approvals rra ON rra.role_id = r.id
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE r.club_id = _club_id
      AND p.club_id = _club_id
      AND rra.request_type = _type
      AND NOT EXISTS (
        SELECT 1 FROM public.request_type_user_overrides o
        WHERE o.user_id = tm.user_id AND o.club_id = _club_id
          AND o.request_type = _type AND o.mode = 'revoke'
      )
    UNION
    SELECT o.user_id
    FROM public.request_type_user_overrides o
    WHERE o.club_id = _club_id AND o.request_type = _type AND o.mode = 'grant'
  ) u;
$$;

REVOKE EXECUTE ON FUNCTION public.request_type_approver_ids(uuid, public.request_type) FROM anon;