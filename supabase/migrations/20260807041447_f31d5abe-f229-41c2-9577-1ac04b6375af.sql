CREATE POLICY "exercise_media_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'exercise-media'
    AND public.can_view_training_club(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "exercise_media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exercise-media'
    AND public.can_edit_training_club(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "exercise_media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'exercise-media'
    AND public.can_edit_training_club(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "exercise_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'exercise-media'
    AND public.can_edit_training_club(auth.uid(), (storage.foldername(name))[1]::uuid));