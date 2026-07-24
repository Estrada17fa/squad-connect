
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.access_level AS ENUM ('none', 'read', 'editor', 'approver');

-- =========================================
-- TABLES
-- =========================================
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  league_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  access_level public.access_level NOT NULL DEFAULT 'none',
  UNIQUE (role_id, module_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE, -- NULL = club-wide
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_memberships TO authenticated;
GRANT ALL ON public.team_memberships TO service_role;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- =========================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_user_club_id(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT club_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.has_team_access(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = _user_id AND (team_id IS NULL OR team_id = _team_id)
  )
$$;

-- =========================================
-- RLS POLICIES
-- =========================================

-- clubs: users can see their own club; super admins see all
CREATE POLICY "clubs_select_own" ON public.clubs FOR SELECT TO authenticated
  USING (id = public.get_user_club_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "clubs_all_super_admin" ON public.clubs FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- teams: within own club, plus super admin
CREATE POLICY "teams_select_own_club" ON public.teams FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "teams_write_own_club" ON public.teams FOR ALL TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()) OR public.is_super_admin(auth.uid()));

-- profiles: user sees own profile, plus profiles in same club; super admin sees all
CREATE POLICY "profiles_select_same_club" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR (club_id IS NOT NULL AND club_id = public.get_user_club_id(auth.uid()))
  );
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "profiles_insert_super" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "profiles_delete_super" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- roles: scoped to own club
CREATE POLICY "roles_select_own_club" ON public.roles FOR SELECT TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "roles_write_own_club" ON public.roles FOR ALL TO authenticated
  USING (club_id = public.get_user_club_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (club_id = public.get_user_club_id(auth.uid()) OR public.is_super_admin(auth.uid()));

-- role_permissions: via parent role's club
CREATE POLICY "role_perms_select_own_club" ON public.role_permissions FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.club_id = public.get_user_club_id(auth.uid())
    )
  );
CREATE POLICY "role_perms_write_own_club" ON public.role_permissions FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.club_id = public.get_user_club_id(auth.uid())
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.club_id = public.get_user_club_id(auth.uid())
    )
  );

-- team_memberships: within own club
CREATE POLICY "memberships_select_own_club" ON public.team_memberships FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = team_memberships.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  );
CREATE POLICY "memberships_write_own_club" ON public.team_memberships FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = team_memberships.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = team_memberships.user_id
        AND p.club_id = public.get_user_club_id(auth.uid())
    )
  );

-- super_admins: only super admins manage; each user can see their own row
CREATE POLICY "super_admins_select" ON public.super_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "super_admins_write" ON public.super_admins FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================================
-- SEED: Los Cabos United
-- =========================================
DO $$
DECLARE
  v_club_id UUID;
  v_admin_role_id UUID;
  v_role_id UUID;
  v_module TEXT;
  v_role TEXT;
  v_modules TEXT[] := ARRAY[
    'plantel','calendario','viajes','inventario','coordinacion_interna',
    'solicitudes','documentos','usuarios','comunicados','multimedia',
    'torneo','tacticas','salud','desarrollo','nutricion','uniformes'
  ];
  v_default_roles TEXT[] := ARRAY['Admin','Técnico','Médico','Utilero','Jugador'];
BEGIN
  INSERT INTO public.clubs (name, primary_color, secondary_color, league_name)
  VALUES ('Los Cabos United', 'hsl(150, 100%, 50%)', 'hsl(0, 0%, 5%)', 'Liga MX')
  RETURNING id INTO v_club_id;

  INSERT INTO public.teams (club_id, name, category) VALUES
    (v_club_id, 'Primera División', 'Primera División'),
    (v_club_id, 'Sub-20', 'Sub-20');

  -- Create default roles
  FOREACH v_role IN ARRAY v_default_roles LOOP
    INSERT INTO public.roles (club_id, name, is_system_default)
    VALUES (v_club_id, v_role, true)
    RETURNING id INTO v_role_id;

    IF v_role = 'Admin' THEN
      v_admin_role_id := v_role_id;
      -- Admin: editor on every module
      FOREACH v_module IN ARRAY v_modules LOOP
        INSERT INTO public.role_permissions (role_id, module_key, access_level)
        VALUES (v_role_id, v_module, 'editor');
      END LOOP;
    ELSE
      -- Other roles: no access by default; can be configured later
      FOREACH v_module IN ARRAY v_modules LOOP
        INSERT INTO public.role_permissions (role_id, module_key, access_level)
        VALUES (v_role_id, v_module, 'none');
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- =========================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- First user becomes super_admin + Admin of Los Cabos United
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_first BOOLEAN;
  v_club_id UUID;
  v_admin_role_id UUID;
BEGIN
  v_is_first := NOT EXISTS (SELECT 1 FROM public.super_admins);

  IF v_is_first THEN
    SELECT id INTO v_club_id FROM public.clubs WHERE name = 'Los Cabos United' LIMIT 1;
    SELECT r.id INTO v_admin_role_id
      FROM public.roles r
      WHERE r.club_id = v_club_id AND r.name = 'Admin' AND r.is_system_default
      LIMIT 1;

    INSERT INTO public.profiles (id, club_id, full_name, email)
    VALUES (
      NEW.id,
      v_club_id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email
    );

    INSERT INTO public.super_admins (user_id) VALUES (NEW.id);

    IF v_admin_role_id IS NOT NULL THEN
      INSERT INTO public.team_memberships (user_id, team_id, role_id)
      VALUES (NEW.id, NULL, v_admin_role_id);
    END IF;
  ELSE
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
