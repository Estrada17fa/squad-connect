CREATE OR REPLACE FUNCTION public.get_my_match_status(_match_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; l record; v_role text; v_slot text; v_count int; v_uid uuid := auth.uid();
BEGIN
  SELECT tm.* INTO m FROM public.tournament_matches tm
   WHERE tm.id = _match_id OR tm.calendar_event_id = _match_id LIMIT 1;
  IF m.id IS NULL OR v_uid IS NULL OR NOT public.has_club_access(v_uid, m.club_id)
     OR public.effective_permission(v_uid, 'partidos', public.match_team_id(m.id)) = 'sin_acceso' THEN
    RETURN NULL;
  END IF;
  SELECT * INTO l FROM public.match_logistics WHERE match_id = m.id;
  IF l.id IS NULL OR l.callup_published_at IS NULL THEN
    RETURN jsonb_build_object('state','pendiente','match_id',m.id);
  END IF;
  IF NOT public.is_match_callup(v_uid, m.id) THEN
    RETURN jsonb_build_object('state','no_convocado','match_id',m.id);
  END IF;
  SELECT count(*) INTO v_count FROM public.match_callups WHERE match_id = m.id;
  IF l.lineup_published_at IS NOT NULL THEN
    SELECT role, slot INTO v_role, v_slot FROM public.match_lineups WHERE match_id = m.id AND user_id = v_uid;
    v_role := coalesce(v_role, 'suplente');
  END IF;
  RETURN jsonb_build_object('state','convocado','match_id',m.id,
    'call_time_at', l.call_time_at, 'meeting_location_id', l.meeting_location_id,
    'meeting_point', l.meeting_point, 'kit', l.kit, 'notes', l.logistics_notes,
    'callup_count', v_count, 'lineup_published', l.lineup_published_at IS NOT NULL,
    'formation', l.formation, 'lineup_role', v_role, 'lineup_slot', v_slot);
END $$;