-- 1. Entrenamientos: notificar solo a los convocados del evento
CREATE OR REPLACE FUNCTION public.notify_calendar_event_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_targets uuid[];
BEGIN
  IF NEW.club_id IS NULL OR NEW.team_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_private, false) THEN RETURN NEW; END IF;
  IF NEW.event_type <> 'entrenamiento' THEN RETURN NEW; END IF;
  IF NEW.starts_at < now() THEN RETURN NEW; END IF;

  SELECT array_agg(ea.user_id) INTO v_targets
  FROM public.event_attendees ea WHERE ea.event_id = NEW.id;
  IF v_targets IS NULL OR array_length(v_targets, 1) IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(NEW.club_id, v_targets, 'entrenamiento_nuevo',
    'Nuevo entrenamiento', NEW.title, 'agenda', NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_calendar_event_time_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_targets uuid[];
BEGIN
  IF NEW.club_id IS NULL OR NEW.team_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_private, false) THEN RETURN NEW; END IF;
  IF NEW.event_type <> 'entrenamiento' THEN RETURN NEW; END IF;
  IF NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at
     AND NEW.ends_at IS NOT DISTINCT FROM OLD.ends_at THEN
    RETURN NEW;
  END IF;
  IF NEW.starts_at < now() THEN RETURN NEW; END IF;

  SELECT array_agg(ea.user_id) INTO v_targets
  FROM public.event_attendees ea WHERE ea.event_id = NEW.id;
  IF v_targets IS NULL OR array_length(v_targets, 1) IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(NEW.club_id, v_targets, 'entrenamiento_horario',
    'Cambió el horario del entrenamiento', NEW.title, 'agenda', NEW.id);
  RETURN NEW;
END;
$function$;

-- 2. Quitar aviso duplicado de plan de entrenamiento publicado
DROP TRIGGER IF EXISTS trg_notify_training_session ON public.training_sessions;
DROP FUNCTION IF EXISTS public.notify_training_session();

-- 3. Quitar avisos de vuelo y transporte asignado
DROP TRIGGER IF EXISTS trg_notify_flight_passenger ON public.trip_flight_passengers;
DROP FUNCTION IF EXISTS public.notify_flight_passenger();
DROP TRIGGER IF EXISTS trg_notify_transport_passenger ON public.trip_transport_passengers;
DROP FUNCTION IF EXISTS public.notify_transport_passenger();

-- 4. Limpieza del historial de tipos eliminados
DELETE FROM public.notifications
WHERE type IN ('entrenamiento_publicado','viaje_vuelo_asignado','viaje_transporte_asignado','multimedia','viaje_documenta_maletas');