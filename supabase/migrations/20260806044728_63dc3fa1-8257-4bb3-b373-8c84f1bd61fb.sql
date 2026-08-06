-- Helpers
CREATE OR REPLACE FUNCTION public.can_view_trip(_user_id uuid, _trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = _trip_id
      AND public.has_club_access(_user_id, t.club_id)
      AND public.has_team_scope(_user_id, t.team_id)
      AND (public.is_super_admin(_user_id) OR public.has_module_access(_user_id, 'viajes'))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_trip(_user_id uuid, _trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = _trip_id
      AND public.has_club_access(_user_id, t.club_id)
      AND (public.is_super_admin(_user_id) OR public.has_module_editor(_user_id, t.team_id, 'viajes'))
  )
$$;

-- Enums
CREATE TYPE public.trip_leg AS ENUM ('ida', 'regreso');
CREATE TYPE public.trip_transport_type AS ENUM ('bus', 'van', 'taxi', 'privado', 'otro');
CREATE TYPE public.trip_meal_type AS ENUM ('desayuno', 'comida', 'cena', 'snack');

-- ============ VUELOS ============
CREATE TABLE public.trip_flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  leg public.trip_leg NOT NULL DEFAULT 'ida',
  flight_code text NOT NULL,
  airline text,
  departs_at timestamptz NOT NULL,
  arrives_at timestamptz,
  origin text NOT NULL,
  destination text NOT NULL,
  gate text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_flights_trip ON public.trip_flights(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_flights TO authenticated;
GRANT ALL ON public.trip_flights TO service_role;
ALTER TABLE public.trip_flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_flights_select ON public.trip_flights FOR SELECT TO authenticated USING (public.can_view_trip(auth.uid(), trip_id));
CREATE POLICY trip_flights_insert ON public.trip_flights FOR INSERT TO authenticated WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_flights_update ON public.trip_flights FOR UPDATE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id)) WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_flights_delete ON public.trip_flights FOR DELETE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id));
CREATE TRIGGER trg_trip_flights_updated BEFORE UPDATE ON public.trip_flights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_flight_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES public.trip_flights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flight_id, user_id)
);
CREATE INDEX idx_trip_flight_passengers_flight ON public.trip_flight_passengers(flight_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_flight_passengers TO authenticated;
GRANT ALL ON public.trip_flight_passengers TO service_role;
ALTER TABLE public.trip_flight_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tfp_select ON public.trip_flight_passengers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_view_trip(auth.uid(), f.trip_id)));
CREATE POLICY tfp_insert ON public.trip_flight_passengers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id))
    AND EXISTS (SELECT 1 FROM public.trip_flights f JOIN public.trip_travelers tt ON tt.trip_id = f.trip_id WHERE f.id = flight_id AND tt.user_id = trip_flight_passengers.user_id));
CREATE POLICY tfp_delete ON public.trip_flight_passengers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)));

CREATE TABLE public.trip_boarding_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES public.trip_flights(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  seat text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_boarding_passes_flight ON public.trip_boarding_passes(flight_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_boarding_passes TO authenticated;
GRANT ALL ON public.trip_boarding_passes TO service_role;
ALTER TABLE public.trip_boarding_passes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tbp_select ON public.trip_boarding_passes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_view_trip(auth.uid(), f.trip_id)));
CREATE POLICY tbp_insert ON public.trip_boarding_passes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)));
CREATE POLICY tbp_update ON public.trip_boarding_passes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)));
CREATE POLICY tbp_delete ON public.trip_boarding_passes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_flights f WHERE f.id = flight_id AND public.can_edit_trip(auth.uid(), f.trip_id)));
CREATE TRIGGER trg_trip_boarding_passes_updated BEFORE UPDATE ON public.trip_boarding_passes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TRANSPORTE ============
CREATE TABLE public.trip_transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  leg public.trip_leg NOT NULL DEFAULT 'ida',
  transport_type public.trip_transport_type NOT NULL DEFAULT 'bus',
  label text,
  departs_at timestamptz NOT NULL,
  pickup_location text NOT NULL,
  destination text NOT NULL,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_transports_trip ON public.trip_transports(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_transports TO authenticated;
GRANT ALL ON public.trip_transports TO service_role;
ALTER TABLE public.trip_transports ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_transports_select ON public.trip_transports FOR SELECT TO authenticated USING (public.can_view_trip(auth.uid(), trip_id));
CREATE POLICY trip_transports_insert ON public.trip_transports FOR INSERT TO authenticated WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_transports_update ON public.trip_transports FOR UPDATE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id)) WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_transports_delete ON public.trip_transports FOR DELETE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id));
CREATE TRIGGER trg_trip_transports_updated BEFORE UPDATE ON public.trip_transports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_transport_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES public.trip_transports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transport_id, user_id)
);
CREATE INDEX idx_trip_transport_passengers_transport ON public.trip_transport_passengers(transport_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_transport_passengers TO authenticated;
GRANT ALL ON public.trip_transport_passengers TO service_role;
ALTER TABLE public.trip_transport_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY ttp_select ON public.trip_transport_passengers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_transports t WHERE t.id = transport_id AND public.can_view_trip(auth.uid(), t.trip_id)));
CREATE POLICY ttp_insert ON public.trip_transport_passengers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_transports t WHERE t.id = transport_id AND public.can_edit_trip(auth.uid(), t.trip_id))
    AND EXISTS (SELECT 1 FROM public.trip_transports t JOIN public.trip_travelers tt ON tt.trip_id = t.trip_id WHERE t.id = transport_id AND tt.user_id = trip_transport_passengers.user_id));
CREATE POLICY ttp_delete ON public.trip_transport_passengers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_transports t WHERE t.id = transport_id AND public.can_edit_trip(auth.uid(), t.trip_id)));

-- ============ HOTEL ============
CREATE TABLE public.trip_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  check_in_at timestamptz NOT NULL,
  check_out_at timestamptz,
  phone text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_hotels_trip ON public.trip_hotels(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_hotels TO authenticated;
GRANT ALL ON public.trip_hotels TO service_role;
ALTER TABLE public.trip_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_hotels_select ON public.trip_hotels FOR SELECT TO authenticated USING (public.can_view_trip(auth.uid(), trip_id));
CREATE POLICY trip_hotels_insert ON public.trip_hotels FOR INSERT TO authenticated WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_hotels_update ON public.trip_hotels FOR UPDATE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id)) WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_hotels_delete ON public.trip_hotels FOR DELETE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id));
CREATE TRIGGER trg_trip_hotels_updated BEFORE UPDATE ON public.trip_hotels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.trip_hotels(id) ON DELETE CASCADE,
  room_label text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_rooms_hotel ON public.trip_rooms(hotel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_rooms TO authenticated;
GRANT ALL ON public.trip_rooms TO service_role;
ALTER TABLE public.trip_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_rooms_select ON public.trip_rooms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_hotels h WHERE h.id = hotel_id AND public.can_view_trip(auth.uid(), h.trip_id)));
CREATE POLICY trip_rooms_insert ON public.trip_rooms FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_hotels h WHERE h.id = hotel_id AND public.can_edit_trip(auth.uid(), h.trip_id)));
CREATE POLICY trip_rooms_update ON public.trip_rooms FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_hotels h WHERE h.id = hotel_id AND public.can_edit_trip(auth.uid(), h.trip_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_hotels h WHERE h.id = hotel_id AND public.can_edit_trip(auth.uid(), h.trip_id)));
CREATE POLICY trip_rooms_delete ON public.trip_rooms FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_hotels h WHERE h.id = hotel_id AND public.can_edit_trip(auth.uid(), h.trip_id)));
CREATE TRIGGER trg_trip_rooms_updated BEFORE UPDATE ON public.trip_rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_room_occupants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.trip_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
CREATE INDEX idx_trip_room_occupants_room ON public.trip_room_occupants(room_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_room_occupants TO authenticated;
GRANT ALL ON public.trip_room_occupants TO service_role;
ALTER TABLE public.trip_room_occupants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tro_select ON public.trip_room_occupants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_rooms r JOIN public.trip_hotels h ON h.id = r.hotel_id WHERE r.id = room_id AND public.can_view_trip(auth.uid(), h.trip_id)));
CREATE POLICY tro_insert ON public.trip_room_occupants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_rooms r JOIN public.trip_hotels h ON h.id = r.hotel_id WHERE r.id = room_id AND public.can_edit_trip(auth.uid(), h.trip_id))
    AND EXISTS (SELECT 1 FROM public.trip_rooms r JOIN public.trip_hotels h ON h.id = r.hotel_id JOIN public.trip_travelers tt ON tt.trip_id = h.trip_id WHERE r.id = room_id AND tt.user_id = trip_room_occupants.user_id));
CREATE POLICY tro_delete ON public.trip_room_occupants FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_rooms r JOIN public.trip_hotels h ON h.id = r.hotel_id WHERE r.id = room_id AND public.can_edit_trip(auth.uid(), h.trip_id)));

-- ============ COMIDAS ============
CREATE TABLE public.trip_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  meal_type public.trip_meal_type NOT NULL DEFAULT 'comida',
  scheduled_at timestamptz NOT NULL,
  location text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_meals_trip ON public.trip_meals(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_meals TO authenticated;
GRANT ALL ON public.trip_meals TO service_role;
ALTER TABLE public.trip_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_meals_select ON public.trip_meals FOR SELECT TO authenticated USING (public.can_view_trip(auth.uid(), trip_id));
CREATE POLICY trip_meals_insert ON public.trip_meals FOR INSERT TO authenticated WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_meals_update ON public.trip_meals FOR UPDATE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id)) WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_meals_delete ON public.trip_meals FOR DELETE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id));
CREATE TRIGGER trg_trip_meals_updated BEFORE UPDATE ON public.trip_meals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EQUIPAJE ============
CREATE TABLE public.trip_luggage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer,
  responsible_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_luggage_trip ON public.trip_luggage(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_luggage TO authenticated;
GRANT ALL ON public.trip_luggage TO service_role;
ALTER TABLE public.trip_luggage ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_luggage_select ON public.trip_luggage FOR SELECT TO authenticated USING (public.can_view_trip(auth.uid(), trip_id));
CREATE POLICY trip_luggage_insert ON public.trip_luggage FOR INSERT TO authenticated WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_luggage_update ON public.trip_luggage FOR UPDATE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id)) WITH CHECK (public.can_edit_trip(auth.uid(), trip_id));
CREATE POLICY trip_luggage_delete ON public.trip_luggage FOR DELETE TO authenticated USING (public.can_edit_trip(auth.uid(), trip_id));
CREATE TRIGGER trg_trip_luggage_updated BEFORE UPDATE ON public.trip_luggage FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_flights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_flight_passengers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_boarding_passes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_transports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_transport_passengers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_hotels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_room_occupants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_meals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_luggage;