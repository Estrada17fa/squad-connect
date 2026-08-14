-- 1) Sincronización partido -> evento de calendario
CREATE OR REPLACE FUNCTION public.match_calendar_title(_home text, _away text, _hg int, _ag int, _status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _status = 'jugado' AND _hg IS NOT NULL AND _ag IS NOT NULL
      THEN coalesce(_home,'Por definir') || ' ' || _hg || ' - ' || _ag || ' ' || coalesce(_away,'Por definir')
    ELSE coalesce(_home,'Por definir') || ' vs ' || coalesce(_away,'Por definir')
  END
$$;

CREATE OR REPLACE FUNCTION public.sync_match_to_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_home text;
  v_away text;
  v_title text;
  v_desc text;
  v_event uuid;
BEGIN
  SELECT t.team_id INTO v_team_id FROM public.tournaments t WHERE t.id = NEW.tournament_id;
  SELECT name INTO v_home FROM public.tournament_teams WHERE id = NEW.home_team_id;
  SELECT name INTO v_away FROM public.tournament_teams WHERE id = NEW.away_team_id;

  v_title := public.match_calendar_title(v_home, v_away, NEW.home_goals, NEW.away_goals, NEW.status::text);
  v_desc := CASE WHEN NEW.matchday IS NOT NULL THEN 'Jornada ' || NEW.matchday ELSE NULL END;

  IF NEW.kickoff_at IS NULL THEN
    -- sin fecha no hay evento; si existía, se elimina
    IF NEW.calendar_event_id IS NOT NULL THEN
      DELETE FROM public.calendar_events WHERE id = NEW.calendar_event_id;
      NEW.calendar_event_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.calendar_event_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.calendar_events WHERE id = NEW.calendar_event_id) THEN
    UPDATE public.calendar_events
       SET title = v_title,
           team_id = v_team_id,
           starts_at = NEW.kickoff_at,
           ends_at = NEW.kickoff_at + interval '2 hours',
           location = NEW.venue,
           location_id = NEW.location_id,
           description = v_desc
     WHERE id = NEW.calendar_event_id;
  ELSE
    INSERT INTO public.calendar_events
      (club_id, team_id, event_type, title, starts_at, ends_at, location, location_id, description, created_by)
    VALUES
      (NEW.club_id, v_team_id, 'partido', v_title, NEW.kickoff_at, NEW.kickoff_at + interval '2 hours',
       NEW.venue, NEW.location_id, v_desc, NEW.created_by)
    RETURNING id INTO v_event;
    NEW.calendar_event_id := v_event;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_match_to_calendar ON public.tournament_matches;
CREATE TRIGGER trg_sync_match_to_calendar
BEFORE INSERT OR UPDATE OF kickoff_at, location_id, venue, home_team_id, away_team_id, home_goals, away_goals, status, matchday, tournament_id
ON public.tournament_matches
FOR EACH ROW EXECUTE FUNCTION public.sync_match_to_calendar();

CREATE OR REPLACE FUNCTION public.delete_match_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.calendar_event_id IS NOT NULL THEN
    DELETE FROM public.calendar_events WHERE id = OLD.calendar_event_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_match_calendar_event ON public.tournament_matches;
CREATE TRIGGER trg_delete_match_calendar_event
AFTER DELETE ON public.tournament_matches
FOR EACH ROW EXECUTE FUNCTION public.delete_match_calendar_event();

-- Backfill de partidos existentes con fecha
UPDATE public.tournament_matches SET updated_at = now() WHERE kickoff_at IS NOT NULL AND calendar_event_id IS NULL;

-- 2) Vista derivada de estadísticas de torneo por jugador
CREATE OR REPLACE VIEW public.player_tournament_stats
WITH (security_invoker = true) AS
SELECT
  g.player_user_id,
  g.club_id,
  t.id            AS tournament_id,
  t.name          AS tournament_name,
  t.season        AS season_name,
  t.team_id       AS team_id,
  sum(g.goals)::int                     AS goals,
  count(DISTINCT g.match_id)::int       AS matches_scored
FROM public.tournament_match_goals g
JOIN public.tournaments t ON t.id = g.tournament_id
WHERE g.player_user_id IS NOT NULL
GROUP BY g.player_user_id, g.club_id, t.id, t.name, t.season, t.team_id;

GRANT SELECT ON public.player_tournament_stats TO authenticated;
GRANT SELECT ON public.player_tournament_stats TO service_role;