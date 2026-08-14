-- ---------- Goles por partido ----------
CREATE TABLE public.tournament_match_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  player_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  player_name text,
  goals integer NOT NULL DEFAULT 1,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tournament_match_goals_goals_positive CHECK (goals > 0)
);
CREATE INDEX tournament_match_goals_match_idx ON public.tournament_match_goals(match_id);
CREATE INDEX tournament_match_goals_tournament_idx ON public.tournament_match_goals(tournament_id);
CREATE INDEX tournament_match_goals_player_idx ON public.tournament_match_goals(player_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_match_goals TO authenticated;
GRANT ALL ON public.tournament_match_goals TO service_role;
ALTER TABLE public.tournament_match_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournament_match_goals_select ON public.tournament_match_goals FOR SELECT TO authenticated
  USING (public.can_view_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_match_goals_insert ON public.tournament_match_goals FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id))
              AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY tournament_match_goals_update ON public.tournament_match_goals FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)))
  WITH CHECK (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_match_goals_delete ON public.tournament_match_goals FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));

CREATE TRIGGER tournament_match_goals_touch BEFORE UPDATE ON public.tournament_match_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Ajustes manuales de puntos ----------
CREATE TABLE public.tournament_point_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tournament_point_adjustments_tournament_idx ON public.tournament_point_adjustments(tournament_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_point_adjustments TO authenticated;
GRANT ALL ON public.tournament_point_adjustments TO service_role;
ALTER TABLE public.tournament_point_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournament_point_adjustments_select ON public.tournament_point_adjustments FOR SELECT TO authenticated
  USING (public.can_view_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_point_adjustments_insert ON public.tournament_point_adjustments FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id))
              AND club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY tournament_point_adjustments_update ON public.tournament_point_adjustments FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)))
  WITH CHECK (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_point_adjustments_delete ON public.tournament_point_adjustments FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));

CREATE TRIGGER tournament_point_adjustments_touch BEFORE UPDATE ON public.tournament_point_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Realtime ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_match_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_point_adjustments;