CREATE POLICY "media_files_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'media-posts'
  AND public.can_view_module(auth.uid(), 'multimedia', NULL)
  AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid())
);

CREATE POLICY "media_files_storage_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media-posts'
  AND public.can_edit_module(auth.uid(), 'multimedia', NULL)
  AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid())
);

CREATE POLICY "media_files_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media-posts'
  AND public.can_edit_module(auth.uid(), 'multimedia', NULL)
  AND (split_part(name, '/', 1))::uuid = public.get_user_club_id(auth.uid())
);