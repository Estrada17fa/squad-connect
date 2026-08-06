CREATE POLICY "trip_docs_editor_all" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'trip-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  AND public.can_edit_trip(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'trip-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  AND public.can_edit_trip(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "trip_docs_owner_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trip-documents'
  AND EXISTS (
    SELECT 1 FROM public.trip_boarding_passes bp
    WHERE bp.file_path = storage.objects.name
      AND bp.user_id = auth.uid()
  )
);