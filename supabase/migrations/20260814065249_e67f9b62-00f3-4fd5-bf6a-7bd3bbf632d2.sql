-- Team (categoría) del partido, vía el torneo
CREATE OR REPLACE FUNCTION public.match_team_id(_match_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.team_id
  FROM public.tournament_matches m
  JOIN public.tournaments t ON t.id = m.tournament_id
  WHERE m.id = _match_id
$$;

CREATE OR REPLACE FUNCTION public.match_club_id(_match_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.club_id FROM public.tournament_matches m WHERE m.id = _match_id
$$;

CREATE OR REPLACE FUNCTION public.can_edit_match_ops(_user_id uuid, _match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.can_edit_module(_user_id, 'partidos', public.match_team_id(_match_id))
$$;

-- Convocatoria
CREATE TABLE public.match_callups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_profile_id uuid REFERENCES public.player_profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);
CREATE INDEX idx_match_callups_match ON public.match_callups(match_id);
CREATE INDEX idx_match_callups_user ON public.match_callups(user_id);

-- ¿El usuario ve el partido en el módulo 'partidos'? (vista_jugador => solo si está convocado)
CREATE OR REPLACE FUNCTION public.can_view_match_ops(_user_id uuid, _match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.effective_permission(_user_id, 'partidos', public.match_team_id(_match_id)) = 'sin_acceso'
      THEN false
    WHEN public.effective_permission(_user_id, 'partidos', public.match_team_id(_match_id)) = 'vista_jugador'
      THEN EXISTS (
        SELECT 1 FROM public.match_callups c
        WHERE c.match_id = _match_id AND c.user_id = _user_id
      )
    ELSE true
  END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_callups TO authenticated;
GRANT ALL ON public.match_callups TO service_role;
ALTER TABLE public.match_callups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "callups_select" ON public.match_callups
FOR SELECT TO authenticated
USING (
  public.can_view_match_ops(auth.uid(), match_id)
  OR public.can_view_module(auth.uid(), 'torneo', public.match_team_id(match_id))
  OR user_id = auth.uid()
);

CREATE POLICY "callups_insert" ON public.match_callups
FOR INSERT TO authenticated
WITH CHECK (
  club_id = public.match_club_id(match_id)
  AND public.can_edit_match_ops(auth.uid(), match_id)
);

CREATE POLICY "callups_update" ON public.match_callups
FOR UPDATE TO authenticated
USING (public.can_edit_match_ops(auth.uid(), match_id))
WITH CHECK (public.can_edit_match_ops(auth.uid(), match_id));

CREATE POLICY "callups_delete" ON public.match_callups
FOR DELETE TO authenticated
USING (public.can_edit_match_ops(auth.uid(), match_id));

-- Logística
CREATE TABLE public.match_logistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  match_id uuid NOT NULL UNIQUE REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  call_time_at timestamptz,
  meeting_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  meeting_point text,
  kit text,
  logistics_notes text,
  post_match_notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_match_logistics_match ON public.match_logistics(match_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_logistics TO authenticated;
GRANT ALL ON public.match_logistics TO service_role;
ALTER TABLE public.match_logistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_logistics_select" ON public.match_logistics
FOR SELECT TO authenticated
USING (public.can_view_match_ops(auth.uid(), match_id));

CREATE POLICY "match_logistics_insert" ON public.match_logistics
FOR INSERT TO authenticated
WITH CHECK (
  club_id = public.match_club_id(match_id)
  AND public.can_edit_match_ops(auth.uid(), match_id)
);

CREATE POLICY "match_logistics_update" ON public.match_logistics
FOR UPDATE TO authenticated
USING (public.can_edit_match_ops(auth.uid(), match_id))
WITH CHECK (public.can_edit_match_ops(auth.uid(), match_id));

CREATE POLICY "match_logistics_delete" ON public.match_logistics
FOR DELETE TO authenticated
USING (public.can_edit_match_ops(auth.uid(), match_id));

CREATE TRIGGER match_logistics_set_updated_at
BEFORE UPDATE ON public.match_logistics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Texto descriptivo del partido para las notificaciones
CREATE OR REPLACE FUNCTION public.match_notify_label(_match_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    'vs ' || coalesce(
      CASE WHEN ht.is_our_team THEN at.name ELSE ht.name END, 'rival'
    )
    || coalesce(' el ' || to_char(m.kickoff_at AT TIME ZONE 'America/Mazatlan', 'DD/MM/YYYY HH24:MI'), '')
  FROM public.tournament_matches m
  LEFT JOIN public.tournament_teams ht ON ht.id = m.home_team_id
  LEFT JOIN public.tournament_teams at ON at.id = m.away_team_id
  WHERE m.id = _match_id
$$;

-- Aviso al convocar
CREATE OR REPLACE FUNCTION public.notify_match_callup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    PERFORM public.notify_users(
      NEW.club_id,
      ARRAY[NEW.user_id],
      'partido_convocatoria',
      'Fuiste convocado a un partido',
      'Fuiste convocado al partido ' || coalesce(public.match_notify_label(NEW.match_id), ''),
      'partidos',
      NEW.match_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER match_callups_notify
AFTER INSERT ON public.match_callups
FOR EACH ROW EXECUTE FUNCTION public.notify_match_callup();

-- Aviso al cambiar citación o punto de reunión
CREATE OR REPLACE FUNCTION public.notify_match_logistics_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_targets uuid[];
BEGIN
  IF NEW.call_time_at IS NOT DISTINCT FROM OLD.call_time_at
     AND NEW.meeting_location_id IS NOT DISTINCT FROM OLD.meeting_location_id
     AND NEW.meeting_point IS NOT DISTINCT FROM OLD.meeting_point THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(c.user_id) INTO v_targets
  FROM public.match_callups c
  WHERE c.match_id = NEW.match_id AND c.user_id IS DISTINCT FROM auth.uid();

  IF v_targets IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    NEW.club_id,
    v_targets,
    'partido_logistica',
    'Cambió la logística del partido',
    'Cambió la citación o el punto de reunión del partido ' || coalesce(public.match_notify_label(NEW.match_id), ''),
    'partidos',
    NEW.match_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER match_logistics_notify
AFTER UPDATE ON public.match_logistics
FOR EACH ROW EXECUTE FUNCTION public.notify_match_logistics_change();