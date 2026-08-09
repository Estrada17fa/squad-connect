DROP POLICY IF EXISTS "Club admins can update their club" ON public.clubs;
CREATE POLICY "Club admins can update their club"
ON public.clubs FOR UPDATE TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (has_club_access(auth.uid(), id) AND (
    has_module_editor_any(auth.uid(), 'usuarios')
    OR EXISTS (
      SELECT 1 FROM team_memberships tm JOIN roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid() AND r.club_id = clubs.id AND r.base_role = 'admin'
    )
  ))
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (has_club_access(auth.uid(), id) AND (
    has_module_editor_any(auth.uid(), 'usuarios')
    OR EXISTS (
      SELECT 1 FROM team_memberships tm JOIN roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid() AND r.club_id = clubs.id AND r.base_role = 'admin'
    )
  ))
);

DROP POLICY IF EXISTS "locations_insert" ON public.locations;
CREATE POLICY "locations_insert" ON public.locations FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR (has_club_access(auth.uid(), club_id) AND (
    has_module_editor_any(auth.uid(), 'agenda')
    OR has_module_editor_any(auth.uid(), 'entrenamientos')
    OR has_module_editor_any(auth.uid(), 'usuarios')
  ))
);

DROP POLICY IF EXISTS "locations_update" ON public.locations;
CREATE POLICY "locations_update" ON public.locations FOR UPDATE TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (has_club_access(auth.uid(), club_id) AND (
    has_module_editor_any(auth.uid(), 'agenda')
    OR has_module_editor_any(auth.uid(), 'entrenamientos')
    OR has_module_editor_any(auth.uid(), 'usuarios')
  ))
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (has_club_access(auth.uid(), club_id) AND (
    has_module_editor_any(auth.uid(), 'agenda')
    OR has_module_editor_any(auth.uid(), 'entrenamientos')
    OR has_module_editor_any(auth.uid(), 'usuarios')
  ))
);

DROP POLICY IF EXISTS "locations_delete" ON public.locations;
CREATE POLICY "locations_delete" ON public.locations FOR DELETE TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (has_club_access(auth.uid(), club_id) AND (
    has_module_editor_any(auth.uid(), 'agenda')
    OR has_module_editor_any(auth.uid(), 'entrenamientos')
    OR has_module_editor_any(auth.uid(), 'usuarios')
  ))
);