
CREATE POLICY "inventory_images_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'inventory');

CREATE POLICY "inventory_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'inventory'
  AND (
    public.is_super_admin(auth.uid())
    OR public.has_module_editor_any(auth.uid(), 'inventario')
  )
);

CREATE POLICY "inventory_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'inventory'
  AND (
    public.is_super_admin(auth.uid())
    OR public.has_module_editor_any(auth.uid(), 'inventario')
  )
);

CREATE POLICY "inventory_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'inventory'
  AND (
    public.is_super_admin(auth.uid())
    OR public.has_module_editor_any(auth.uid(), 'inventario')
  )
);
