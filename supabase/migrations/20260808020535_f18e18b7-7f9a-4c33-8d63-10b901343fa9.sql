CREATE POLICY "Club members can view club logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'club-logos'
  AND public.has_club_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Club admins can upload club logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'club-logos'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid()
        AND r.base_role = 'admin'
        AND r.club_id = ((storage.foldername(name))[1])::uuid
    )
  )
);

CREATE POLICY "Club admins can update club logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'club-logos'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid()
        AND r.base_role = 'admin'
        AND r.club_id = ((storage.foldername(name))[1])::uuid
    )
  )
);

CREATE POLICY "Club admins can delete club logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'club-logos'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = auth.uid()
        AND r.base_role = 'admin'
        AND r.club_id = ((storage.foldername(name))[1])::uuid
    )
  )
);