CREATE OR REPLACE FUNCTION public.get_my_access(p_club_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_super boolean;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  v_super := public.is_super_admin(v_uid);

  IF NOT v_super AND NOT (
    public.has_club_access(v_uid, p_club_id)
    AND EXISTS (
      SELECT 1 FROM team_memberships tm
      JOIN roles r ON r.id = tm.role_id
      WHERE tm.user_id = v_uid AND r.club_id = p_club_id
    )
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH modules AS (
    SELECT rp.module_key AS m
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
     WHERE r.club_id = p_club_id
    UNION
    SELECT o.module_key
      FROM user_permission_overrides o
     WHERE o.user_id = v_uid
  ),
  team_levels AS (
    SELECT t.id AS team_id, mo.m,
           public.effective_permission(v_uid, mo.m, t.id) AS lvl
      FROM teams t
      CROSS JOIN modules mo
     WHERE t.club_id = p_club_id
  ),
  per_team AS (
    SELECT team_id,
           jsonb_object_agg(m, lvl) AS levels,
           bool_or(lvl <> 'sin_acceso'::permission_level) AS any_access
      FROM team_levels
     GROUP BY team_id
  ),
  club_levels AS (
    SELECT jsonb_object_agg(m, public.effective_permission(v_uid, m, NULL)) AS levels
      FROM modules
  )
  SELECT jsonb_build_object(
    'is_super_admin', v_super,
    'club_levels', COALESCE((SELECT levels FROM club_levels), '{}'::jsonb),
    'teams', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', t.id, 'name', t.name, 'category', t.category,
               'display_order', t.display_order, 'is_primary', t.is_primary,
               'levels', pt.levels)
             ORDER BY t.is_primary DESC, t.display_order, t.name)
        FROM per_team pt
        JOIN teams t ON t.id = pt.team_id
       WHERE pt.any_access
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_access(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access(uuid) TO authenticated;