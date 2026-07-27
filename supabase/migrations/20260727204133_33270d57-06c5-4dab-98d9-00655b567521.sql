-- Enums
CREATE TYPE public.request_type AS ENUM (
  'material','compra','pago_proveedor','permiso','cortesias','reembolso','medica','otro'
);

CREATE TYPE public.request_status AS ENUM (
  'pendiente','aprobada','rechazada','cancelada','completada'
);

-- Approver helper (module-wide, any team)
CREATE OR REPLACE FUNCTION public.has_module_approver_any(_user_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    WHERE tm.user_id = _user_id AND rp.module_key = _module_key
      AND rp.access_level = 'approver'
  )
$$;

-- requests
CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  type public.request_type NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pendiente',
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  amount numeric(12,2),
  currency text,
  needed_at timestamptz,
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note text,
  related_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  related_event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  related_loan_id uuid REFERENCES public.inventory_loans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requests_select_club" ON public.requests FOR SELECT TO authenticated
  USING (public.has_club_access(auth.uid(), club_id));

CREATE POLICY "requests_insert_self" ON public.requests FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND public.has_club_access(auth.uid(), club_id)
  );

CREATE POLICY "requests_update" ON public.requests FOR UPDATE TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id) AND (
      (requester_id = auth.uid() AND status IN ('pendiente','rechazada'))
      OR public.has_module_editor_any(auth.uid(), 'solicitudes')
      OR public.has_module_approver_any(auth.uid(), 'solicitudes')
      OR public.is_super_admin(auth.uid())
    )
  )
  WITH CHECK (public.has_club_access(auth.uid(), club_id));

CREATE POLICY "requests_delete" ON public.requests FOR DELETE TO authenticated
  USING (
    public.has_club_access(auth.uid(), club_id) AND (
      (requester_id = auth.uid() AND status IN ('pendiente','cancelada','rechazada'))
      OR public.has_module_editor_any(auth.uid(), 'solicitudes')
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE TRIGGER requests_updated_at
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX requests_club_status_idx ON public.requests (club_id, status, created_at DESC);
CREATE INDEX requests_requester_idx ON public.requests (requester_id, created_at DESC);

-- comments / reminders
CREATE TABLE public.request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  kind text NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment','reminder','system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.request_comments TO authenticated;
GRANT ALL ON public.request_comments TO service_role;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "req_comments_select" ON public.request_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_comments.request_id
      AND public.has_club_access(auth.uid(), r.club_id)
  ));

CREATE POLICY "req_comments_insert" ON public.request_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_comments.request_id
        AND public.has_club_access(auth.uid(), r.club_id)
    )
  );

CREATE POLICY "req_comments_delete" ON public.request_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.has_module_editor_any(auth.uid(), 'solicitudes')
  );

CREATE INDEX request_comments_request_idx ON public.request_comments (request_id, created_at);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_comments;
