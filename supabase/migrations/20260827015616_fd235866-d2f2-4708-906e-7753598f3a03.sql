ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY club_id ORDER BY name) AS rn
  FROM public.teams
)
UPDATE public.teams t
SET display_order = ordered.rn
FROM ordered
WHERE ordered.id = t.id;

CREATE UNIQUE INDEX IF NOT EXISTS teams_one_primary_per_club
  ON public.teams (club_id) WHERE is_primary;

WITH firsts AS (
  SELECT DISTINCT ON (club_id) id, club_id
  FROM public.teams
  ORDER BY club_id, display_order, name
)
UPDATE public.teams t
SET is_primary = true
FROM firsts
WHERE firsts.id = t.id
  AND NOT EXISTS (
    SELECT 1 FROM public.teams x WHERE x.club_id = t.club_id AND x.is_primary
  );