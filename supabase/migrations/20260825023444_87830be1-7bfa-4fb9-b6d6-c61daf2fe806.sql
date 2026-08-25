-- 1) Apagar notificaciones que ya no se quieren
DROP FUNCTION IF EXISTS public.notify_development_feedback() CASCADE;
DROP FUNCTION IF EXISTS public.notify_development_goal() CASCADE;
DROP FUNCTION IF EXISTS public.notify_routine_assignment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_expense_created() CASCADE;
DROP FUNCTION IF EXISTS public.notify_injury_created() CASCADE;
DROP FUNCTION IF EXISTS public.notify_checkup_created() CASCADE;
DROP FUNCTION IF EXISTS public.notify_prescription_created() CASCADE;
DROP FUNCTION IF EXISTS public.notify_medical_appointment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_loan_created() CASCADE;
DROP FUNCTION IF EXISTS public.notify_due_loans() CASCADE;
DROP FUNCTION IF EXISTS public.notify_match_logistics_change() CASCADE;
DROP FUNCTION IF EXISTS public.notify_media_post_club() CASCADE;
DROP FUNCTION IF EXISTS public.notify_media_post_team() CASCADE;
DROP FUNCTION IF EXISTS public.notify_meeting_invited() CASCADE;
DROP FUNCTION IF EXISTS public.notify_meeting_changed() CASCADE;
DROP FUNCTION IF EXISTS public.notify_request_created() CASCADE;
DROP FUNCTION IF EXISTS public.notify_request_decided() CASCADE;
DROP FUNCTION IF EXISTS public.notify_task_assigned() CASCADE;
DROP FUNCTION IF EXISTS public.notify_task_deleted() CASCADE;
DROP FUNCTION IF EXISTS public.notify_task_due_changed() CASCADE;
DROP FUNCTION IF EXISTS public.notify_boarding_pass() CASCADE;
DROP FUNCTION IF EXISTS public.notify_baggage_handler() CASCADE;
DROP FUNCTION IF EXISTS public.notify_flight_passenger() CASCADE;
DROP FUNCTION IF EXISTS public.notify_transport_passenger() CASCADE;
DROP FUNCTION IF EXISTS public.notify_trip_traveler() CASCADE;

-- 2) Nuevo evento en la agenda
CREATE OR REPLACE FUNCTION public.notify_calendar_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.club_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_private, false) THEN RETURN NEW; END IF;
  -- Los entrenamientos ya tienen su propio aviso al publicarse el plan.
  IF NEW.event_type = 'entrenamiento' THEN RETURN NEW; END IF;
  IF NEW.starts_at < now() THEN RETURN NEW; END IF;

  IF NEW.team_id IS NULL THEN
    PERFORM public.notify_group(NEW.club_id, 'club', NULL, 'evento_nuevo',
      'Nuevo evento', NEW.title, 'agenda', NEW.id);
  ELSE
    PERFORM public.notify_group(NEW.club_id, 'team', NEW.team_id, 'evento_nuevo',
      'Nuevo evento', NEW.title, 'agenda', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_calendar_event_created ON public.calendar_events;
CREATE TRIGGER trg_notify_calendar_event_created
  AFTER INSERT ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_calendar_event_created();

-- 3) Cambio de horario
CREATE OR REPLACE FUNCTION public.notify_calendar_event_time_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.club_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_private, false) THEN RETURN NEW; END IF;
  IF NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at
     AND NEW.ends_at IS NOT DISTINCT FROM OLD.ends_at THEN
    RETURN NEW;
  END IF;
  IF NEW.starts_at < now() THEN RETURN NEW; END IF;

  IF NEW.team_id IS NULL THEN
    PERFORM public.notify_group(NEW.club_id, 'club', NULL, 'evento_horario',
      'Cambio de horario', NEW.title, 'agenda', NEW.id);
  ELSE
    PERFORM public.notify_group(NEW.club_id, 'team', NEW.team_id, 'evento_horario',
      'Cambio de horario', NEW.title, 'agenda', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_calendar_event_time_changed ON public.calendar_events;
CREATE TRIGGER trg_notify_calendar_event_time_changed
  AFTER UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_calendar_event_time_changed();

REVOKE ALL ON FUNCTION public.notify_calendar_event_created() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_calendar_event_time_changed() FROM public, anon, authenticated;