-- =========================================================
-- 0) Nunca auto-notificarse (punto central)
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_users(_club_id uuid, _user_ids uuid[], _type text, _title text, _body text, _related_module text, _related_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_notification_id uuid;
  v_audience text := coalesce(nullif(current_setting('app.notification_audience', true), ''), 'direct');
  v_actor uuid := auth.uid();
BEGIN
  IF _club_id IS NULL OR _user_ids IS NULL THEN RETURN; END IF;

  FOR v_user IN
    SELECT DISTINCT u FROM unnest(_user_ids) AS u
    WHERE u IS NOT NULL
      AND (v_actor IS NULL OR u <> v_actor)
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u)
  LOOP
    INSERT INTO public.notifications
      (club_id, user_id, type, title, body, related_module, related_id, audience)
    VALUES (_club_id, v_user, _type, _title, _body, _related_module, _related_id, v_audience)
    RETURNING id INTO v_notification_id;
    PERFORM public.notifications_push_hook(v_notification_id);
  END LOOP;
END;
$function$;

-- =========================================================
-- 1) Agenda: solo entrenamientos
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_calendar_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.club_id IS NULL OR NEW.team_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_private, false) THEN RETURN NEW; END IF;
  IF NEW.event_type <> 'entrenamiento' THEN RETURN NEW; END IF;
  IF NEW.starts_at < now() THEN RETURN NEW; END IF;

  PERFORM public.notify_group(NEW.club_id, 'team', NEW.team_id, 'entrenamiento_nuevo',
    'Nuevo entrenamiento', NEW.title, 'agenda', NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_calendar_event_time_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.club_id IS NULL OR NEW.team_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_private, false) THEN RETURN NEW; END IF;
  IF NEW.event_type <> 'entrenamiento' THEN RETURN NEW; END IF;
  IF NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at
     AND NEW.ends_at IS NOT DISTINCT FROM OLD.ends_at THEN
    RETURN NEW;
  END IF;
  IF NEW.starts_at < now() THEN RETURN NEW; END IF;

  PERFORM public.notify_group(NEW.club_id, 'team', NEW.team_id, 'entrenamiento_horario',
    'Cambió el horario del entrenamiento', NEW.title, 'agenda', NEW.id);
  RETURN NEW;
END;
$$;

-- =========================================================
-- 2) Coordinación: tareas y juntas
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD;
BEGIN
  SELECT club_id, title INTO t FROM public.tasks WHERE id = NEW.task_id;
  IF t IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'tarea_asignada',
    'Se te asignó la tarea: ' || t.title, NULL,
    'coordinacion_interna', NEW.task_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON public.task_assignees;
CREATE TRIGGER trg_notify_task_assigned
AFTER INSERT ON public.task_assignees
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

CREATE OR REPLACE FUNCTION public.notify_task_due_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_targets uuid[];
  v_body text;
BEGIN
  IF NEW.due_at IS NOT DISTINCT FROM OLD.due_at THEN RETURN NEW; END IF;

  SELECT array_agg(ta.user_id) INTO v_targets
  FROM public.task_assignees ta WHERE ta.task_id = NEW.id;
  IF v_targets IS NULL THEN RETURN NEW; END IF;

  v_body := CASE
    WHEN NEW.due_at IS NULL THEN 'Ahora no tiene fecha límite'
    ELSE 'Nueva fecha límite: ' || to_char(NEW.due_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI')
  END;

  PERFORM public.notify_users(
    NEW.club_id, v_targets, 'tarea_fecha',
    'Cambió la fecha de la tarea: ' || NEW.title, v_body,
    'coordinacion_interna', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_due_changed ON public.tasks;
CREATE TRIGGER trg_notify_task_due_changed
AFTER UPDATE OF due_at ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_due_changed();

CREATE OR REPLACE FUNCTION public.notify_meeting_invited()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m RECORD;
BEGIN
  SELECT club_id, title, starts_at INTO m FROM public.meetings WHERE id = NEW.meeting_id;
  IF m IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users(
    m.club_id, ARRAY[NEW.user_id], 'junta_invitacion',
    'Fuiste convocado a la junta: ' || m.title,
    to_char(m.starts_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'coordinacion_interna', NEW.meeting_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meeting_invited ON public.meeting_attendees;
CREATE TRIGGER trg_notify_meeting_invited
AFTER INSERT ON public.meeting_attendees
FOR EACH ROW EXECUTE FUNCTION public.notify_meeting_invited();

CREATE OR REPLACE FUNCTION public.notify_meeting_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_targets uuid[];
BEGIN
  IF NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at
     AND NEW.location IS NOT DISTINCT FROM OLD.location
     AND NEW.location_id IS NOT DISTINCT FROM OLD.location_id
     AND NOT (NEW.status = 'cancelada' AND OLD.status IS DISTINCT FROM 'cancelada') THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(ma.user_id) INTO v_targets
  FROM public.meeting_attendees ma WHERE ma.meeting_id = NEW.id;
  IF v_targets IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'cancelada' AND OLD.status IS DISTINCT FROM 'cancelada' THEN
    PERFORM public.notify_users(
      NEW.club_id, v_targets, 'junta_cancelada',
      'Se canceló la junta: ' || NEW.title,
      to_char(NEW.starts_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
      'coordinacion_interna', NEW.id);
  ELSE
    PERFORM public.notify_users(
      NEW.club_id, v_targets, 'junta_fecha',
      'Cambió la junta: ' || NEW.title,
      'Nueva fecha: ' || to_char(NEW.starts_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
      'coordinacion_interna', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meeting_changed ON public.meetings;
CREATE TRIGGER trg_notify_meeting_changed
AFTER UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.notify_meeting_changed();

-- =========================================================
-- 3) Solicitudes
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_request_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_targets uuid[];
  v_requester text;
BEGIN
  SELECT array_agg(a.user_id) INTO v_targets
  FROM public.request_type_approver_ids(NEW.club_id, NEW.type) a
  WHERE a.user_id <> NEW.requester_id;
  IF v_targets IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(p.full_name, p.email, 'Un miembro') INTO v_requester
  FROM public.profiles p WHERE p.id = NEW.requester_id;

  PERFORM public.notify_users(
    NEW.club_id, v_targets, 'solicitud_creada',
    'Nueva solicitud por aprobar',
    v_requester || ' solicitó: ' || NEW.title,
    'solicitudes', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_request_created ON public.requests;
CREATE TRIGGER trg_notify_request_created
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.notify_request_created();

CREATE OR REPLACE FUNCTION public.notify_request_decided()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('aprobada','rechazada','requiere_info') THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.requester_id],
    CASE NEW.status
      WHEN 'aprobada' THEN 'solicitud_aprobada'
      WHEN 'rechazada' THEN 'solicitud_rechazada'
      ELSE 'solicitud_requiere_info' END,
    CASE NEW.status
      WHEN 'aprobada' THEN 'Tu solicitud de ' || NEW.title || ' fue aprobada'
      WHEN 'rechazada' THEN 'Tu solicitud de ' || NEW.title || ' fue rechazada'
      ELSE 'Tu solicitud de ' || NEW.title || ' necesita más información' END,
    NEW.decision_note,
    'solicitudes', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_request_decided ON public.requests;
CREATE TRIGGER trg_notify_request_decided
AFTER UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.notify_request_decided();

-- =========================================================
-- 4) Citas médicas: solo al paciente
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_medical_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> 'programada' OR NEW.player_user_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at
     AND NEW.place IS NOT DISTINCT FROM OLD.place THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.player_user_id], 'salud_cita',
    CASE WHEN TG_OP = 'INSERT'
      THEN 'Tienes una cita médica programada'
      ELSE 'Cambió tu cita médica' END,
    to_char(NEW.scheduled_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI')
      || COALESCE(' · ' || NEW.place, ''),
    'salud', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS medical_appointments_notify ON public.medical_appointments;
CREATE TRIGGER medical_appointments_notify
AFTER INSERT OR UPDATE ON public.medical_appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_medical_appointment();

-- =========================================================
-- 5) Partidos: cambio de citación
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_match_logistics_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_targets uuid[];
BEGIN
  IF NEW.call_time_at IS NOT DISTINCT FROM OLD.call_time_at
     AND NEW.meeting_location_id IS NOT DISTINCT FROM OLD.meeting_location_id
     AND NEW.meeting_point IS NOT DISTINCT FROM OLD.meeting_point THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(c.user_id) INTO v_targets
  FROM public.match_callups c WHERE c.match_id = NEW.match_id;
  IF v_targets IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    NEW.club_id, v_targets, 'partido_logistica',
    'Cambió la citación del partido',
    'Cambió la citación o el punto de reunión del partido ' || coalesce(public.match_notify_label(NEW.match_id), ''),
    'partidos', NEW.match_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_logistics_notify ON public.match_logistics;
CREATE TRIGGER match_logistics_notify
AFTER UPDATE ON public.match_logistics
FOR EACH ROW EXECUTE FUNCTION public.notify_match_logistics_change();

-- =========================================================
-- 6) Viajes: solo a la persona involucrada
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_trip_traveler()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD;
BEGIN
  SELECT club_id, title, destination, departure_at INTO t FROM public.trips WHERE id = NEW.trip_id;
  IF t IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_convocatoria',
    'Fuiste convocado al viaje a ' || COALESCE(t.destination, t.title),
    'Salida: ' || to_char(t.departure_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'viajes', NEW.trip_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_trip_traveler ON public.trip_travelers;
CREATE TRIGGER trg_notify_trip_traveler
AFTER INSERT ON public.trip_travelers
FOR EACH ROW EXECUTE FUNCTION public.notify_trip_traveler();

CREATE OR REPLACE FUNCTION public.notify_flight_passenger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD; f RECORD;
BEGIN
  SELECT fl.flight_code, fl.departs_at, fl.origin, fl.destination, fl.trip_id INTO f
  FROM public.trip_flights fl WHERE fl.id = NEW.flight_id;
  IF f IS NULL THEN RETURN NEW; END IF;
  SELECT tr.id, tr.club_id INTO t FROM public.trips tr WHERE tr.id = f.trip_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_vuelo_asignado',
    'Vuelo asignado: ' || f.flight_code,
    f.origin || ' → ' || f.destination || ' · ' ||
      to_char(f.departs_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'viajes', t.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_flight_passenger ON public.trip_flight_passengers;
CREATE TRIGGER trg_notify_flight_passenger
AFTER INSERT ON public.trip_flight_passengers
FOR EACH ROW EXECUTE FUNCTION public.notify_flight_passenger();

CREATE OR REPLACE FUNCTION public.notify_transport_passenger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD; tp RECORD;
BEGIN
  SELECT tt.label, tt.departs_at, tt.pickup_location, tt.destination, tt.trip_id INTO tp
  FROM public.trip_transports tt WHERE tt.id = NEW.transport_id;
  IF tp IS NULL THEN RETURN NEW; END IF;
  SELECT tr.id, tr.club_id INTO t FROM public.trips tr WHERE tr.id = tp.trip_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_transporte_asignado',
    'Transporte asignado' || COALESCE(': ' || tp.label, ''),
    COALESCE(tp.pickup_location, '') || ' → ' || COALESCE(tp.destination, '') || ' · ' ||
      to_char(tp.departs_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'viajes', t.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_transport_passenger ON public.trip_transport_passengers;
CREATE TRIGGER trg_notify_transport_passenger
AFTER INSERT ON public.trip_transport_passengers
FOR EACH ROW EXECUTE FUNCTION public.notify_transport_passenger();

CREATE OR REPLACE FUNCTION public.notify_boarding_pass()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT tr.id, tr.club_id, tr.title INTO t
  FROM public.trip_flights f JOIN public.trips tr ON tr.id = f.trip_id
  WHERE f.id = NEW.flight_id;
  IF t IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_pase_abordar',
    'Tu pase de abordar está listo',
    t.title || COALESCE(' · Asiento ' || NEW.seat, ''),
    'viajes', t.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_boarding_pass ON public.trip_boarding_passes;
CREATE TRIGGER trg_notify_boarding_pass
AFTER INSERT ON public.trip_boarding_passes
FOR EACH ROW EXECUTE FUNCTION public.notify_boarding_pass();

CREATE OR REPLACE FUNCTION public.notify_trip_meeting_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_targets uuid[];
BEGIN
  IF NEW.meeting_at IS NOT DISTINCT FROM OLD.meeting_at
     AND NEW.meeting_point IS NOT DISTINCT FROM OLD.meeting_point
     AND NEW.meeting_location_id IS NOT DISTINCT FROM OLD.meeting_location_id
     AND NEW.departure_at IS NOT DISTINCT FROM OLD.departure_at THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(tt.user_id) INTO v_targets
  FROM public.trip_travelers tt WHERE tt.trip_id = NEW.id;
  IF v_targets IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    NEW.club_id, v_targets, 'viaje_citacion',
    'Cambió la citación del viaje a ' || COALESCE(NEW.destination, NEW.title),
    CASE WHEN NEW.meeting_at IS NULL THEN NULL
      ELSE 'Citación: ' || to_char(NEW.meeting_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI') END,
    'viajes', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_trip_meeting_changed ON public.trips;
CREATE TRIGGER trg_notify_trip_meeting_changed
AFTER UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.notify_trip_meeting_changed();

-- =========================================================
-- 7) Documentos dirigidos a una persona
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_document_related()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.related_user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.related_user_id], 'documento_nuevo',
    'Tienes un documento nuevo', NEW.title,
    'documentos', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_document_related ON public.documents;
CREATE TRIGGER trg_notify_document_related
AFTER INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.notify_document_related();

-- =========================================================
-- 8) Sin acceso público a las funciones nuevas
-- =========================================================
REVOKE ALL ON FUNCTION public.notify_users(uuid, uuid[], text, text, text, text, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_calendar_event_created() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_calendar_event_time_changed() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_task_assigned() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_task_due_changed() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_meeting_invited() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_meeting_changed() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_request_created() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_request_decided() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_medical_appointment() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_match_logistics_change() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_trip_traveler() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_flight_passenger() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_transport_passenger() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_boarding_pass() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_trip_meeting_changed() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_document_related() FROM public, anon, authenticated;