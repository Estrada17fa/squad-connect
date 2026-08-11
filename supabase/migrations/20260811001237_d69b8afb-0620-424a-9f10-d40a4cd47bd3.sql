ALTER TABLE public.trip_flight_baggage_handlers
  ADD COLUMN IF NOT EXISTS checked_bag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carry_on boolean NOT NULL DEFAULT false;

UPDATE public.trip_flight_baggage_handlers SET checked_bag = true WHERE checked_bag = false AND carry_on = false;

CREATE UNIQUE INDEX IF NOT EXISTS trip_flight_baggage_handlers_flight_user_key
  ON public.trip_flight_baggage_handlers (flight_id, user_id);

DROP TABLE IF EXISTS public.trip_traveler_luggage;