CREATE OR REPLACE FUNCTION public.sync_match_to_calendar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id uuid;
  v_home text;
  v_away text;
  v_title text;
  v_desc text;
  v_event uuid;
  v_ours boolean;
BEGIN
  SELECT t.team_id INTO v_team_id FROM public.tournaments t WHERE t.id = NEW.tournament_id;
  SELECT name INTO v_home FROM public.tournament_teams WHERE id = NEW.home_team_id;
  SELECT name INTO v_away FROM public.tournament_teams WHERE id = NEW.away_team_id;

  SELECT EXISTS (
    SELECT 1 FROM public.tournament_teams tt
    WHERE tt.id IN (NEW.home_team_id, NEW.away_team_id)
      AND tt.is_our_team
  ) INTO v_ours;

  v_title := public.match_calendar_title(v_home, v_away, NEW.home_goals, NEW.away_goals, NEW.status::text);
  v_desc := CASE WHEN NEW.matchday IS NOT NULL THEN 'Jornada ' || NEW.matchday ELSE NULL END;

  -- Sin fecha, o partido entre equipos ajenos: no hay evento de calendario.
  IF NEW.kickoff_at IS NULL OR NOT v_ours THEN
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
$function$;

-- Limpieza: eventos de partidos entre equipos ajenos ya creados.
WITH ajenos AS (
  SELECT m.id, m.calendar_event_id
  FROM public.tournament_matches m
  LEFT JOIN public.tournament_teams h ON h.id = m.home_team_id
  LEFT JOIN public.tournament_teams a ON a.id = m.away_team_id
  WHERE m.calendar_event_id IS NOT NULL
    AND NOT (coalesce(h.is_our_team, false) OR coalesce(a.is_our_team, false))
), cleared AS (
  UPDATE public.tournament_matches m
     SET calendar_event_id = NULL
    FROM ajenos WHERE m.id = ajenos.id
  RETURNING ajenos.calendar_event_id AS ev
)
DELETE FROM public.calendar_events ce USING cleared WHERE ce.id = cleared.ev;