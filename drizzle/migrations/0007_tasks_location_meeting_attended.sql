ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_meeting_id_idx ON public.tasks(meeting_id);
ALTER TABLE public.meeting_attendees ADD COLUMN IF NOT EXISTS attended boolean;

CREATE OR REPLACE FUNCTION public.tasks_validate_refs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.locations l WHERE l.id = NEW.location_id AND l.club_id = NEW.club_id) THEN
    RAISE EXCEPTION 'La ubicación no pertenece al club';
  END IF;
  IF NEW.meeting_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.meetings m WHERE m.id = NEW.meeting_id AND m.club_id = NEW.club_id) THEN
    RAISE EXCEPTION 'La junta no pertenece al club';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tasks_validate_refs ON public.tasks;
CREATE TRIGGER trg_tasks_validate_refs BEFORE INSERT OR UPDATE OF location_id, meeting_id, club_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tasks_validate_refs();

-- Un invitado sin permiso de Editar solo puede cambiar su respuesta, no su asistencia real.
CREATE OR REPLACE FUNCTION public.meeting_attendees_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_edit_meeting(auth.uid(), NEW.meeting_id) THEN
    IF NEW.attended IS DISTINCT FROM OLD.attended OR NEW.user_id <> OLD.user_id OR NEW.meeting_id <> OLD.meeting_id THEN
      RAISE EXCEPTION 'Solo puedes cambiar tu respuesta';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_meeting_attendees_guard ON public.meeting_attendees;
CREATE TRIGGER trg_meeting_attendees_guard BEFORE UPDATE ON public.meeting_attendees
FOR EACH ROW EXECUTE FUNCTION public.meeting_attendees_guard();

CREATE OR REPLACE FUNCTION public.notify_meeting_finished()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_targets uuid[];
BEGIN
  IF NEW.status = 'finalizada' AND OLD.status IS DISTINCT FROM 'finalizada' THEN
    SELECT array_agg(ma.user_id) INTO v_targets FROM public.meeting_attendees ma WHERE ma.meeting_id = NEW.id;
    IF v_targets IS NOT NULL THEN
      PERFORM public.notify_users(NEW.club_id, v_targets, 'junta_resumen',
        'Resumen de ' || NEW.title, 'Revisa la minuta y los acuerdos',
        'coordinacion_interna', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_meeting_finished ON public.meetings;
CREATE TRIGGER trg_notify_meeting_finished AFTER UPDATE OF status ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.notify_meeting_finished();