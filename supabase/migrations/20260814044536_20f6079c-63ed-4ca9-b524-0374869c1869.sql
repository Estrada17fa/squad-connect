-- Enums
CREATE TYPE public.tournament_type AS ENUM ('liga','copa','otro');
CREATE TYPE public.tournament_status AS ENUM ('en_curso','finalizado');
CREATE TYPE public.tournament_match_status AS ENUM ('programado','jugado','suspendido');

-- Torneos
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  season text,
  type public.tournament_type NOT NULL DEFAULT 'liga',
  status public.tournament_status NOT NULL DEFAULT 'en_curso',
  format text,
  notes text,
  points_win integer NOT NULL DEFAULT 3,
  points_draw integer NOT NULL DEFAULT 1,
  points_loss integer NOT NULL DEFAULT 0,
  away_bonus_enabled boolean NOT NULL DEFAULT false,
  away_bonus_points integer NOT NULL DEFAULT 1,
  away_bonus_min_diff integer NOT NULL DEFAULT 2,
  shootout_enabled boolean NOT NULL DEFAULT false,
  shootout_min_goals integer NOT NULL DEFAULT 2,
  shootout_winner_points integer NOT NULL DEFAULT 1,
  tiebreakers jsonb NOT NULL DEFAULT '["diferencia_goles","goles_favor","directos","sorteo"]'::jsonb,
  external_source text,
  external_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tournaments_club_idx ON public.tournaments(club_id);
CREATE INDEX tournaments_team_idx ON public.tournaments(team_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournaments_select ON public.tournaments FOR SELECT TO authenticated
USING (public.can_view_module(auth.uid(), 'torneo', team_id));
CREATE POLICY tournaments_insert ON public.tournaments FOR INSERT TO authenticated
WITH CHECK (public.has_club_access(auth.uid(), club_id) AND public.can_edit_module(auth.uid(), 'torneo', team_id));
CREATE POLICY tournaments_update ON public.tournaments FOR UPDATE TO authenticated
USING (public.can_edit_module(auth.uid(), 'torneo', team_id))
WITH CHECK (public.can_edit_module(auth.uid(), 'torneo', team_id));
CREATE POLICY tournaments_delete ON public.tournaments FOR DELETE TO authenticated
USING (public.can_edit_module(auth.uid(), 'torneo', team_id));

CREATE TRIGGER tournaments_set_updated_at BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: categoría del torneo
CREATE OR REPLACE FUNCTION public.tournament_team_id(_tournament_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.tournaments WHERE id = _tournament_id
$$;

-- Equipos participantes
CREATE TABLE public.tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text,
  crest_path text,
  is_our_team boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tournament_teams_name_uniq ON public.tournament_teams(tournament_id, lower(name));
CREATE UNIQUE INDEX tournament_teams_our_uniq ON public.tournament_teams(tournament_id) WHERE is_our_team;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_teams TO authenticated;
GRANT ALL ON public.tournament_teams TO service_role;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournament_teams_select ON public.tournament_teams FOR SELECT TO authenticated
USING (public.can_view_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_teams_insert ON public.tournament_teams FOR INSERT TO authenticated
WITH CHECK (public.has_club_access(auth.uid(), club_id) AND public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_teams_update ON public.tournament_teams FOR UPDATE TO authenticated
USING (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)))
WITH CHECK (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_teams_delete ON public.tournament_teams FOR DELETE TO authenticated
USING (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));

CREATE TRIGGER tournament_teams_set_updated_at BEFORE UPDATE ON public.tournament_teams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Partidos (Parte 2)
CREATE TABLE public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  matchday integer,
  kickoff_at timestamptz,
  home_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  away_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  home_goals integer,
  away_goals integer,
  status public.tournament_match_status NOT NULL DEFAULT 'programado',
  shootout_winner_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  calendar_event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tournament_matches_tournament_idx ON public.tournament_matches(tournament_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_matches TO authenticated;
GRANT ALL ON public.tournament_matches TO service_role;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY tournament_matches_select ON public.tournament_matches FOR SELECT TO authenticated
USING (public.can_view_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_matches_insert ON public.tournament_matches FOR INSERT TO authenticated
WITH CHECK (public.has_club_access(auth.uid(), club_id) AND public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_matches_update ON public.tournament_matches FOR UPDATE TO authenticated
USING (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)))
WITH CHECK (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));
CREATE POLICY tournament_matches_delete ON public.tournament_matches FOR DELETE TO authenticated
USING (public.can_edit_module(auth.uid(), 'torneo', public.tournament_team_id(tournament_id)));

CREATE TRIGGER tournament_matches_set_updated_at BEFORE UPDATE ON public.tournament_matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();