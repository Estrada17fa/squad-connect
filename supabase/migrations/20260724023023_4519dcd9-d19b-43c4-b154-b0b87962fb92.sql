
REVOKE EXECUTE ON FUNCTION public.is_super_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_club_id(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_team_access(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_club_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_team_access(UUID, UUID) TO authenticated;
