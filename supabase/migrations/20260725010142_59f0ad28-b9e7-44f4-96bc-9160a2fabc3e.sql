-- 1) Flag on roles for club-wide eligibility
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS allows_club_wide boolean NOT NULL DEFAULT false;

-- Seed: system default roles that make sense club-wide -> Admin only by default.
UPDATE public.roles SET allows_club_wide = true
WHERE is_system_default AND name = 'Admin';

-- 2) Tighten teams write policy: only usuarios editors/approvers or super admin
DROP POLICY IF EXISTS "teams_write_own_club" ON public.teams;
CREATE POLICY "teams_write_own_club" ON public.teams FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (
      club_id = public.get_user_club_id(auth.uid())
      AND public.has_module_editor_any(auth.uid(), 'usuarios')
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (
      club_id = public.get_user_club_id(auth.uid())
      AND public.has_module_editor_any(auth.uid(), 'usuarios')
    )
  );