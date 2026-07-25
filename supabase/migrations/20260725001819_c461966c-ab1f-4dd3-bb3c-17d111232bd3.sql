
DROP POLICY IF EXISTS roles_write_own_club ON public.roles;
DROP POLICY IF EXISTS role_perms_write_own_club ON public.role_permissions;

CREATE POLICY roles_write_own_club ON public.roles
FOR ALL TO authenticated
USING (
  (club_id = public.get_user_club_id(auth.uid()) AND public.has_module_editor_any(auth.uid(), 'usuarios'))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (club_id = public.get_user_club_id(auth.uid()) AND public.has_module_editor_any(auth.uid(), 'usuarios'))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY role_perms_write_own_club ON public.role_permissions
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.club_id = public.get_user_club_id(auth.uid())
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_module_editor_any(auth.uid(), 'usuarios')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.club_id = public.get_user_club_id(auth.uid())
    )
  )
);
