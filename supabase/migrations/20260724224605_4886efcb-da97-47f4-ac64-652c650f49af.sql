
-- Enums
CREATE TYPE public.task_priority AS ENUM ('baja','media','alta');
CREATE TYPE public.task_status AS ENUM ('pendiente','en_progreso','completada');
CREATE TYPE public.attendance_status AS ENUM ('invitado','confirmado','rechazado');

-- Allow calendar_events.team_id to be NULL (for club-wide meeting events).
ALTER TABLE public.calendar_events ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE public.calendar_events ADD COLUMN meeting_id uuid;

-- meetings
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  agenda text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_meeting_id_fkey
  FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX calendar_events_meeting_id_uniq ON public.calendar_events(meeting_id) WHERE meeting_id IS NOT NULL;

-- meeting_attendees
CREATE TABLE public.meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_status public.attendance_status NOT NULL DEFAULT 'invitado',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_attendees TO authenticated;
GRANT ALL ON public.meeting_attendees TO service_role;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

-- tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  priority public.task_priority NOT NULL DEFAULT 'media',
  status public.task_status NOT NULL DEFAULT 'pendiente',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- task_assignees
CREATE TABLE public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignees TO authenticated;
GRANT ALL ON public.task_assignees TO service_role;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Helper: any-level access to a module (read/editor/approver).
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module_key text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    WHERE tm.user_id = _user_id AND rp.module_key = _module_key
      AND rp.access_level IN ('read','editor','approver')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_module_editor_any(_user_id uuid, _module_key text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    WHERE tm.user_id = _user_id AND rp.module_key = _module_key
      AND rp.access_level IN ('editor','approver')
  )
$$;

-- Widen calendar_events / event_attendees SELECT to include club-wide meeting events.
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (team_id IS NOT NULL AND public.has_team_access(auth.uid(), team_id))
  OR (team_id IS NULL AND EXISTS (
        SELECT 1 FROM public.event_attendees ea
        WHERE ea.event_id = calendar_events.id AND ea.user_id = auth.uid()
      ))
);

DROP POLICY IF EXISTS event_attendees_select ON public.event_attendees;
CREATE POLICY event_attendees_select ON public.event_attendees FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = event_attendees.event_id
      AND (
        (e.team_id IS NOT NULL AND public.has_team_access(auth.uid(), e.team_id))
        OR (e.team_id IS NULL AND EXISTS (
              SELECT 1 FROM public.event_attendees ea2
              WHERE ea2.event_id = e.id AND ea2.user_id = auth.uid()))
      )
  )
);

-- RLS: tasks
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
USING (
  club_id = public.get_user_club_id(auth.uid())
  AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'coordinacion_interna'))
);
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  club_id = public.get_user_club_id(auth.uid())
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
);
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
USING (
  club_id = public.get_user_club_id(auth.uid())
  AND (
    public.is_super_admin(auth.uid())
    OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna')
    OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid())
  )
)
WITH CHECK (club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated
USING (
  club_id = public.get_user_club_id(auth.uid())
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
);

-- RLS: task_assignees
CREATE POLICY task_assignees_select ON public.task_assignees FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignees.task_id
      AND t.club_id = public.get_user_club_id(auth.uid())
      AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'coordinacion_interna'))
  )
);
CREATE POLICY task_assignees_write ON public.task_assignees FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignees.task_id
      AND t.club_id = public.get_user_club_id(auth.uid())
      AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignees.task_id
      AND t.club_id = public.get_user_club_id(auth.uid())
      AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
  )
);

-- RLS: meetings
CREATE POLICY meetings_select ON public.meetings FOR SELECT TO authenticated
USING (
  club_id = public.get_user_club_id(auth.uid())
  AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'coordinacion_interna'))
);
CREATE POLICY meetings_insert ON public.meetings FOR INSERT TO authenticated
WITH CHECK (
  club_id = public.get_user_club_id(auth.uid())
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
);
CREATE POLICY meetings_update ON public.meetings FOR UPDATE TO authenticated
USING (
  club_id = public.get_user_club_id(auth.uid())
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
)
WITH CHECK (club_id = public.get_user_club_id(auth.uid()));
CREATE POLICY meetings_delete ON public.meetings FOR DELETE TO authenticated
USING (
  club_id = public.get_user_club_id(auth.uid())
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
);

-- RLS: meeting_attendees
CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.club_id = public.get_user_club_id(auth.uid())
      AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'coordinacion_interna'))
  )
);
CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.club_id = public.get_user_club_id(auth.uid())
      AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
  )
);
CREATE POLICY meeting_attendees_delete ON public.meeting_attendees FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.club_id = public.get_user_club_id(auth.uid())
      AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna'))
  )
);
CREATE POLICY meeting_attendees_update ON public.meeting_attendees FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.club_id = public.get_user_club_id(auth.uid())
      AND (
        public.is_super_admin(auth.uid())
        OR public.has_module_editor_any(auth.uid(), 'coordinacion_interna')
        OR meeting_attendees.user_id = auth.uid()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.club_id = public.get_user_club_id(auth.uid())
  )
);

-- Triggers: updated_at
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-complete: set completed_at when status flips to completada.
CREATE OR REPLACE FUNCTION public.tasks_touch_completed_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completada' AND (OLD.status IS DISTINCT FROM 'completada') THEN
    NEW.completed_at = now();
  ELSIF NEW.status <> 'completada' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tasks_completed_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tasks_touch_completed_at();

-- Sync meeting → calendar_event (bypasses RLS via SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.sync_meeting_to_calendar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.calendar_events
      (club_id, team_id, event_type, title, starts_at, ends_at, location, description, created_by, meeting_id)
    VALUES
      (NEW.club_id, NULL, 'junta', NEW.title, NEW.starts_at, NEW.ends_at, NEW.location, NEW.agenda, NEW.created_by, NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.calendar_events
    SET title = NEW.title,
        starts_at = NEW.starts_at,
        ends_at = NEW.ends_at,
        location = NEW.location,
        description = NEW.agenda
    WHERE meeting_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_meeting_sync AFTER INSERT OR UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.sync_meeting_to_calendar();

-- Sync meeting_attendees ↔ event_attendees on the linked calendar_event.
CREATE OR REPLACE FUNCTION public.sync_meeting_attendee_to_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM public.calendar_events
  WHERE meeting_id = COALESCE(NEW.meeting_id, OLD.meeting_id) LIMIT 1;
  IF v_event_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.event_attendees (event_id, user_id) VALUES (v_event_id, NEW.user_id)
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.event_attendees WHERE event_id = v_event_id AND user_id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_meeting_attendee_sync AFTER INSERT OR DELETE ON public.meeting_attendees
FOR EACH ROW EXECUTE FUNCTION public.sync_meeting_attendee_to_event();

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_attendees;
