-- Niveles de categoría se amplían a todo el club cuando la persona tiene membresía "Todo el club".
CREATE OR REPLACE FUNCTION public.effective_permission(_user_id uuid, _module_key text, _team_id uuid)
 RETURNS permission_level
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id AND p.status = 'baja'::public.member_status
    ) THEN 'sin_acceso'::public.permission_level
    WHEN public.is_super_admin(_user_id) THEN 'editor_global'::public.permission_level
    WHEN _team_id IS NOT NULL AND NOT public.has_club_access(
           _user_id, (SELECT t.club_id FROM public.teams t WHERE t.id = _team_id))
      THEN 'sin_acceso'::public.permission_level
    ELSE GREATEST(
      COALESCE(
        (SELECT o.level FROM public.user_permission_overrides o
          WHERE o.user_id = _user_id AND o.module_key = _module_key
            AND _team_id IS NOT NULL AND o.team_id = _team_id LIMIT 1),
        (SELECT o.level FROM public.user_permission_overrides o
          WHERE o.user_id = _user_id AND o.module_key = _module_key AND o.team_id IS NULL LIMIT 1),
        (SELECT max(rp.level) FROM public.team_memberships tm
          JOIN public.role_permissions rp ON rp.role_id = tm.role_id AND rp.module_key = _module_key
          WHERE tm.user_id = _user_id
            AND (tm.team_id IS NULL OR _team_id IS NULL OR tm.team_id = _team_id)),
        'sin_acceso'::public.permission_level
      ),
      COALESCE((
        SELECT max(lvl) FROM (
          SELECT rp.level AS lvl FROM public.team_memberships tm
            JOIN public.role_permissions rp ON rp.role_id = tm.role_id AND rp.module_key = _module_key
            WHERE tm.user_id = _user_id
          UNION ALL
          SELECT o.level FROM public.user_permission_overrides o
            WHERE o.user_id = _user_id AND o.module_key = _module_key
              AND o.team_id IS NULL
        ) s WHERE lvl IN ('lector_global','editor_global')
      ), 'sin_acceso'::public.permission_level)
    )
  END AS l
  ),
  club_wide AS (
    SELECT EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = _user_id AND tm.team_id IS NULL
    ) AS cw
  )
  SELECT CASE
    WHEN (SELECT cw FROM club_wide) AND (SELECT l FROM base) = 'editor_categoria' THEN 'editor_global'::public.permission_level
    WHEN (SELECT cw FROM club_wide) AND (SELECT l FROM base) = 'lector_categoria' THEN 'lector_global'::public.permission_level
    ELSE (SELECT l FROM base)
  END
$function$;

-- Solicitudes "Todo el club" de otras personas: solo se editan con alcance de todo el club.
CREATE OR REPLACE FUNCTION public.request_scope_ok(_user_id uuid, _team_id uuid, _min_edit boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH lvl AS (
    SELECT public.effective_permission(_user_id, 'solicitudes', _team_id) AS l
  )
  SELECT CASE
    WHEN (SELECT l FROM lvl) = 'editor_global' THEN true
    WHEN (SELECT l FROM lvl) = 'lector_global' THEN NOT _min_edit
    WHEN (SELECT l FROM lvl) = 'editor_categoria'
      THEN (_team_id IS NULL AND NOT _min_edit) OR (_team_id IS NOT NULL AND public.has_team_scope(_user_id, _team_id))
    WHEN (SELECT l FROM lvl) = 'lector_categoria'
      THEN (NOT _min_edit) AND (_team_id IS NULL OR public.has_team_scope(_user_id, _team_id))
    ELSE false
  END
$function$;