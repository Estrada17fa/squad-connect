ALTER TABLE public.match_logistics
  ADD COLUMN IF NOT EXISTS callup_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS lineup_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS formation text;

INSERT INTO public.match_logistics (club_id, match_id, callup_published_at)
SELECT c.club_id, c.match_id, min(c.created_at)
FROM public.match_callups c
WHERE NOT EXISTS (SELECT 1 FROM public.match_logistics l WHERE l.match_id = c.match_id)
GROUP BY c.club_id, c.match_id;

UPDATE public.match_logistics l
SET callup_published_at = coalesce(s.first_at, now())
FROM (SELECT match_id, min(created_at) AS first_at FROM public.match_callups GROUP BY match_id) s
WHERE s.match_id = l.match_id AND l.callup_published_at IS NULL;

CREATE TABLE IF NOT EXISTS public.match_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('titular','suplente')),
  slot text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_lineups TO authenticated;
GRANT ALL ON public.match_lineups TO service_role;
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_match_staff(_user_id uuid, _match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.effective_permission(_user_id, 'partidos', public.match_team_id(_match_id))
         NOT IN ('sin_acceso','vista_jugador')
$$;

CREATE OR REPLACE FUNCTION public.is_match_callup(_user_id uuid, _match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.match_callups c WHERE c.match_id = _match_id AND c.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.match_callup_published(_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.match_logistics l WHERE l.match_id = _match_id AND l.callup_published_at IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION public.match_lineup_published(_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.match_logistics l WHERE l.match_id = _match_id AND l.callup_published_at IS NOT NULL AND l.lineup_published_at IS NOT NULL)
$$;

DROP POLICY IF EXISTS callups_select ON public.match_callups;
CREATE POLICY callups_select ON public.match_callups FOR SELECT TO authenticated USING (
  public.is_match_staff(auth.uid(), match_id)
  OR public.effective_permission(auth.uid(), 'torneo', public.match_team_id(match_id)) NOT IN ('sin_acceso','vista_jugador')
  OR (public.match_callup_published(match_id) AND public.is_match_callup(auth.uid(), match_id))
);

DROP POLICY IF EXISTS match_logistics_select ON public.match_logistics;
CREATE POLICY match_logistics_select ON public.match_logistics FOR SELECT TO authenticated USING (
  public.is_match_staff(auth.uid(), match_id)
  OR (callup_published_at IS NOT NULL AND public.is_match_callup(auth.uid(), match_id))
);

DROP POLICY IF EXISTS match_lineups_select ON public.match_lineups;
CREATE POLICY match_lineups_select ON public.match_lineups FOR SELECT TO authenticated USING (
  public.is_match_staff(auth.uid(), match_id)
  OR (public.match_lineup_published(match_id) AND public.is_match_callup(auth.uid(), match_id))
);
DROP POLICY IF EXISTS match_lineups_insert ON public.match_lineups;
CREATE POLICY match_lineups_insert ON public.match_lineups FOR INSERT TO authenticated
  WITH CHECK (club_id = public.match_club_id(match_id) AND public.can_edit_match_ops(auth.uid(), match_id));
DROP POLICY IF EXISTS match_lineups_update ON public.match_lineups;
CREATE POLICY match_lineups_update ON public.match_lineups FOR UPDATE TO authenticated
  USING (public.can_edit_match_ops(auth.uid(), match_id)) WITH CHECK (public.can_edit_match_ops(auth.uid(), match_id));
DROP POLICY IF EXISTS match_lineups_delete ON public.match_lineups;
CREATE POLICY match_lineups_delete ON public.match_lineups FOR DELETE TO authenticated
  USING (public.can_edit_match_ops(auth.uid(), match_id));

CREATE OR REPLACE FUNCTION public.match_lineups_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_match_callup(NEW.user_id, NEW.match_id) THEN
    RAISE EXCEPTION 'Solo convocados pueden estar en la alineación';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS match_lineups_validate ON public.match_lineups;
CREATE TRIGGER match_lineups_validate BEFORE INSERT OR UPDATE ON public.match_lineups
  FOR EACH ROW EXECUTE FUNCTION public.match_lineups_validate();

CREATE OR REPLACE FUNCTION public.match_rival_name(_match_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(CASE WHEN ht.is_our_team THEN at.name ELSE ht.name END, 'rival')
  FROM public.tournament_matches m
  LEFT JOIN public.tournament_teams ht ON ht.id = m.home_team_id
  LEFT JOIN public.tournament_teams at ON at.id = m.away_team_id
  WHERE m.id = _match_id
$$;

CREATE OR REPLACE FUNCTION public.match_call_label(_match_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'Fuiste convocado vs ' || coalesce(public.match_rival_name(_match_id), 'rival')
    || coalesce(' · Citación ' || to_char(l.call_time_at AT TIME ZONE 'America/Mazatlan', 'HH24:MI'), '')
  FROM (SELECT 1) x LEFT JOIN public.match_logistics l ON l.match_id = _match_id
$$;

CREATE OR REPLACE FUNCTION public.notify_match_callup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.match_callup_published(NEW.match_id) THEN
    PERFORM public.notify_users(NEW.club_id, ARRAY[NEW.user_id], 'partido_convocatoria',
      public.match_call_label(NEW.match_id), public.match_call_label(NEW.match_id), 'partidos', NEW.match_id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_match_uncallup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.match_lineups WHERE match_id = OLD.match_id AND user_id = OLD.user_id;
  IF public.match_callup_published(OLD.match_id) THEN
    PERFORM public.notify_users(OLD.club_id, ARRAY[OLD.user_id], 'partido_convocatoria',
      'Ya no estás convocado para vs ' || coalesce(public.match_rival_name(OLD.match_id), 'rival'),
      'Ya no estás convocado para vs ' || coalesce(public.match_rival_name(OLD.match_id), 'rival'),
      'partidos', OLD.match_id);
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS match_callups_notify_delete ON public.match_callups;
CREATE TRIGGER match_callups_notify_delete AFTER DELETE ON public.match_callups
  FOR EACH ROW EXECUTE FUNCTION public.notify_match_uncallup();

CREATE OR REPLACE FUNCTION public.notify_match_logistics_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_targets uuid[]; v_rival text;
BEGIN
  SELECT array_agg(c.user_id) INTO v_targets FROM public.match_callups c WHERE c.match_id = NEW.match_id;
  IF v_targets IS NULL THEN RETURN NEW; END IF;
  v_rival := coalesce(public.match_rival_name(NEW.match_id), 'rival');

  IF NEW.callup_published_at IS NOT NULL AND OLD.callup_published_at IS NULL THEN
    PERFORM public.notify_users(NEW.club_id, v_targets, 'partido_convocatoria',
      public.match_call_label(NEW.match_id), public.match_call_label(NEW.match_id), 'partidos', NEW.match_id);
  ELSIF NEW.callup_published_at IS NOT NULL AND (
      NEW.call_time_at IS DISTINCT FROM OLD.call_time_at
      OR NEW.meeting_location_id IS DISTINCT FROM OLD.meeting_location_id
      OR NEW.meeting_point IS DISTINCT FROM OLD.meeting_point) THEN
    PERFORM public.notify_users(NEW.club_id, v_targets, 'partido_logistica',
      'Cambió tu citación vs ' || v_rival,
      'Cambió tu citación vs ' || v_rival || coalesce(' · ' || to_char(NEW.call_time_at AT TIME ZONE 'America/Mazatlan', 'HH24:MI'), ''),
      'partidos', NEW.match_id);
  END IF;

  IF NEW.callup_published_at IS NOT NULL AND NEW.lineup_published_at IS NOT NULL AND OLD.lineup_published_at IS NULL THEN
    PERFORM public.notify_users(NEW.club_id, v_targets, 'partido_alineacion',
      'Ya está la alineación vs ' || v_rival, 'Ya está la alineación vs ' || v_rival, 'partidos', NEW.match_id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_match_status(_match_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; l record; lu record; v_count int; v_uid uuid := auth.uid();
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
    SELECT role, slot INTO lu FROM public.match_lineups WHERE match_id = m.id AND user_id = v_uid;
  END IF;
  RETURN jsonb_build_object('state','convocado','match_id',m.id,
    'call_time_at', l.call_time_at, 'meeting_location_id', l.meeting_location_id,
    'meeting_point', l.meeting_point, 'kit', l.kit, 'notes', l.logistics_notes,
    'callup_count', v_count, 'lineup_published', l.lineup_published_at IS NOT NULL,
    'formation', l.formation,
    'lineup_role', CASE WHEN l.lineup_published_at IS NOT NULL THEN coalesce(lu.role,'suplente') END,
    'lineup_slot', lu.slot);
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_match_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_match_callup_list(_match_id uuid)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, player_position text, jersey_number integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.user_id, p.full_name, p.avatar_url,
         coalesce(pp.position::text, p.position::text), coalesce(pp.jersey_number::int, p.jersey_number::int)
  FROM public.match_callups c
  JOIN public.profiles p ON p.id = c.user_id
  LEFT JOIN public.player_profiles pp ON pp.id = c.player_profile_id
  WHERE c.match_id = _match_id
    AND (public.is_match_staff(auth.uid(), _match_id)
         OR (public.match_callup_published(_match_id) AND public.is_match_callup(auth.uid(), _match_id)))
  ORDER BY 5 NULLS LAST, 2
$$;
GRANT EXECUTE ON FUNCTION public.get_match_callup_list(uuid) TO authenticated;

COMMENT ON FUNCTION public.match_callup_state(uuid) IS 'DEPRECATED: replaced by get_my_match_status';