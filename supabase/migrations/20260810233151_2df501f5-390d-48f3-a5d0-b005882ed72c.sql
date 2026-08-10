-- Equipaje por persona
CREATE TABLE public.trip_traveler_luggage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  checked_bag boolean NOT NULL DEFAULT false,
  carry_on boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_traveler_luggage TO authenticated;
GRANT ALL ON public.trip_traveler_luggage TO service_role;

ALTER TABLE public.trip_traveler_luggage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view trip luggage" ON public.trip_traveler_luggage
  FOR SELECT TO authenticated
  USING (public.can_view_trip_new(auth.uid(), trip_id));

CREATE POLICY "insert trip luggage" ON public.trip_traveler_luggage
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));

CREATE POLICY "update trip luggage" ON public.trip_traveler_luggage
  FOR UPDATE TO authenticated
  USING (public.can_edit_trip_new(auth.uid(), trip_id))
  WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));

CREATE POLICY "delete trip luggage" ON public.trip_traveler_luggage
  FOR DELETE TO authenticated
  USING (public.can_edit_trip_new(auth.uid(), trip_id));

CREATE TRIGGER trip_traveler_luggage_set_updated_at
  BEFORE UPDATE ON public.trip_traveler_luggage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.trip_traveler_luggage
  ADD CONSTRAINT trip_traveler_luggage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_traveler_luggage;

-- Punto de recogida con ubicación del catálogo
ALTER TABLE public.trip_transports
  ADD COLUMN pickup_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;