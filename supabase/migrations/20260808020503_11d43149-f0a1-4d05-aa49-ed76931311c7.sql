ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS current_season text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Mazatlan',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'dd/MM/yyyy';

DROP POLICY IF EXISTS "Club admins can update their club" ON public.clubs;
CREATE POLICY "Club admins can update their club"
ON public.clubs
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_club_access(auth.uid(), id)
    AND EXISTS (
      SELECT 1 FROM public.team_memberships tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid() AND r.club_id = clubs.id AND r.base_role = 'admin'
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.has_club_access(auth.uid(), id)
    AND EXISTS (
      SELECT 1 FROM public.team_memberships tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid() AND r.club_id = clubs.id AND r.base_role = 'admin'
    )
  )
);