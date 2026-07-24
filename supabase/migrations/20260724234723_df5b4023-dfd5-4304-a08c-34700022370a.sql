
-- Helper: club access (super admin OR user's own club)
CREATE OR REPLACE FUNCTION public.has_club_access(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.get_user_club_id(_user_id) = _club_id
$$;

-- Helper: strict team scope. True if user has a membership specifically for that team,
-- OR is club-wide Admin, OR is super admin. A club-wide non-Admin membership does NOT grant.
CREATE OR REPLACE FUNCTION public.has_team_scope(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
  OR EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    WHERE tm.user_id = _user_id
      AND (tm.team_id = _team_id OR (tm.team_id IS NULL AND r.name = 'Admin'))
  )
$$;

-- Tighten player_profiles policies to use has_team_scope
DROP POLICY IF EXISTS player_profiles_select ON public.player_profiles;
DROP POLICY IF EXISTS player_profiles_update ON public.player_profiles;
DROP POLICY IF EXISTS player_profiles_delete ON public.player_profiles;
DROP POLICY IF EXISTS player_profiles_insert ON public.player_profiles;

CREATE POLICY player_profiles_select ON public.player_profiles
  FOR SELECT TO authenticated
  USING (public.has_team_scope(auth.uid(), team_id));

CREATE POLICY player_profiles_insert ON public.player_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (public.has_team_scope(auth.uid(), team_id)
        AND public.has_module_editor(auth.uid(), team_id, 'plantel'))
  );

CREATE POLICY player_profiles_update ON public.player_profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (public.has_team_scope(auth.uid(), team_id)
        AND public.has_module_editor(auth.uid(), team_id, 'plantel'))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (public.has_team_scope(auth.uid(), team_id)
        AND public.has_module_editor(auth.uid(), team_id, 'plantel'))
  );

CREATE POLICY player_profiles_delete ON public.player_profiles
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (public.has_team_scope(auth.uid(), team_id)
        AND public.has_module_editor(auth.uid(), team_id, 'plantel'))
  );

-- club_invitations table
CREATE TABLE IF NOT EXISTS public.club_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_invitations_email ON public.club_invitations (lower(email));
CREATE INDEX IF NOT EXISTS idx_club_invitations_club ON public.club_invitations (club_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_invitations TO authenticated;
GRANT ALL ON public.club_invitations TO service_role;

ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY club_invitations_super_admin_all ON public.club_invitations
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Public token lookup (returns safe fields only)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (
  id uuid,
  club_id uuid,
  club_name text,
  email text,
  role_name text,
  team_name text,
  expires_at timestamptz,
  accepted_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ci.id, ci.club_id, c.name, ci.email, r.name, t.name, ci.expires_at, ci.accepted_at
  FROM public.club_invitations ci
  JOIN public.clubs c ON c.id = ci.club_id
  LEFT JOIN public.roles r ON r.id = ci.role_id
  LEFT JOIN public.teams t ON t.id = ci.team_id
  WHERE ci.token = _token
$$;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- Rewrite handle_new_user to consume invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_first BOOLEAN;
  v_invite RECORD;
  v_seed_club_id UUID;
  v_admin_role_id UUID;
BEGIN
  v_is_first := NOT EXISTS (SELECT 1 FROM public.super_admins);

  SELECT ci.* INTO v_invite
  FROM public.club_invitations ci
  WHERE lower(ci.email) = lower(NEW.email)
    AND ci.accepted_at IS NULL
    AND ci.expires_at > now()
  ORDER BY ci.created_at DESC
  LIMIT 1;

  IF v_is_first THEN
    SELECT id INTO v_seed_club_id FROM public.clubs WHERE name = 'Los Cabos United' LIMIT 1;
    SELECT r.id INTO v_admin_role_id
      FROM public.roles r
      WHERE r.club_id = v_seed_club_id AND r.name = 'Admin' AND r.is_system_default
      LIMIT 1;

    INSERT INTO public.profiles (id, club_id, full_name, email)
    VALUES (NEW.id, v_seed_club_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            NEW.email);
    INSERT INTO public.super_admins (user_id) VALUES (NEW.id);
    IF v_admin_role_id IS NOT NULL THEN
      INSERT INTO public.team_memberships (user_id, team_id, role_id)
      VALUES (NEW.id, NULL, v_admin_role_id);
    END IF;
  ELSIF v_invite.id IS NOT NULL THEN
    INSERT INTO public.profiles (id, club_id, full_name, email)
    VALUES (NEW.id, v_invite.club_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            NEW.email);
    IF v_invite.role_id IS NOT NULL THEN
      INSERT INTO public.team_memberships (user_id, team_id, role_id)
      VALUES (NEW.id, v_invite.team_id, v_invite.role_id);
    END IF;
    UPDATE public.club_invitations SET accepted_at = now() WHERE id = v_invite.id;
  ELSE
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            NEW.email);
  END IF;

  RETURN NEW;
END;
$$;
