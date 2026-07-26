
-- 1. Fix cross-club leak in helper functions: club-wide membership (team_id NULL)
--    must only grant access when the queried team belongs to the user's own club.

CREATE OR REPLACE FUNCTION public.has_team_access(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    LEFT JOIN public.teams t ON t.id = _team_id
    WHERE tm.user_id = _user_id
      AND (
        tm.team_id = _team_id
        OR (
          tm.team_id IS NULL
          AND t.club_id = public.get_user_club_id(_user_id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_module_editor(_user_id uuid, _team_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    LEFT JOIN public.teams t ON t.id = _team_id
    WHERE tm.user_id = _user_id
      AND rp.module_key = _module_key
      AND rp.access_level IN ('editor','approver')
      AND (
        tm.team_id = _team_id
        OR (
          tm.team_id IS NULL
          AND t.club_id = public.get_user_club_id(_user_id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_team_scope(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
  OR EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    LEFT JOIN public.teams t ON t.id = _team_id
    WHERE tm.user_id = _user_id
      AND (
        tm.team_id = _team_id
        OR (
          tm.team_id IS NULL
          AND r.name = 'Admin'
          AND t.club_id = public.get_user_club_id(_user_id)
        )
      )
  )
$$;

-- 2. team_memberships: split write policy — only super admins or 'usuarios' editors
--    of the SAME club as the target user can insert/update/delete.

DROP POLICY IF EXISTS memberships_write_own_club ON public.team_memberships;

CREATE POLICY memberships_insert_admins ON public.team_memberships
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = team_memberships.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  )
);

CREATE POLICY memberships_update_admins ON public.team_memberships
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = team_memberships.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = team_memberships.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  )
);

CREATE POLICY memberships_delete_admins ON public.team_memberships
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = team_memberships.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  )
);

-- 3. user_permission_overrides: also require same-club target user for writes.
DROP POLICY IF EXISTS overrides_write_admins ON public.user_permission_overrides;

CREATE POLICY overrides_write_admins ON public.user_permission_overrides
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_permission_overrides.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_permission_overrides.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  )
);

-- (roles / role_permissions write policies already require has_module_editor_any('usuarios')
--  scoped to the caller's club — left as-is.)

-- 4. Audit table + trigger for team_memberships changes.
CREATE TABLE public.membership_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid,
  actor_id uuid,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  target_user_id uuid NOT NULL,
  role_id uuid,
  team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.membership_audit_log TO authenticated;
GRANT ALL ON public.membership_audit_log TO service_role;

ALTER TABLE public.membership_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_select_admins ON public.membership_audit_log
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND club_id = public.get_user_club_id(auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.log_team_membership_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid;
  v_role uuid;
  v_team uuid;
  v_club uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target := OLD.user_id;
    v_role := OLD.role_id;
    v_team := OLD.team_id;
  ELSE
    v_target := NEW.user_id;
    v_role := NEW.role_id;
    v_team := NEW.team_id;
  END IF;

  SELECT club_id INTO v_club FROM public.profiles WHERE id = v_target;

  INSERT INTO public.membership_audit_log
    (club_id, actor_id, action, target_user_id, role_id, team_id)
  VALUES
    (v_club, auth.uid(), lower(TG_OP), v_target, v_role, v_team);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_team_memberships_audit ON public.team_memberships;
CREATE TRIGGER trg_team_memberships_audit
AFTER INSERT OR UPDATE OR DELETE ON public.team_memberships
FOR EACH ROW EXECUTE FUNCTION public.log_team_membership_change();
