CREATE OR REPLACE FUNCTION public.can_view_event_new(_user_id uuid, _event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = _event_id
      AND (
        EXISTS (SELECT 1 FROM public.event_attendees ea
                WHERE ea.event_id = e.id AND ea.user_id = _user_id)
        OR CASE WHEN e.team_id IS NULL
             THEN public.has_club_access(_user_id, e.club_id)
                  AND public.max_permission_any_team(_user_id, 'agenda') <> 'sin_acceso'
             ELSE public.can_view_module(_user_id, 'agenda', e.team_id)
           END
      )
  )
$$;

DROP POLICY IF EXISTS event_attendees_select ON public.event_attendees;
CREATE POLICY event_attendees_select ON public.event_attendees FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_view_event_new(auth.uid(), event_id));