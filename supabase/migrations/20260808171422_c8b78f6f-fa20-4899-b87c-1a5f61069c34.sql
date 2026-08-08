CREATE OR REPLACE FUNCTION public.effective_permission(_user_id uuid, _module_key text, _team_id uuid)
 RETURNS permission_level
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        ) s WHERE lvl IN ('lector_global','editor_global')
      ), 'sin_acceso'::public.permission_level)
    )
  END
$function$;