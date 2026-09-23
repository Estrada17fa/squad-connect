
-- 1) Un nivel global asignado a UNA categoría ya no escala a todo el club:
--    solo los niveles globales del rol o de una excepción club-wide lo hacen.
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
              AND o.team_id IS NULL
        ) s WHERE lvl IN ('lector_global','editor_global')
      ), 'sin_acceso'::public.permission_level)
    )
  END
$function$;

-- 2) Las comprobaciones "any" pasan a la escala nueva (ya no leen access_level).
CREATE OR REPLACE FUNCTION public.has_module_editor_any(_user_id uuid, _module_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.effective_permission(_user_id, _module_key, NULL)
         IN ('editor_categoria','editor_global')
$function$;

CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.effective_permission(_user_id, _module_key, NULL) <> 'sin_acceso'
$function$;

CREATE OR REPLACE FUNCTION public.has_module_editor(_user_id uuid, _team_id uuid, _module_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.can_edit_module(_user_id, _module_key, _team_id)
$function$;

-- 3) Administrar el club (usuarios, roles, categorías, membresías, permisos)
--    exige Editor GLOBAL del módulo usuarios.
CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_super_admin(_user_id)
      OR public.effective_permission(_user_id, 'usuarios', NULL) = 'editor_global'
$function$;

CREATE OR REPLACE FUNCTION public.can_view_users(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_super_admin(_user_id)
      OR public.effective_permission(_user_id, 'usuarios', NULL)
         IN ('lector_global','editor_global')
$function$;

REVOKE ALL ON FUNCTION public.is_user_admin(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_view_users(uuid) FROM anon;

-- 4) Políticas sensibles: sustituyen el chequeo grueso por el de editor global.
DROP POLICY IF EXISTS "Club admins can update their club" ON public.clubs;
CREATE POLICY "Club admins can update their club" ON public.clubs
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_club_access(auth.uid(), id) AND public.is_user_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_club_access(auth.uid(), id) AND public.is_user_admin(auth.uid())));

DROP POLICY IF EXISTS "roles_write_own_club" ON public.roles;
CREATE POLICY "roles_write_own_club" ON public.roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (club_id = public.get_user_club_id(auth.uid()) AND public.is_user_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (club_id = public.get_user_club_id(auth.uid()) AND public.is_user_admin(auth.uid())));

DROP POLICY IF EXISTS "teams_write_own_club" ON public.teams;
CREATE POLICY "teams_write_own_club" ON public.teams
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (club_id = public.get_user_club_id(auth.uid()) AND public.is_user_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (club_id = public.get_user_club_id(auth.uid()) AND public.is_user_admin(auth.uid())));

DROP POLICY IF EXISTS "memberships_insert_admins" ON public.team_memberships;
CREATE POLICY "memberships_insert_admins" ON public.team_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = team_memberships.user_id
      AND p.club_id = public.get_user_club_id(auth.uid())));

DROP POLICY IF EXISTS "memberships_update_admins" ON public.team_memberships;
CREATE POLICY "memberships_update_admins" ON public.team_memberships
  FOR UPDATE TO authenticated
  USING (public.is_user_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = team_memberships.user_id
      AND p.club_id = public.get_user_club_id(auth.uid())))
  WITH CHECK (public.is_user_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = team_memberships.user_id
      AND p.club_id = public.get_user_club_id(auth.uid())));

DROP POLICY IF EXISTS "memberships_delete_admins" ON public.team_memberships;
CREATE POLICY "memberships_delete_admins" ON public.team_memberships
  FOR DELETE TO authenticated
  USING (public.is_user_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = team_memberships.user_id
      AND p.club_id = public.get_user_club_id(auth.uid())));

DROP POLICY IF EXISTS "overrides_write_admins" ON public.user_permission_overrides;
CREATE POLICY "overrides_write_admins" ON public.user_permission_overrides
  FOR ALL TO authenticated
  USING (public.is_user_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = user_permission_overrides.user_id
      AND p.club_id = public.get_user_club_id(auth.uid())))
  WITH CHECK (public.is_user_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = user_permission_overrides.user_id
      AND p.club_id = public.get_user_club_id(auth.uid())));

DROP POLICY IF EXISTS "audit_select_admins" ON public.membership_audit_log;
CREATE POLICY "audit_select_admins" ON public.membership_audit_log
  FOR SELECT TO authenticated
  USING (public.is_user_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));

DROP POLICY IF EXISTS "User editors manage role request approvals" ON public.role_request_approvals;
CREATE POLICY "User editors manage role request approvals" ON public.role_request_approvals
  FOR ALL TO authenticated
  USING (public.is_user_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_request_approvals.role_id
      AND r.club_id = public.get_user_club_id(auth.uid())))
  WITH CHECK (public.is_user_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_request_approvals.role_id
      AND r.club_id = public.get_user_club_id(auth.uid())));

DROP POLICY IF EXISTS "User editors manage request type overrides" ON public.request_type_user_overrides;
CREATE POLICY "User editors manage request type overrides" ON public.request_type_user_overrides
  FOR ALL TO authenticated
  USING (public.is_user_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()) AND club_id = public.get_user_club_id(auth.uid()));

DROP POLICY IF EXISTS "View own or managed request type overrides" ON public.request_type_user_overrides;
CREATE POLICY "View own or managed request type overrides" ON public.request_type_user_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.can_view_users(auth.uid()) AND club_id = public.get_user_club_id(auth.uid())));

DROP POLICY IF EXISTS "locations_insert" ON public.locations;
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_club_access(auth.uid(), club_id) AND (
    public.has_module_editor_any(auth.uid(), 'agenda')
    OR public.has_module_editor_any(auth.uid(), 'entrenamientos')
    OR public.is_user_admin(auth.uid()))));

DROP POLICY IF EXISTS "locations_update" ON public.locations;
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_club_access(auth.uid(), club_id) AND (
    public.has_module_editor_any(auth.uid(), 'agenda')
    OR public.has_module_editor_any(auth.uid(), 'entrenamientos')
    OR public.is_user_admin(auth.uid()))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.has_club_access(auth.uid(), club_id) AND (
    public.has_module_editor_any(auth.uid(), 'agenda')
    OR public.has_module_editor_any(auth.uid(), 'entrenamientos')
    OR public.is_user_admin(auth.uid()))));

DROP POLICY IF EXISTS "locations_delete" ON public.locations;
CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.has_club_access(auth.uid(), club_id) AND (
    public.has_module_editor_any(auth.uid(), 'agenda')
    OR public.has_module_editor_any(auth.uid(), 'entrenamientos')
    OR public.is_user_admin(auth.uid()))));

-- 5) Los niveles legacy de salud y desarrollo se derivan del nivel real;
--    'vista_jugador' ya no cuenta como lectura del módulo completo.
CREATE OR REPLACE FUNCTION public.health_level(_user_id uuid, _team_id uuid)
 RETURNS access_level
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE public.effective_permission(_user_id, 'salud', _team_id)
    WHEN 'editor_global' THEN 'editor'::public.access_level
    WHEN 'editor_categoria' THEN 'editor'::public.access_level
    WHEN 'lector_global' THEN 'read'::public.access_level
    WHEN 'lector_categoria' THEN 'read'::public.access_level
    ELSE 'none'::public.access_level END
$function$;

CREATE OR REPLACE FUNCTION public.development_level(_user_id uuid, _team_id uuid)
 RETURNS access_level
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE public.effective_permission(_user_id, 'desarrollo', _team_id)
    WHEN 'editor_global' THEN 'editor'::public.access_level
    WHEN 'editor_categoria' THEN 'editor'::public.access_level
    WHEN 'lector_global' THEN 'read'::public.access_level
    WHEN 'lector_categoria' THEN 'read'::public.access_level
    ELSE 'none'::public.access_level END
$function$;
