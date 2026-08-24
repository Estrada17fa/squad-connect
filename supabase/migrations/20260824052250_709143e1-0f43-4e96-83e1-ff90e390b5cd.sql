CREATE OR REPLACE FUNCTION public.can_view_event_new(_user_id uuid, _event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = _event_id
      AND public.has_club_access(_user_id, e.club_id)
      AND CASE
        WHEN e.event_type = 'medico' THEN EXISTS (
          SELECT 1 FROM public.medical_appointments ma
          WHERE ma.event_id = e.id
            AND (ma.player_user_id = _user_id OR public.can_access_health(_user_id, ma.team_id))
        )
        WHEN e.meeting_id IS NOT NULL THEN public.can_view_meeting(_user_id, e.meeting_id)
        WHEN e.trip_id IS NOT NULL THEN public.can_view_trip_new(_user_id, e.trip_id)
        WHEN e.event_type = 'partido' THEN (
          EXISTS (
            SELECT 1 FROM public.tournament_matches tm
            WHERE tm.calendar_event_id = e.id AND public.can_view_match_ops(_user_id, tm.id)
          )
          OR (
            NOT EXISTS (SELECT 1 FROM public.tournament_matches tm2 WHERE tm2.calendar_event_id = e.id)
            AND e.team_id IS NOT NULL
            AND public.can_view_module(_user_id, 'agenda', e.team_id)
          )
        )
        WHEN e.event_type = 'entrenamiento' THEN (e.team_id IS NOT NULL AND public.can_view_training(_user_id, e.team_id))
        WHEN e.event_type = 'viaje' THEN (e.team_id IS NOT NULL AND public.can_view_module(_user_id, 'viajes', e.team_id))
        ELSE (
          EXISTS (SELECT 1 FROM public.event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = _user_id)
          OR CASE WHEN e.team_id IS NULL
               THEN public.max_permission_any_team(_user_id, 'agenda') <> 'sin_acceso'
               ELSE public.can_view_module(_user_id, 'agenda', e.team_id)
             END
        )
      END
  )
$function$;

DROP POLICY IF EXISTS event_attendees_select ON public.event_attendees;
CREATE POLICY event_attendees_select ON public.event_attendees
FOR SELECT TO authenticated
USING (
  public.can_view_event_new(auth.uid(), event_id)
  AND (
    user_id = auth.uid()
    OR NOT EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_attendees.event_id AND e.event_type = 'medico'
    )
    OR EXISTS (
      SELECT 1 FROM public.medical_appointments ma
      WHERE ma.event_id = event_attendees.event_id
        AND public.can_access_health(auth.uid(), ma.team_id)
    )
  )
);