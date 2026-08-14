-- 1. Política de lectura de la agenda: hereda el permiso del módulo de origen
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;

CREATE POLICY calendar_events_select ON public.calendar_events
FOR SELECT TO authenticated
USING (
  has_club_access(auth.uid(), club_id)
  AND CASE
    WHEN event_type = 'medico'::event_type THEN EXISTS (
      SELECT 1 FROM public.medical_appointments ma
      WHERE ma.event_id = calendar_events.id
        AND (ma.player_user_id = auth.uid() OR public.can_access_health(auth.uid(), ma.team_id))
    )
    WHEN meeting_id IS NOT NULL THEN public.can_view_meeting(auth.uid(), meeting_id)
    WHEN trip_id IS NOT NULL THEN public.can_view_trip_new(auth.uid(), trip_id)
    WHEN event_type = 'partido'::event_type THEN (
      EXISTS (
        SELECT 1 FROM public.tournament_matches tm
        WHERE tm.calendar_event_id = calendar_events.id
          AND public.can_view_match_ops(auth.uid(), tm.id)
      )
      OR (
        NOT EXISTS (SELECT 1 FROM public.tournament_matches tm2 WHERE tm2.calendar_event_id = calendar_events.id)
        AND team_id IS NOT NULL
        AND public.can_view_module(auth.uid(), 'agenda', team_id)
      )
    )
    WHEN event_type = 'entrenamiento'::event_type THEN (
      team_id IS NOT NULL AND public.can_view_training(auth.uid(), team_id)
    )
    WHEN event_type = 'viaje'::event_type THEN (
      team_id IS NOT NULL AND public.can_view_module(auth.uid(), 'viajes', team_id)
    )
    ELSE (
      EXISTS (
        SELECT 1 FROM public.event_attendees ea
        WHERE ea.event_id = calendar_events.id AND ea.user_id = auth.uid()
      )
      OR CASE
        WHEN team_id IS NULL THEN public.max_permission_any_team(auth.uid(), 'agenda') <> 'sin_acceso'::permission_level
        ELSE public.can_view_module(auth.uid(), 'agenda', team_id)
      END
    )
  END
);

-- 2. Sincronización de sesiones de entrenamiento hacia la agenda
CREATE OR REPLACE FUNCTION public.sync_training_session_to_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.calendar_events (club_id, team_id, event_type, title, starts_at, description, created_by)
    VALUES (NEW.club_id, NEW.team_id, 'entrenamiento', NEW.title, NEW.session_date, NEW.objective, NEW.created_by)
    RETURNING id INTO v_event;
    NEW.event_id := v_event;
    RETURN NEW;
  END IF;

  IF NEW.event_id IS NULL THEN
    INSERT INTO public.calendar_events (club_id, team_id, event_type, title, starts_at, description, created_by)
    VALUES (NEW.club_id, NEW.team_id, 'entrenamiento', NEW.title, NEW.session_date, NEW.objective, NEW.created_by)
    RETURNING id INTO v_event;
    NEW.event_id := v_event;
  ELSE
    UPDATE public.calendar_events
       SET title = NEW.title,
           starts_at = NEW.session_date,
           description = NEW.objective,
           team_id = NEW.team_id,
           updated_at = now()
     WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_training_session_to_calendar ON public.training_sessions;
CREATE TRIGGER trg_sync_training_session_to_calendar
BEFORE INSERT OR UPDATE ON public.training_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_training_session_to_calendar();

CREATE OR REPLACE FUNCTION public.delete_training_session_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.event_id IS NOT NULL THEN
    DELETE FROM public.calendar_events WHERE id = OLD.event_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_training_session_calendar_event ON public.training_sessions;
CREATE TRIGGER trg_delete_training_session_calendar_event
AFTER DELETE ON public.training_sessions
FOR EACH ROW EXECUTE FUNCTION public.delete_training_session_calendar_event();