-- 1. notify_users: separar variable de destinatario y de id insertado
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
BEGIN
  IF _club_id IS NULL OR _user_ids IS NULL THEN RETURN; END IF;

  FOR v_user IN
    SELECT DISTINCT u FROM unnest(_user_ids) AS u
    WHERE u IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u)
  LOOP
    INSERT INTO public.notifications
      (club_id, user_id, type, title, body, related_module, related_id, audience)
    VALUES (_club_id, v_user, _type, _title, _body, _related_module, _related_id, v_audience)
    RETURNING id INTO v_notification_id;
    PERFORM public.notifications_push_hook(v_notification_id);
  END LOOP;
END;
$function$;

-- 2. Textos afinados en los avisos ya existentes
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t RECORD;
BEGIN
  SELECT club_id, title, created_by INTO t FROM public.tasks WHERE id = NEW.task_id;
  IF t IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id = COALESCE(t.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'tarea_asignada',
    'Se te asignó la tarea: ' || t.title,
    NULL,
    'coordinacion_interna', NEW.task_id
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_meeting_invited()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m RECORD;
BEGIN
  SELECT club_id, title, starts_at, created_by INTO m
  FROM public.meetings WHERE id = NEW.meeting_id;
  IF m IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id = COALESCE(m.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_users(
    m.club_id, ARRAY[NEW.user_id], 'junta_invitacion',
    'Fuiste convocado a la junta: ' || m.title,
    to_char(m.starts_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'coordinacion_interna', NEW.meeting_id
  );
  RETURN NEW;
END;
$function$;

-- 3. Cambio de fecha límite en tareas
CREATE OR REPLACE FUNCTION public.notify_task_due_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_targets uuid[];
  v_body text;
BEGIN
  IF NEW.due_at IS NOT DISTINCT FROM OLD.due_at THEN RETURN NEW; END IF;

  SELECT array_agg(ta.user_id) INTO v_targets
  FROM public.task_assignees ta
  WHERE ta.task_id = NEW.id
    AND ta.user_id IS DISTINCT FROM auth.uid();

  IF v_targets IS NULL THEN RETURN NEW; END IF;

  v_body := CASE
    WHEN NEW.due_at IS NULL THEN 'Ahora no tiene fecha límite'
    ELSE 'Nueva fecha límite: ' || to_char(NEW.due_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI')
  END;

  PERFORM public.notify_users(
    NEW.club_id, v_targets, 'tarea_fecha',
    'Cambió la fecha de la tarea: ' || NEW.title,
    v_body,
    'coordinacion_interna', NEW.id
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_task_due_changed ON public.tasks;
CREATE TRIGGER trg_notify_task_due_changed
AFTER UPDATE OF due_at ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_due_changed();

-- 4. Eliminación de tarea
CREATE OR REPLACE FUNCTION public.notify_task_deleted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_targets uuid[];
BEGIN
  SELECT array_agg(ta.user_id) INTO v_targets
  FROM public.task_assignees ta
  WHERE ta.task_id = OLD.id
    AND ta.user_id IS DISTINCT FROM auth.uid();

  IF v_targets IS NOT NULL THEN
    PERFORM public.notify_users(
      OLD.club_id, v_targets, 'tarea_eliminada',
      'Se eliminó la tarea: ' || OLD.title,
      NULL,
      NULL, NULL
    );
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_task_deleted ON public.tasks;
CREATE TRIGGER trg_notify_task_deleted
BEFORE DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_deleted();

-- 5. Cambio de fecha / cancelación de junta
CREATE OR REPLACE FUNCTION public.notify_meeting_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_targets uuid[];
BEGIN
  IF (NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at)
     AND NOT (NEW.status = 'cancelada' AND OLD.status IS DISTINCT FROM 'cancelada') THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(ma.user_id) INTO v_targets
  FROM public.meeting_attendees ma
  WHERE ma.meeting_id = NEW.id
    AND ma.user_id IS DISTINCT FROM auth.uid();

  IF v_targets IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'cancelada' AND OLD.status IS DISTINCT FROM 'cancelada' THEN
    PERFORM public.notify_users(
      NEW.club_id, v_targets, 'junta_cancelada',
      'Se canceló la junta: ' || NEW.title,
      to_char(NEW.starts_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
      'coordinacion_interna', NEW.id
    );
  ELSE
    PERFORM public.notify_users(
      NEW.club_id, v_targets, 'junta_fecha',
      'Cambió la fecha de la junta: ' || NEW.title,
      'Nueva fecha: ' || to_char(NEW.starts_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
      'coordinacion_interna', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_meeting_changed ON public.meetings;
CREATE TRIGGER trg_notify_meeting_changed
AFTER UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.notify_meeting_changed();