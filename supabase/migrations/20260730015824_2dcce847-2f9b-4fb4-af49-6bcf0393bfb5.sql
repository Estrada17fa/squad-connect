
-- Catálogo mínimo de inventario para cualquier miembro del club (para elegir material en solicitudes).
-- Solo campos necesarios para elegir; excluye descripción/notas y cualquier campo interno.
CREATE OR REPLACE FUNCTION public.inventory_catalog(_club_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  unit text,
  image_path text,
  total_quantity integer,
  available_quantity integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id,
         i.name,
         i.category,
         i.unit,
         i.image_path,
         i.total_quantity,
         GREATEST(
           i.total_quantity - COALESCE((
             SELECT SUM(l.quantity - l.returned_quantity)
             FROM public.inventory_loans l
             WHERE l.item_id = i.id AND l.returned_at IS NULL
           ), 0),
           0
         )::integer AS available_quantity
  FROM public.inventory_items i
  WHERE i.club_id = _club_id
    AND public.has_club_access(auth.uid(), i.club_id)
  ORDER BY i.name;
$$;

REVOKE ALL ON FUNCTION public.inventory_catalog(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inventory_catalog(uuid) TO authenticated;

-- Adjuntos de solicitudes (bucket privado request-attachments). Ruta: {club_id}/{user_id}/{archivo}
CREATE POLICY "request_attachments_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "request_attachments_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'request-attachments'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (split_part(name, '/', 2))::uuid = auth.uid()
);

CREATE POLICY "request_attachments_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (
    (split_part(name, '/', 2))::uuid = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.has_module_editor_any(auth.uid(), 'solicitudes')
  )
);
