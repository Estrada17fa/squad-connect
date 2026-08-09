-- 1. Alcance por categoría
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_club_due_idx ON public.tasks (club_id, due_at);
CREATE INDEX IF NOT EXISTS tasks_team_idx ON public.tasks (team_id);
CREATE INDEX IF NOT EXISTS meetings_team_idx ON public.meetings (team_id);

-- 2. Prioridad urgente
ALTER TYPE public.task_priority ADD VALUE IF NOT EXISTS 'urgente';

-- 3. Función de alcance (misma forma que solicitudes)
CREATE OR REPLACE FUNCTION public.coord_scope_ok(_user_id uuid, _team_id uuid, _min_edit boolean)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH lvl AS (
    SELECT public.effective_permission(_user_id, 'coordinacion_interna', _team_id) AS l
  )
  SELECT CASE
    WHEN (SELECT l FROM lvl) = 'editor_global' THEN true
    WHEN (SELECT l FROM lvl) = 'lector_global' THEN NOT _min_edit
    WHEN (SELECT l FROM lvl) = 'editor_categoria'
      THEN (_team_id IS NULL OR public.has_team_scope(_user_id, _team_id))
    WHEN (SELECT l FROM lvl) = 'lector_categoria'
      THEN (NOT _min_edit) AND (_team_id IS NULL OR public.has_team_scope(_user_id, _team_id))
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.is_task_assignee(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = _task_id AND ta.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_attendee(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.meeting_attendees ma WHERE ma.meeting_id = _meeting_id AND ma.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_view_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = _task_id
      AND (public.coord_scope_ok(_user_id, t.team_id, false) OR public.is_task_assignee(_user_id, t.id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = _task_id AND public.coord_scope_ok(_user_id, t.team_id, true)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_meeting(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = _meeting_id
      AND (public.coord_scope_ok(_user_id, m.team_id, false) OR public.is_meeting_attendee(_user_id, m.id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_meeting(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = _meeting_id AND public.coord_scope_ok(_user_id, m.team_id, true)
  )
$$;

-- 4. Checklist de tareas
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_checklist_task_idx ON public.task_checklist_items (task_id, order_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_checklist_items TO authenticated;
GRANT ALL ON public.task_checklist_items TO service_role;

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS task_checklist_items_touch ON public.task_checklist_items;
CREATE TRIGGER task_checklist_items_touch
BEFORE UPDATE ON public.task_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS task_checklist_select ON public.task_checklist_items;
CREATE POLICY task_checklist_select ON public.task_checklist_items
FOR SELECT TO authenticated
USING (public.can_view_task(auth.uid(), task_id));

DROP POLICY IF EXISTS task_checklist_insert ON public.task_checklist_items;
CREATE POLICY task_checklist_insert ON public.task_checklist_items
FOR INSERT TO authenticated
WITH CHECK (public.can_edit_task(auth.uid(), task_id) OR public.is_task_assignee(auth.uid(), task_id));

DROP POLICY IF EXISTS task_checklist_update ON public.task_checklist_items;
CREATE POLICY task_checklist_update ON public.task_checklist_items
FOR UPDATE TO authenticated
USING (public.can_edit_task(auth.uid(), task_id) OR public.is_task_assignee(auth.uid(), task_id))
WITH CHECK (public.can_edit_task(auth.uid(), task_id) OR public.is_task_assignee(auth.uid(), task_id));

DROP POLICY IF EXISTS task_checklist_delete ON public.task_checklist_items;
CREATE POLICY task_checklist_delete ON public.task_checklist_items
FOR DELETE TO authenticated
USING (public.can_edit_task(auth.uid(), task_id) OR public.is_task_assignee(auth.uid(), task_id));

-- 5. RLS de tareas a los 6 niveles
DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks
FOR SELECT TO authenticated
USING (public.coord_scope_ok(auth.uid(), team_id, false) OR public.is_task_assignee(auth.uid(), id));

DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (club_id = public.get_user_club_id(auth.uid()) AND public.coord_scope_ok(auth.uid(), team_id, true));

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks
FOR UPDATE TO authenticated
USING (public.coord_scope_ok(auth.uid(), team_id, true) OR public.is_task_assignee(auth.uid(), id))
WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks
FOR DELETE TO authenticated
USING (public.coord_scope_ok(auth.uid(), team_id, true));

DROP POLICY IF EXISTS task_assignees_select ON public.task_assignees;
CREATE POLICY task_assignees_select ON public.task_assignees
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_view_task(auth.uid(), task_id));

DROP POLICY IF EXISTS task_assignees_write ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_insert ON public.task_assignees;
CREATE POLICY task_assignees_insert ON public.task_assignees
FOR INSERT TO authenticated
WITH CHECK (public.can_edit_task(auth.uid(), task_id));

DROP POLICY IF EXISTS task_assignees_delete ON public.task_assignees;
CREATE POLICY task_assignees_delete ON public.task_assignees
FOR DELETE TO authenticated
USING (public.can_edit_task(auth.uid(), task_id));

-- 6. RLS de juntas a los 6 niveles
DROP POLICY IF EXISTS meetings_select ON public.meetings;
CREATE POLICY meetings_select ON public.meetings
FOR SELECT TO authenticated
USING (public.coord_scope_ok(auth.uid(), team_id, false) OR public.is_meeting_attendee(auth.uid(), id));

DROP POLICY IF EXISTS meetings_insert ON public.meetings;
CREATE POLICY meetings_insert ON public.meetings
FOR INSERT TO authenticated
WITH CHECK (club_id = public.get_user_club_id(auth.uid()) AND public.coord_scope_ok(auth.uid(), team_id, true));

DROP POLICY IF EXISTS meetings_update ON public.meetings;
CREATE POLICY meetings_update ON public.meetings
FOR UPDATE TO authenticated
USING (public.coord_scope_ok(auth.uid(), team_id, true))
WITH CHECK (club_id = public.get_user_club_id(auth.uid()));

DROP POLICY IF EXISTS meetings_delete ON public.meetings;
CREATE POLICY meetings_delete ON public.meetings
FOR DELETE TO authenticated
USING (public.coord_scope_ok(auth.uid(), team_id, true));

DROP POLICY IF EXISTS meeting_attendees_select ON public.meeting_attendees;
CREATE POLICY meeting_attendees_select ON public.meeting_attendees
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_view_meeting(auth.uid(), meeting_id));

DROP POLICY IF EXISTS meeting_attendees_insert ON public.meeting_attendees;
CREATE POLICY meeting_attendees_insert ON public.meeting_attendees
FOR INSERT TO authenticated
WITH CHECK (public.can_edit_meeting(auth.uid(), meeting_id));

DROP POLICY IF EXISTS meeting_attendees_update ON public.meeting_attendees;
CREATE POLICY meeting_attendees_update ON public.meeting_attendees
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.can_edit_meeting(auth.uid(), meeting_id))
WITH CHECK (user_id = auth.uid() OR public.can_edit_meeting(auth.uid(), meeting_id));

DROP POLICY IF EXISTS meeting_attendees_delete ON public.meeting_attendees;
CREATE POLICY meeting_attendees_delete ON public.meeting_attendees
FOR DELETE TO authenticated
USING (public.can_edit_meeting(auth.uid(), meeting_id));

-- 7. El evento espejo hereda la categoría de la junta
CREATE OR REPLACE FUNCTION public.sync_meeting_to_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.calendar_events
      (club_id, team_id, event_type, title, starts_at, ends_at, location, location_id, description, created_by, meeting_id)
    VALUES
      (NEW.club_id, NEW.team_id, 'junta', NEW.title, NEW.starts_at, NEW.ends_at, NEW.location, NEW.location_id, NEW.agenda, NEW.created_by, NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.calendar_events
    SET title = NEW.title,
        team_id = NEW.team_id,
        starts_at = NEW.starts_at,
        ends_at = NEW.ends_at,
        location = NEW.location,
        location_id = NEW.location_id,
        description = NEW.agenda
    WHERE meeting_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;