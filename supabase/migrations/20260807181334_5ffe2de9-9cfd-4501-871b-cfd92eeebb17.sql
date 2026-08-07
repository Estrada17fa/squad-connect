ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS meeting_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.trip_hotels
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;