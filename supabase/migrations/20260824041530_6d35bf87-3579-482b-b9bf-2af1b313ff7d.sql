CREATE OR REPLACE FUNCTION public.sync_training_session_to_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event uuid;
BEGIN
  IF NEW.event_id IS NULL THEN
    INSERT INTO public.calendar_events (club_id, team_id, event_type, title, starts_at, description, created_by)
    VALUES (NEW.club_id, NEW.team_id, 'entrenamiento', NEW.title, NEW.session_date, NEW.objective, NEW.created_by)
    RETURNING id INTO v_event;
    NEW.event_id := v_event;
  ELSE
    UPDATE public.calendar_events
       SET title = NEW.title,
           starts_at = NEW.session_date,
           description = COALESCE(NEW.objective, description),
           team_id = NEW.team_id,
           updated_at = now()
     WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$function$;

DELETE FROM public.calendar_events e
 WHERE e.event_type = 'entrenamiento'
   AND NOT EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.event_id = e.id);