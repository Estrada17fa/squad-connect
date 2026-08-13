-- 1) Notas internas
ALTER TABLE public.development_feedback
  ADD COLUMN IF NOT EXISTS visible_to_player boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.development_sees_all(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.effective_permission(_user_id, 'desarrollo', _team_id)
         NOT IN ('sin_acceso','vista_jugador')
$$;

DROP POLICY IF EXISTS dev_feedback_select ON public.development_feedback;
CREATE POLICY dev_feedback_select ON public.development_feedback
  FOR SELECT TO authenticated
  USING (
    public.development_sees_all(auth.uid(), team_id)
    OR (player_user_id = auth.uid() AND visible_to_player)
  );

-- 2) Mediciones físicas
CREATE TABLE IF NOT EXISTS public.development_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL,
  measured_on date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Mazatlan')::date,
  metric text NOT NULL,
  value numeric NOT NULL,
  unit text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.development_measurements TO authenticated;
GRANT ALL ON public.development_measurements TO service_role;
ALTER TABLE public.development_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY dev_measure_select ON public.development_measurements
  FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'desarrollo', player_user_id, team_id));
CREATE POLICY dev_measure_insert ON public.development_measurements
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id));
CREATE POLICY dev_measure_update ON public.development_measurements
  FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id));
CREATE POLICY dev_measure_delete ON public.development_measurements
  FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id));

CREATE INDEX IF NOT EXISTS idx_dev_measure_player ON public.development_measurements(player_user_id, measured_on DESC);
CREATE INDEX IF NOT EXISTS idx_dev_measure_team ON public.development_measurements(team_id);
CREATE INDEX IF NOT EXISTS idx_dev_measure_club ON public.development_measurements(club_id);

CREATE TRIGGER dev_measurements_set_updated_at
  BEFORE UPDATE ON public.development_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Estadísticas de competencia (preparadas para el futuro módulo Torneo)
CREATE TABLE IF NOT EXISTS public.player_competition_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL,
  season_name text NOT NULL,
  period_start date,
  period_end date,
  matches_played integer NOT NULL DEFAULT 0,
  matches_started integer NOT NULL DEFAULT 0,
  minutes_played integer NOT NULL DEFAULT 0,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  yellow_cards integer NOT NULL DEFAULT 0,
  red_cards integer NOT NULL DEFAULT 0,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  tournament_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_competition_stats_source_chk CHECK (source IN ('manual','torneo')),
  CONSTRAINT player_competition_stats_unique UNIQUE (player_user_id, season_name, source)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_competition_stats TO authenticated;
GRANT ALL ON public.player_competition_stats TO service_role;
ALTER TABLE public.player_competition_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY pcs_select ON public.player_competition_stats
  FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'desarrollo', player_user_id, team_id));
CREATE POLICY pcs_insert ON public.player_competition_stats
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id));
CREATE POLICY pcs_update ON public.player_competition_stats
  FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id));
CREATE POLICY pcs_delete ON public.player_competition_stats
  FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id));

CREATE INDEX IF NOT EXISTS idx_pcs_player ON public.player_competition_stats(player_user_id);
CREATE INDEX IF NOT EXISTS idx_pcs_team ON public.player_competition_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_pcs_club ON public.player_competition_stats(club_id);

CREATE TRIGGER pcs_set_updated_at
  BEFORE UPDATE ON public.player_competition_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();