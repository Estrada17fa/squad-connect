-- ENUMS
CREATE TYPE public.expense_category AS ENUM ('material','servicios','nomina','viajes','mantenimiento','proveedores','otro');
CREATE TYPE public.payment_status AS ENUM ('pendiente','pagado');

-- SUPPLIERS
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact text,
  phone text,
  email text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX suppliers_club_name_idx ON public.suppliers (club_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated
USING (public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'compras_facturas')));

CREATE POLICY suppliers_write ON public.suppliers FOR ALL TO authenticated
USING (public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'compras_facturas')))
WITH CHECK (public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'compras_facturas')));

CREATE TRIGGER suppliers_touch_updated BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  concept text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  category public.expense_category NOT NULL DEFAULT 'otro',
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  expense_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Mazatlan')::date,
  payment_status public.payment_status NOT NULL DEFAULT 'pendiente',
  paid_at timestamptz,
  receipt_path text,
  notes text,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expenses_club_date_idx ON public.expenses (club_id, expense_date DESC);
CREATE INDEX expenses_club_category_idx ON public.expenses (club_id, category);
CREATE INDEX expenses_payment_status_idx ON public.expenses (payment_status);
CREATE UNIQUE INDEX expenses_request_id_idx ON public.expenses (request_id) WHERE request_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated
USING (public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'compras_facturas')));

CREATE POLICY expenses_write ON public.expenses FOR ALL TO authenticated
USING (public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'compras_facturas')))
WITH CHECK (public.has_club_access(auth.uid(), club_id)
  AND (public.is_super_admin(auth.uid()) OR public.has_module_editor_any(auth.uid(), 'compras_facturas')));

CREATE TRIGGER expenses_touch_updated BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- paid_at coherente con payment_status
CREATE OR REPLACE FUNCTION public.expenses_touch_paid()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.payment_status = 'pagado' THEN
    IF NEW.paid_at IS NULL THEN NEW.paid_at := now(); END IF;
  ELSE
    NEW.paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER expenses_touch_paid_trg BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.expenses_touch_paid();

-- Notificación al solicitante cuando su solicitud genera un gasto
CREATE OR REPLACE FUNCTION public.notify_expense_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_requester uuid;
BEGIN
  IF NEW.request_id IS NULL THEN RETURN NEW; END IF;
  SELECT requester_id INTO v_requester FROM public.requests WHERE id = NEW.request_id;
  IF v_requester IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    NEW.club_id, ARRAY[v_requester], 'gasto_registrado',
    'Tu compra fue procesada',
    NEW.concept || ' · $' || to_char(NEW.amount, 'FM999,999,990.00') || ' ' || NEW.currency,
    'compras_facturas', NEW.id
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_expense_created AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.notify_expense_created();

-- Permitir completar solicitudes de pago_proveedor y reembolso
CREATE OR REPLACE FUNCTION public.requests_status_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pendiente' THEN
      RAISE EXCEPTION 'Una solicitud nueva debe iniciar en estatus pendiente';
    END IF;
    INSERT INTO public.request_status_history (request_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, v_actor);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('aprobada', 'rechazada') AND v_actor IS NOT NULL AND v_actor = OLD.requester_id THEN
      RAISE EXCEPTION 'No puedes aprobar ni rechazar tu propia solicitud';
    END IF;

    IF NOT (
      (OLD.status = 'pendiente' AND NEW.status IN ('aprobada', 'rechazada', 'cancelada'))
      OR (OLD.status = 'aprobada' AND NEW.status = 'completada'
          AND NEW.type IN ('material', 'compra', 'pago_proveedor', 'reembolso'))
    ) THEN
      RAISE EXCEPTION 'Transición de estatus no permitida: % → %', OLD.status, NEW.status;
    END IF;

    IF NEW.status = 'cancelada' AND v_actor IS NOT NULL AND v_actor <> OLD.requester_id THEN
      RAISE EXCEPTION 'Solo el solicitante puede cancelar su solicitud';
    END IF;

    IF NEW.status IN ('aprobada', 'rechazada') THEN
      NEW.decided_at := now();
      NEW.decided_by := v_actor;
    END IF;

    INSERT INTO public.request_status_history (request_id, from_status, to_status, note, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.decision_note, v_actor);
  END IF;

  RETURN NEW;
END;
$$;

-- REPORTES agregados en servidor
CREATE OR REPLACE FUNCTION public.expense_report(_club_id uuid, _from date, _to date)
RETURNS TABLE(category public.expense_category, total numeric, pending_total numeric, paid_total numeric, expense_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT e.category,
         COALESCE(SUM(e.amount), 0)::numeric AS total,
         COALESCE(SUM(e.amount) FILTER (WHERE e.payment_status = 'pendiente'), 0)::numeric AS pending_total,
         COALESCE(SUM(e.amount) FILTER (WHERE e.payment_status = 'pagado'), 0)::numeric AS paid_total,
         COUNT(*)::bigint AS expense_count
  FROM public.expenses e
  WHERE e.club_id = _club_id
    AND e.expense_date >= _from
    AND e.expense_date <= _to
    AND public.has_club_access(auth.uid(), _club_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'compras_facturas'))
  GROUP BY e.category
  ORDER BY 2 DESC;
$$;

-- Resumen para Home: pendiente total y gasto del mes en curso
CREATE OR REPLACE FUNCTION public.expense_summary(_club_id uuid)
RETURNS TABLE(pending_total numeric, month_total numeric, pending_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT
    COALESCE(SUM(e.amount) FILTER (WHERE e.payment_status = 'pendiente'), 0)::numeric,
    COALESCE(SUM(e.amount) FILTER (
      WHERE e.expense_date >= date_trunc('month', (now() AT TIME ZONE 'America/Mazatlan')::date)::date
    ), 0)::numeric,
    COUNT(*) FILTER (WHERE e.payment_status = 'pendiente')::bigint
  FROM public.expenses e
  WHERE e.club_id = _club_id
    AND public.has_club_access(auth.uid(), _club_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_module_access(auth.uid(), 'compras_facturas'));
$$;

GRANT EXECUTE ON FUNCTION public.expense_report(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expense_summary(uuid) TO authenticated;