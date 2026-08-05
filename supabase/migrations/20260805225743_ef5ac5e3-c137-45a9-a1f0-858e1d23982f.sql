CREATE POLICY expense_receipts_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'expense-receipts'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'compras_facturas')));

CREATE POLICY expense_receipts_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expense-receipts'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'compras_facturas')));

CREATE POLICY expense_receipts_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'expense-receipts'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'compras_facturas')));

CREATE POLICY expense_receipts_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expense-receipts'
  AND public.has_club_access(auth.uid(), (split_part(name, '/', 1))::uuid)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'compras_facturas')));