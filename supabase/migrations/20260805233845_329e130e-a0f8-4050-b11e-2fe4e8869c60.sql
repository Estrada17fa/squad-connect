CREATE TYPE public.trip_status AS ENUM ('planeacion', 'confirmado', 'en_curso', 'completado');

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  destination text,
  match_event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  departure_at timestamptz NOT NULL,
  return_at timestamptz,
  meeting_point text,
  meeting_at timestamptz,
  status public.trip_status NOT NULL DEFAULT 'planeacion',
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips_select" ON public.trips FOR SELECT TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND public.has_team_scope(auth.uid(), team_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'viajes'))
);

CREATE POLICY "trips_insert" ON public.trips FOR INSERT TO authenticated
WITH CHECK (
  public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor(auth.uid(), team_id, 'viajes'))
);

CREATE POLICY "trips_update" ON public.trips FOR UPDATE TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor(auth.uid(), team_id, 'viajes'))
)
WITH CHECK (
  public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor(auth.uid(), team_id, 'viajes'))
);

CREATE POLICY "trips_delete" ON public.trips FOR DELETE TO authenticated
USING (
  public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor(auth.uid(), team_id, 'viajes'))
);

CREATE INDEX idx_trips_club_team_departure ON public.trips (club_id, team_id, departure_at DESC);

CREATE TRIGGER trg_trips_updated BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_travelers TO authenticated;
GRANT ALL ON public.trip_travelers TO service_role;
ALTER TABLE public.trip_travelers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_travelers_select" ON public.trip_travelers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id));

CREATE POLICY "trip_travelers_insert" ON public.trip_travelers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id
    AND (public.is_super_admin(auth.uid()) OR public.has_module_editor(auth.uid(), t.team_id, 'viajes'))
));

CREATE POLICY "trip_travelers_update" ON public.trip_travelers FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id
    AND (public.is_super_admin(auth.uid()) OR public.has_module_editor(auth.uid(), t.team_id, 'viajes'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id
    AND (public.is_super_admin(auth.uid()) OR public.has_module_editor(auth.uid(), t.team_id, 'viajes'))
));

CREATE POLICY "trip_travelers_delete" ON public.trip_travelers FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = trip_id
    AND (public.is_super_admin(auth.uid()) OR public.has_module_editor(auth.uid(), t.team_id, 'viajes'))
));

CREATE INDEX idx_trip_travelers_trip ON public.trip_travelers (trip_id);
CREATE INDEX idx_trip_travelers_user ON public.trip_travelers (user_id);

CREATE OR REPLACE FUNCTION public.notify_trip_traveler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t RECORD;
BEGIN
  SELECT club_id, title, destination, departure_at, created_by INTO t
  FROM public.trips WHERE id = NEW.trip_id;
  IF t IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id = COALESCE(t.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_convocatoria',
    'Fuiste convocado al viaje a ' || COALESCE(t.destination, t.title),
    'Salida: ' || to_char(t.departure_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'viajes', NEW.trip_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_trip_traveler AFTER INSERT ON public.trip_travelers
FOR EACH ROW EXECUTE FUNCTION public.notify_trip_traveler();

ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_travelers;