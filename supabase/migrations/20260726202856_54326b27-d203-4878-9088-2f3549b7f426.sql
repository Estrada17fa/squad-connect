
CREATE INDEX IF NOT EXISTS team_memberships_user_id_idx ON public.team_memberships(user_id);
CREATE INDEX IF NOT EXISTS team_memberships_user_team_idx ON public.team_memberships(user_id, team_id);
CREATE INDEX IF NOT EXISTS team_memberships_role_id_idx ON public.team_memberships(role_id);
CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS profiles_club_id_idx ON public.profiles(club_id);
CREATE INDEX IF NOT EXISTS roles_club_id_idx ON public.roles(club_id);
CREATE INDEX IF NOT EXISTS teams_club_id_idx ON public.teams(club_id);
CREATE INDEX IF NOT EXISTS super_admins_user_id_idx ON public.super_admins(user_id);
CREATE INDEX IF NOT EXISTS user_perm_over_user_id_idx ON public.user_permission_overrides(user_id);
