
-- 1. Funciones auxiliares
CREATE OR REPLACE FUNCTION public.is_player_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    WHERE tm.user_id = _user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.roles r ON r.id = tm.role_id
    WHERE tm.user_id = _user_id
      AND COALESCE(r.base_role, lower(r.name)) <> 'jugador'
  )
  AND NOT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.user_sees_all_club(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR (
        public.get_user_club_id(_user_id) = _club_id
        AND NOT public.is_player_only(_user_id)
      );
$$;

-- 2. Migrar membresías de no-jugadores a club-wide (team_id = NULL), deduplicando
--    Insertar la contraparte club-wide para cada membresía no-jugador con team_id.
INSERT INTO public.team_memberships (user_id, team_id, role_id, job_title)
SELECT DISTINCT tm.user_id, NULL::uuid, tm.role_id, MAX(tm.job_title)
FROM public.team_memberships tm
JOIN public.roles r ON r.id = tm.role_id
WHERE tm.team_id IS NOT NULL
  AND COALESCE(r.base_role, lower(r.name)) <> 'jugador'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_memberships tm2
    WHERE tm2.user_id = tm.user_id
      AND tm2.role_id = tm.role_id
      AND tm2.team_id IS NULL
  )
GROUP BY tm.user_id, tm.role_id;

-- Eliminar las membresías originales de no-jugadores con team_id
DELETE FROM public.team_memberships tm
USING public.roles r
WHERE r.id = tm.role_id
  AND tm.team_id IS NOT NULL
  AND COALESCE(r.base_role, lower(r.name)) <> 'jugador';

-- 3. Actualizar políticas SELECT

-- player_profiles: no-jugadores del club ven todo; jugadores solo su team
DROP POLICY IF EXISTS player_profiles_select ON public.player_profiles;
CREATE POLICY player_profiles_select ON public.player_profiles
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = player_profiles.team_id
      AND public.user_sees_all_club(auth.uid(), t.club_id)
  )
  OR public.has_team_scope(auth.uid(), player_profiles.team_id)
);

-- calendar_events: no-jugadores del club ven todo; jugadores mantienen regla previa
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR public.user_sees_all_club(auth.uid(), calendar_events.club_id)
  OR (team_id IS NOT NULL AND public.has_team_access(auth.uid(), team_id))
  OR (team_id IS NULL AND EXISTS (
    SELECT 1 FROM public.event_attendees ea
    WHERE ea.event_id = calendar_events.id AND ea.user_id = auth.uid()
  ))
);
