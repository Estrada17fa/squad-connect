-- Enums
DO $$ BEGIN
  CREATE TYPE public.member_status AS ENUM ('activo','baja');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.preferred_foot AS ENUM ('derecho','izquierdo','ambos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.player_status AS ENUM ('activo','baja','prestamo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles: ciclo de vida
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.member_status NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid;

-- player_profiles: nuevas columnas
ALTER TABLE public.player_profiles
  ADD COLUMN IF NOT EXISTS secondary_position text,
  ADD COLUMN IF NOT EXISTS preferred_foot public.preferred_foot,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS birthplace text,
  ADD COLUMN IF NOT EXISTS affiliation_number text,
  ADD COLUMN IF NOT EXISTS id_document text,
  ADD COLUMN IF NOT EXISTS joined_at date,
  ADD COLUMN IF NOT EXISTS previous_club text,
  ADD COLUMN IF NOT EXISTS player_status public.player_status NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS shirt_size text,
  ADD COLUMN IF NOT EXISTS pants_size text,
  ADD COLUMN IF NOT EXISTS shoe_size text;

-- Backfill: crear player_profiles faltantes para membresías de rol base jugador
INSERT INTO public.player_profiles (user_id, team_id, position, jersey_number, birthdate)
SELECT DISTINCT ON (tm.user_id, tm.team_id)
  tm.user_id, tm.team_id, p.position, p.jersey_number, p.birthdate
FROM public.team_memberships tm
JOIN public.roles r ON r.id = tm.role_id
JOIN public.profiles p ON p.id = tm.user_id
WHERE lower(r.base_role) = 'jugador'
  AND tm.team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.player_profiles pp
    WHERE pp.user_id = tm.user_id AND pp.team_id = tm.team_id
  );

-- Backfill: copiar datos deportivos/identidad desde profiles a player_profiles existentes
UPDATE public.player_profiles pp
SET position = COALESCE(pp.position, p.position),
    jersey_number = COALESCE(pp.jersey_number, p.jersey_number),
    shirt_size = COALESCE(pp.shirt_size, p.shirt_size),
    pants_size = COALESCE(pp.pants_size, p.pants_size),
    shoe_size = COALESCE(pp.shoe_size, p.shoe_size),
    nationality = COALESCE(pp.nationality, p.nationality),
    birthplace = COALESCE(pp.birthplace, p.birthplace)
FROM public.profiles p
WHERE p.id = pp.user_id;

-- Limpieza: quitar datos deportivos de la ficha general (ahora viven en player_profiles)
UPDATE public.profiles
SET jersey_number = NULL,
    position = NULL,
    shirt_size = NULL,
    pants_size = NULL,
    shoe_size = NULL
WHERE jersey_number IS NOT NULL
   OR position IS NOT NULL
   OR shirt_size IS NOT NULL
   OR pants_size IS NOT NULL
   OR shoe_size IS NOT NULL;

-- Índice para filtrar plantillas activas
CREATE INDEX IF NOT EXISTS player_profiles_active_idx
  ON public.player_profiles (team_id) WHERE archived_at IS NULL;