ALTER TABLE public.trip_boarding_passes
  ADD COLUMN IF NOT EXISTS boarding_group text,
  ADD COLUMN IF NOT EXISTS terminal text;