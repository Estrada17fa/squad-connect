-- 1) Datos de la factura recibida (no se emite nada)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS has_invoice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_pdf_path text,
  ADD COLUMN IF NOT EXISTS invoice_xml_path text,
  ADD COLUMN IF NOT EXISTS invoice_folio text,
  ADD COLUMN IF NOT EXISTS invoice_uuid text,
  ADD COLUMN IF NOT EXISTS issuer_rfc text,
  ADD COLUMN IF NOT EXISTS invoice_total numeric(14,2),
  ADD COLUMN IF NOT EXISTS invoice_tax numeric(14,2),
  ADD COLUMN IF NOT EXISTS invoice_date date;

CREATE INDEX IF NOT EXISTS expenses_club_invoice_idx ON public.expenses (club_id, has_invoice);

-- 2) Acceso propio del módulo de club: lector global para ver, editor global para escribir
CREATE OR REPLACE FUNCTION public.can_view_compras(_user_id uuid, _club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_club_access(_user_id, _club_id)
     AND (
       public.is_super_admin(_user_id)
       OR public.max_permission_any_team(_user_id, 'compras_facturas') >= 'lector_global'::permission_level
     )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_compras(_user_id uuid, _club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_club_access(_user_id, _club_id)
     AND (
       public.is_super_admin(_user_id)
       OR public.max_permission_any_team(_user_id, 'compras_facturas') = 'editor_global'::permission_level
     )
$$;

DROP POLICY IF EXISTS expenses_select ON public.expenses;
DROP POLICY IF EXISTS expenses_write ON public.expenses;
CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated
  USING (public.can_view_compras(auth.uid(), club_id));
CREATE POLICY expenses_write ON public.expenses TO authenticated
  USING (public.can_edit_compras(auth.uid(), club_id))
  WITH CHECK (public.can_edit_compras(auth.uid(), club_id));

DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
DROP POLICY IF EXISTS suppliers_write ON public.suppliers;
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated
  USING (public.can_view_compras(auth.uid(), club_id));
CREATE POLICY suppliers_write ON public.suppliers TO authenticated
  USING (public.can_edit_compras(auth.uid(), club_id))
  WITH CHECK (public.can_edit_compras(auth.uid(), club_id));

-- 3) Archivos (comprobantes y facturas) en el bucket privado
DROP POLICY IF EXISTS expense_receipts_select ON storage.objects;
DROP POLICY IF EXISTS expense_receipts_update ON storage.objects;
DROP POLICY IF EXISTS expense_receipts_delete ON storage.objects;
DROP POLICY IF EXISTS expense_receipts_insert ON storage.objects;

CREATE POLICY expense_receipts_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'expense-receipts'
         AND public.can_view_compras(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY expense_receipts_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-receipts'
         AND public.can_edit_compras(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY expense_receipts_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'expense-receipts'
         AND public.can_edit_compras(auth.uid(), (split_part(name, '/', 1))::uuid))
  WITH CHECK (bucket_id = 'expense-receipts'
         AND public.can_edit_compras(auth.uid(), (split_part(name, '/', 1))::uuid));
CREATE POLICY expense_receipts_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'expense-receipts'
         AND public.can_edit_compras(auth.uid(), (split_part(name, '/', 1))::uuid));

-- 4) Reportes con facturado vs sin factura
DROP FUNCTION IF EXISTS public.expense_report(uuid, date, date);
CREATE FUNCTION public.expense_report(_club_id uuid, _from date, _to date)
RETURNS TABLE(
  category expense_category,
  total numeric,
  pending_total numeric,
  paid_total numeric,
  invoiced_total numeric,
  uninvoiced_total numeric,
  expense_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.category,
         COALESCE(SUM(e.amount), 0)::numeric AS total,
         COALESCE(SUM(e.amount) FILTER (WHERE e.payment_status = 'pendiente'), 0)::numeric AS pending_total,
         COALESCE(SUM(e.amount) FILTER (WHERE e.payment_status = 'pagado'), 0)::numeric AS paid_total,
         COALESCE(SUM(e.amount) FILTER (
           WHERE e.has_invoice AND (e.invoice_pdf_path IS NOT NULL OR e.invoice_xml_path IS NOT NULL OR e.invoice_uuid IS NOT NULL OR e.invoice_folio IS NOT NULL)
         ), 0)::numeric AS invoiced_total,
         COALESCE(SUM(e.amount) FILTER (
           WHERE NOT (e.has_invoice AND (e.invoice_pdf_path IS NOT NULL OR e.invoice_xml_path IS NOT NULL OR e.invoice_uuid IS NOT NULL OR e.invoice_folio IS NOT NULL))
         ), 0)::numeric AS uninvoiced_total,
         COUNT(*)::bigint AS expense_count
  FROM public.expenses e
  WHERE e.club_id = _club_id
    AND e.expense_date >= _from
    AND e.expense_date <= _to
    AND public.can_view_compras(auth.uid(), _club_id)
  GROUP BY e.category
  ORDER BY 2 DESC;
$$;

DROP FUNCTION IF EXISTS public.expense_summary(uuid);
CREATE FUNCTION public.expense_summary(_club_id uuid)
RETURNS TABLE(pending_total numeric, month_total numeric, pending_count bigint, uninvoiced_total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(e.amount) FILTER (WHERE e.payment_status = 'pendiente'), 0)::numeric,
    COALESCE(SUM(e.amount) FILTER (
      WHERE e.expense_date >= date_trunc('month', (now() AT TIME ZONE 'America/Mazatlan')::date)::date
    ), 0)::numeric,
    COUNT(*) FILTER (WHERE e.payment_status = 'pendiente')::bigint,
    COALESCE(SUM(e.amount) FILTER (
      WHERE NOT (e.has_invoice AND (e.invoice_pdf_path IS NOT NULL OR e.invoice_xml_path IS NOT NULL OR e.invoice_uuid IS NOT NULL OR e.invoice_folio IS NOT NULL))
    ), 0)::numeric
  FROM public.expenses e
  WHERE e.club_id = _club_id
    AND public.can_view_compras(auth.uid(), _club_id);
$$;