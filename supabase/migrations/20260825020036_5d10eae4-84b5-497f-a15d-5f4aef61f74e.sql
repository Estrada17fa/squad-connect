CREATE OR REPLACE FUNCTION public.is_event_attendee(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_attendees ea
    WHERE ea.event_id = _event_id AND ea.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.event_is_medical(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = _event_id AND e.event_type = 'medico'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_event_attendee(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.event_is_medical(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_event_attendee(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.event_is_medical(uuid) TO authenticated;

DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events
FOR SELECT TO authenticated
USING (
  has_club_access(auth.uid(), club_id) AND CASE
    WHEN event_type = 'medico' THEN EXISTS (
      SELECT 1 FROM public.medical_appointments ma
      WHERE ma.event_id = calendar_events.id
        AND (ma.player_user_id = auth.uid() OR can_access_health(auth.uid(), ma.team_id))
    )
    WHEN meeting_id IS NOT NULL THEN can_view_meeting(auth.uid(), meeting_id)
    WHEN trip_id IS NOT NULL THEN can_view_trip_new(auth.uid(), trip_id)
    WHEN event_type = 'partido' THEN (
      EXISTS (
        SELECT 1 FROM public.tournament_matches tm
        WHERE tm.calendar_event_id = calendar_events.id AND can_view_match_ops(auth.uid(), tm.id)
      )
      OR (
        NOT EXISTS (SELECT 1 FROM public.tournament_matches tm2 WHERE tm2.calendar_event_id = calendar_events.id)
        AND team_id IS NOT NULL
        AND can_view_module(auth.uid(), 'agenda', team_id)
      )
    )
    WHEN event_type = 'entrenamiento' THEN (team_id IS NOT NULL AND can_view_training(auth.uid(), team_id))
    WHEN event_type = 'viaje' THEN (team_id IS NOT NULL AND can_view_module(auth.uid(), 'viajes', team_id))
    ELSE (
      public.is_event_attendee(auth.uid(), calendar_events.id)
      OR CASE
        WHEN team_id IS NULL THEN max_permission_any_team(auth.uid(), 'agenda') <> 'sin_acceso'
        ELSE can_view_module(auth.uid(), 'agenda', team_id)
      END
    )
  END
);

DROP POLICY IF EXISTS event_attendees_select ON public.event_attendees;
CREATE POLICY event_attendees_select ON public.event_attendees
FOR SELECT TO authenticated
USING (
  can_view_event_new(auth.uid(), event_id)
  AND (
    user_id = auth.uid()
    OR NOT public.event_is_medical(event_attendees.event_id)
    OR EXISTS (
      SELECT 1 FROM public.medical_appointments ma
      WHERE ma.event_id = event_attendees.event_id AND can_access_health(auth.uid(), ma.team_id)
    )
  )
);