
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS paternal_last_name text,
  ADD COLUMN IF NOT EXISTS maternal_last_name text,
  ADD COLUMN IF NOT EXISTS birthplace text,
  ADD COLUMN IF NOT EXISTS name_completed boolean NOT NULL DEFAULT false;
