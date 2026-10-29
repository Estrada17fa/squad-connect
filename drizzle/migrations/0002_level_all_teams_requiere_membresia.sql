CREATE OR REPLACE FUNCTION public.level_all_teams(_user_id uuid, _club_id uuid, _module_key text)
RETURNS public.permission_level LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN 'editor_global'::public.permission_level
    WHEN NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.club_id = _club_id) THEN 'sin_acceso'::public.permission_level
    WHEN EXISTS (SELECT 1 FROM public.teams t WHERE t.club_id = _club_id
                 AND NOT EXISTS (SELECT 1 FROM public.team_memberships tm WHERE tm.user_id = _user_id AND tm.team_id = t.id))
      THEN 'sin_acceso'::public.permission_level
    ELSE (SELECT min(public.effective_permission(_user_id, _module_key, t.id))
            FROM public.teams t WHERE t.club_id = _club_id)
  END
$$;