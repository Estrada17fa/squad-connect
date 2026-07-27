
-- Attach tasks completed_at trigger
DROP TRIGGER IF EXISTS trg_tasks_touch_completed_at ON public.tasks;
CREATE TRIGGER trg_tasks_touch_completed_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tasks_touch_completed_at();

-- Attach meeting -> calendar_event sync
DROP TRIGGER IF EXISTS trg_sync_meeting_to_calendar ON public.meetings;
CREATE TRIGGER trg_sync_meeting_to_calendar
AFTER INSERT OR UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.sync_meeting_to_calendar();

-- Delete calendar_event when meeting is deleted
CREATE OR REPLACE FUNCTION public.delete_meeting_calendar_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.calendar_events WHERE meeting_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_meeting_calendar_event ON public.meetings;
CREATE TRIGGER trg_delete_meeting_calendar_event
AFTER DELETE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.delete_meeting_calendar_event();

-- Attach meeting attendees -> event attendees sync
DROP TRIGGER IF EXISTS trg_sync_meeting_attendee_to_event ON public.meeting_attendees;
CREATE TRIGGER trg_sync_meeting_attendee_to_event
AFTER INSERT OR DELETE ON public.meeting_attendees
FOR EACH ROW EXECUTE FUNCTION public.sync_meeting_attendee_to_event();
