
-- === inventory_items ===
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  unit TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_select"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'inventario'))
  );

CREATE POLICY "inventory_items_write"
  ON public.inventory_items FOR ALL TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'inventario'))
  )
  WITH CHECK (
    public.has_club_access(auth.uid(), club_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'inventario'))
  );

CREATE INDEX inventory_items_club_idx ON public.inventory_items(club_id);

CREATE TRIGGER inventory_items_touch_updated
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- === inventory_loans ===
CREATE TABLE public.inventory_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  borrower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  request_id UUID, -- reservado para módulo futuro de Solicitudes
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0),
  expected_return_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT returned_le_quantity CHECK (returned_quantity <= quantity)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_loans TO authenticated;
GRANT ALL ON public.inventory_loans TO service_role;

ALTER TABLE public.inventory_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_loans_select"
  ON public.inventory_loans FOR SELECT TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'inventario'))
  );

CREATE POLICY "inventory_loans_write"
  ON public.inventory_loans FOR ALL TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'inventario'))
  )
  WITH CHECK (
    public.has_club_access(auth.uid(), club_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'inventario'))
  );

CREATE INDEX inventory_loans_club_idx ON public.inventory_loans(club_id);
CREATE INDEX inventory_loans_item_idx ON public.inventory_loans(item_id);
CREATE INDEX inventory_loans_borrower_idx ON public.inventory_loans(borrower_user_id);
CREATE INDEX inventory_loans_active_idx ON public.inventory_loans(item_id) WHERE returned_at IS NULL;

CREATE TRIGGER inventory_loans_touch_updated
  BEFORE UPDATE ON public.inventory_loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- === Auto returned_at trigger ===
CREATE OR REPLACE FUNCTION public.inventory_loans_touch_returned()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.returned_quantity >= NEW.quantity THEN
    IF NEW.returned_at IS NULL THEN NEW.returned_at := now(); END IF;
  ELSE
    NEW.returned_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_loans_touch_returned_trg
  BEFORE INSERT OR UPDATE ON public.inventory_loans
  FOR EACH ROW EXECUTE FUNCTION public.inventory_loans_touch_returned();

-- === Availability enforcement ===
CREATE OR REPLACE FUNCTION public.inventory_loans_check_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_club UUID;
  v_outstanding INTEGER;
  v_delta INTEGER;
BEGIN
  SELECT total_quantity, club_id INTO v_total, v_club
    FROM public.inventory_items WHERE id = NEW.item_id;
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'Artículo inexistente';
  END IF;
  IF v_club <> NEW.club_id THEN
    RAISE EXCEPTION 'El artículo pertenece a otro club';
  END IF;

  SELECT COALESCE(SUM(quantity - returned_quantity), 0) INTO v_outstanding
    FROM public.inventory_loans
    WHERE item_id = NEW.item_id
      AND returned_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_delta := NEW.quantity - NEW.returned_quantity;
  IF v_outstanding + v_delta > v_total THEN
    RAISE EXCEPTION 'No hay suficiente disponibilidad (disponible: %, solicitado: %)',
      v_total - v_outstanding, v_delta;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_loans_check_availability_trg
  BEFORE INSERT OR UPDATE OF quantity, returned_quantity, item_id ON public.inventory_loans
  FOR EACH ROW EXECUTE FUNCTION public.inventory_loans_check_availability();

-- === Realtime ===
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_loans;
