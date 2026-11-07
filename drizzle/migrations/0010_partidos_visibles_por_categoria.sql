DROP POLICY IF EXISTS calendar_events_select_partidos_categoria ON public.calendar_events;
CREATE POLICY calendar_events_select_partidos_categoria ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    event_type = 'partido'::event_type
    AND team_id IS NOT NULL
    AND meeting_id IS NULL AND trip_id IS NULL
    AND public.has_club_access(auth.uid(), club_id)
    AND public.can_view_module(auth.uid(), 'partidos', team_id)
  );

CREATE OR REPLACE FUNCTION public.match_callup_state(_event_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = _event_id AND e.team_id IS NOT NULL
        AND public.has_club_access(auth.uid(), e.club_id)
        AND public.can_view_module(auth.uid(), 'partidos', e.team_id)
    ) THEN NULL
    WHEN NOT EXISTS (
      SELECT 1 FROM public.match_callups c JOIN public.tournament_matches tm ON tm.id = c.match_id
      WHERE tm.calendar_event_id = _event_id
    ) THEN 'pendiente'
    WHEN EXISTS (
      SELECT 1 FROM public.match_callups c JOIN public.tournament_matches tm ON tm.id = c.match_id
      WHERE tm.calendar_event_id = _event_id AND c.user_id = auth.uid()
    ) THEN 'convocado'
    ELSE 'no_convocado'
  END
$$;
REVOKE ALL ON FUNCTION public.match_callup_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_callup_state(uuid) TO authenticated;