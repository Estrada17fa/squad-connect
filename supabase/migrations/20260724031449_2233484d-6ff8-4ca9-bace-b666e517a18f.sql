
CREATE TYPE public.event_type AS ENUM ('partido','entrenamiento','viaje','junta','evento_especial');
CREATE TYPE public.availability_status AS ENUM ('apto','lesionado','en_duda');

CREATE OR REPLACE FUNCTION public.has_module_editor(_user_id uuid, _team_id uuid, _module_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    WHERE tm.user_id = _user_id
      AND (tm.team_id IS NULL OR tm.team_id = _team_id)
      AND rp.module_key = _module_key
      AND rp.access_level IN ('editor','approver')
  )
$$;

-- calendar_events
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type public.event_type NOT NULL,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  description text,
  details jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calendar_events_team_starts_idx ON public.calendar_events(team_id, starts_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (public.has_team_access(auth.uid(), team_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "calendar_events_insert" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_editor(auth.uid(), team_id, 'calendario') OR public.is_super_admin(auth.uid()));
CREATE POLICY "calendar_events_update" ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (public.has_module_editor(auth.uid(), team_id, 'calendario') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_module_editor(auth.uid(), team_id, 'calendario') OR public.is_super_admin(auth.uid()));
CREATE POLICY "calendar_events_delete" ON public.calendar_events
  FOR DELETE TO authenticated
  USING (public.has_module_editor(auth.uid(), team_id, 'calendario') OR public.is_super_admin(auth.uid()));

-- event_attendees
CREATE TABLE public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX event_attendees_event_idx ON public.event_attendees(event_id);
CREATE INDEX event_attendees_user_idx ON public.event_attendees(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendees TO authenticated;
GRANT ALL ON public.event_attendees TO service_role;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_attendees_select" ON public.event_attendees
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calendar_events e
                  WHERE e.id = event_id
                    AND (public.has_team_access(auth.uid(), e.team_id) OR public.is_super_admin(auth.uid()))));
CREATE POLICY "event_attendees_insert" ON public.event_attendees
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.calendar_events e
                       WHERE e.id = event_id
                         AND (public.has_module_editor(auth.uid(), e.team_id, 'calendario') OR public.is_super_admin(auth.uid()))));
CREATE POLICY "event_attendees_delete" ON public.event_attendees
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calendar_events e
                  WHERE e.id = event_id
                    AND (public.has_module_editor(auth.uid(), e.team_id, 'calendario') OR public.is_super_admin(auth.uid()))));

-- player_profiles
CREATE TABLE public.player_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  position text,
  jersey_number int,
  birthdate date,
  height_cm int,
  weight_kg int,
  availability_status public.availability_status NOT NULL DEFAULT 'apto',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id)
);
CREATE INDEX player_profiles_team_idx ON public.player_profiles(team_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_profiles TO authenticated;
GRANT ALL ON public.player_profiles TO service_role;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_profiles_select" ON public.player_profiles
  FOR SELECT TO authenticated
  USING (public.has_team_access(auth.uid(), team_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "player_profiles_insert" ON public.player_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_editor(auth.uid(), team_id, 'plantel') OR public.is_super_admin(auth.uid()));
CREATE POLICY "player_profiles_update" ON public.player_profiles
  FOR UPDATE TO authenticated
  USING (public.has_module_editor(auth.uid(), team_id, 'plantel') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_module_editor(auth.uid(), team_id, 'plantel') OR public.is_super_admin(auth.uid()));
CREATE POLICY "player_profiles_delete" ON public.player_profiles
  FOR DELETE TO authenticated
  USING (public.has_module_editor(auth.uid(), team_id, 'plantel') OR public.is_super_admin(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_calendar_events_updated
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_player_profiles_updated
  BEFORE UPDATE ON public.player_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.event_attendees REPLICA IDENTITY FULL;
ALTER TABLE public.player_profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_profiles;
