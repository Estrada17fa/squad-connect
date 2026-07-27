
-- 1) Fix recursion: replace event_attendees_select using a SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.has_event_access(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = _event_id
      AND (
        public.is_super_admin(_user_id)
        OR public.user_sees_all_club(_user_id, e.club_id)
        OR (e.team_id IS NOT NULL AND public.has_team_access(_user_id, e.team_id))
      )
  )
$$;

DROP POLICY IF EXISTS event_attendees_select ON public.event_attendees;
CREATE POLICY event_attendees_select ON public.event_attendees
FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR user_id = auth.uid()
  OR public.has_event_access(auth.uid(), event_id)
);

-- Also rewrite calendar_events_select to avoid the reverse recursion path
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events
FOR SELECT USING (
  public.is_super_admin(auth.uid())
  OR public.user_sees_all_club(auth.uid(), club_id)
  OR (team_id IS NOT NULL AND public.has_team_access(auth.uid(), team_id))
  OR EXISTS (
    SELECT 1 FROM public.event_attendees ea
    WHERE ea.event_id = calendar_events.id AND ea.user_id = auth.uid()
  )
);

-- 2) Add image_path column for inventory items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS image_path text;
