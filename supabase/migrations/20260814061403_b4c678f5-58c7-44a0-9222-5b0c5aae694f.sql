-- 1. Torneos: formato, grupos, logo y fase final
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'sin_grupos',
  ADD COLUMN IF NOT EXISTS groups_count integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS logo_path text,
  ADD COLUMN IF NOT EXISTS has_playoffs boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS playoff_start_round integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS playoff_two_legs boolean NOT NULL DEFAULT false;

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_format_check CHECK (format IN ('sin_grupos','grupos'));

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_groups_count_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_groups_count_check CHECK (groups_count BETWEEN 2 AND 8);

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_playoff_round_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_playoff_round_check CHECK (playoff_start_round IN (2,4,8,16));

-- 2. Equipos participantes: grupo
ALTER TABLE public.tournament_teams
  ADD COLUMN IF NOT EXISTS group_label text;

-- 3. Llaves de fase final
CREATE TABLE IF NOT EXISTS public.tournament_playoff_ties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  round_size integer NOT NULL,
  slot integer NOT NULL,
  home_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  away_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  winner_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  two_legs boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round_size, slot)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_playoff_ties TO authenticated;
GRANT ALL ON public.tournament_playoff_ties TO service_role;

ALTER TABLE public.tournament_playoff_ties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playoff_ties_select" ON public.tournament_playoff_ties;
CREATE POLICY "playoff_ties_select" ON public.tournament_playoff_ties
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = tournament_playoff_ties.tournament_id
    AND public.can_view_module(auth.uid(), 'torneo', t.team_id)
));

DROP POLICY IF EXISTS "playoff_ties_insert" ON public.tournament_playoff_ties;
CREATE POLICY "playoff_ties_insert" ON public.tournament_playoff_ties
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = tournament_playoff_ties.tournament_id
    AND public.can_edit_module(auth.uid(), 'torneo', t.team_id)
));

DROP POLICY IF EXISTS "playoff_ties_update" ON public.tournament_playoff_ties;
CREATE POLICY "playoff_ties_update" ON public.tournament_playoff_ties
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = tournament_playoff_ties.tournament_id
    AND public.can_edit_module(auth.uid(), 'torneo', t.team_id)
));

DROP POLICY IF EXISTS "playoff_ties_delete" ON public.tournament_playoff_ties;
CREATE POLICY "playoff_ties_delete" ON public.tournament_playoff_ties
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = tournament_playoff_ties.tournament_id
    AND public.can_edit_module(auth.uid(), 'torneo', t.team_id)
));

DROP TRIGGER IF EXISTS set_updated_at_playoff_ties ON public.tournament_playoff_ties;
CREATE TRIGGER set_updated_at_playoff_ties
BEFORE UPDATE ON public.tournament_playoff_ties
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Partidos ligados a una llave
ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS tie_id uuid REFERENCES public.tournament_playoff_ties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS leg integer;

CREATE INDEX IF NOT EXISTS tournament_matches_tie_idx ON public.tournament_matches(tie_id);