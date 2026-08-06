-- 1. Columnas nuevas
ALTER TABLE public.inventory_loans ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_loans_trip ON public.inventory_loans(trip_id);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_trip ON public.documents(trip_id);

ALTER TABLE public.trip_flights ADD COLUMN IF NOT EXISTS baggage_instructions text;

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_calendar_events_trip ON public.calendar_events(trip_id);

-- 2. Tabla de responsables de documentar maletas
CREATE TABLE IF NOT EXISTS public.trip_flight_baggage_handlers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES public.trip_flights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pieces integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flight_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_flight_baggage_handlers TO authenticated;
GRANT ALL ON public.trip_flight_baggage_handlers TO service_role;

ALTER TABLE public.trip_flight_baggage_handlers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tfbh_select" ON public.trip_flight_baggage_handlers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_view_trip(auth.uid(), f.trip_id)));

CREATE POLICY "tfbh_insert" ON public.trip_flight_baggage_handlers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)));

CREATE POLICY "tfbh_update" ON public.trip_flight_baggage_handlers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)));

CREATE POLICY "tfbh_delete" ON public.trip_flight_baggage_handlers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)));

-- 3. Acceso a préstamos y documentos del viaje
CREATE POLICY "inventory_loans_trip_select" ON public.inventory_loans FOR SELECT TO authenticated
USING (trip_id IS NOT NULL AND public.can_view_trip(auth.uid(), trip_id));

CREATE POLICY "inventory_loans_trip_write" ON public.inventory_loans FOR ALL TO authenticated
USING (trip_id IS NOT NULL AND public.can_edit_trip(auth.uid(), trip_id))
WITH CHECK (trip_id IS NOT NULL AND public.can_edit_trip(auth.uid(), trip_id));

CREATE POLICY "documents_trip_select" ON public.documents FOR SELECT TO authenticated
USING (trip_id IS NOT NULL AND public.can_view_trip(auth.uid(), trip_id));

CREATE POLICY "documents_trip_write" ON public.documents FOR ALL TO authenticated
USING (trip_id IS NOT NULL AND public.can_edit_trip(auth.uid(), trip_id))
WITH CHECK (trip_id IS NOT NULL AND public.can_edit_trip(auth.uid(), trip_id));

-- 4. Evento espejo del viaje en el calendario
CREATE OR REPLACE FUNCTION public.sync_trip_to_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.calendar_events
      (club_id, team_id, event_type, title, starts_at, ends_at, location, description, created_by, trip_id)
    VALUES
      (NEW.club_id, NEW.team_id, 'viaje', NEW.title, NEW.departure_at, COALESCE(NEW.return_at, NEW.departure_at),
       NEW.destination, NEW.notes, NEW.created_by, NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.calendar_events
      SET title = NEW.title,
          team_id = NEW.team_id,
          starts_at = NEW.departure_at,
          ends_at = COALESCE(NEW.return_at, NEW.departure_at),
          location = NEW.destination,
          description = NEW.notes
    WHERE trip_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trip_to_calendar ON public.trips;
CREATE TRIGGER trg_sync_trip_to_calendar
AFTER INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.sync_trip_to_calendar();

-- Espejo para los viajes ya existentes
INSERT INTO public.calendar_events
  (club_id, team_id, event_type, title, starts_at, ends_at, location, description, created_by, trip_id)
SELECT t.club_id, t.team_id, 'viaje', t.title, t.departure_at, COALESCE(t.return_at, t.departure_at),
       t.destination, t.notes, t.created_by, t.id
FROM public.trips t
WHERE NOT EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.trip_id = t.id);

-- 5. Notificaciones
CREATE OR REPLACE FUNCTION public.notify_boarding_pass()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE t RECORD;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT tr.id, tr.club_id, tr.title INTO t
  FROM public.trip_flights f JOIN public.trips tr ON tr.id = f.trip_id
  WHERE f.id = NEW.flight_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_pase_abordar',
    'Tu pase de abordar está listo',
    t.title || COALESCE(' · Asiento ' || NEW.seat, ''),
    'viajes', t.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_boarding_pass ON public.trip_boarding_passes;
CREATE TRIGGER trg_notify_boarding_pass
AFTER INSERT ON public.trip_boarding_passes
FOR EACH ROW EXECUTE FUNCTION public.notify_boarding_pass();

CREATE OR REPLACE FUNCTION public.notify_flight_passenger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE t RECORD; f RECORD;
BEGIN
  SELECT fl.flight_code, fl.departs_at, fl.origin, fl.destination, fl.trip_id INTO f
  FROM public.trip_flights fl WHERE fl.id = NEW.flight_id;
  IF f IS NULL THEN RETURN NEW; END IF;
  SELECT tr.id, tr.club_id, tr.title INTO t FROM public.trips tr WHERE tr.id = f.trip_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_vuelo_asignado',
    'Vuelo asignado: ' || f.flight_code,
    f.origin || ' → ' || f.destination || ' · ' ||
      to_char(f.departs_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'viajes', t.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_flight_passenger ON public.trip_flight_passengers;
CREATE TRIGGER trg_notify_flight_passenger
AFTER INSERT ON public.trip_flight_passengers
FOR EACH ROW EXECUTE FUNCTION public.notify_flight_passenger();

CREATE OR REPLACE FUNCTION public.notify_transport_passenger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE t RECORD; tp RECORD;
BEGIN
  SELECT tt.label, tt.departs_at, tt.pickup_location, tt.destination, tt.trip_id INTO tp
  FROM public.trip_transports tt WHERE tt.id = NEW.transport_id;
  IF tp IS NULL THEN RETURN NEW; END IF;
  SELECT tr.id, tr.club_id, tr.title INTO t FROM public.trips tr WHERE tr.id = tp.trip_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_transporte_asignado',
    'Transporte asignado' || COALESCE(': ' || tp.label, ''),
    tp.pickup_location || ' → ' || tp.destination || ' · ' ||
      to_char(tp.departs_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'viajes', t.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_transport_passenger ON public.trip_transport_passengers;
CREATE TRIGGER trg_notify_transport_passenger
AFTER INSERT ON public.trip_transport_passengers
FOR EACH ROW EXECUTE FUNCTION public.notify_transport_passenger();

CREATE OR REPLACE FUNCTION public.notify_baggage_handler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE t RECORD; f RECORD;
BEGIN
  SELECT fl.flight_code, fl.trip_id INTO f FROM public.trip_flights fl WHERE fl.id = NEW.flight_id;
  IF f IS NULL THEN RETURN NEW; END IF;
  SELECT tr.id, tr.club_id INTO t FROM public.trips tr WHERE tr.id = f.trip_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_documenta_maletas',
    'Tú documentas las maletas del equipo',
    'Vuelo ' || f.flight_code || COALESCE(' · ' || NEW.pieces || ' piezas', ''),
    'viajes', t.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_baggage_handler ON public.trip_flight_baggage_handlers;
CREATE TRIGGER trg_notify_baggage_handler
AFTER INSERT ON public.trip_flight_baggage_handlers
FOR EACH ROW EXECUTE FUNCTION public.notify_baggage_handler();