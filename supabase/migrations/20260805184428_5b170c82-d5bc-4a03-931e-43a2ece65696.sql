-- =========================
-- TABLA: notifications
-- =========================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  related_module text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.has_club_access(auth.uid(), club_id));

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread
  ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =========================
-- TABLA: push_subscriptions
-- =========================
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================
-- GANCHO DE PUSH (stub)
-- =========================
-- Punto único, agnóstico de proveedor, por donde en el futuro se enviarán los
-- push nativos (FCM / APNs vía Capacitor). Hoy no envía nada a propósito.
CREATE OR REPLACE FUNCTION public.notifications_push_hook(_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- TODO(push): leer public.push_subscriptions del destinatario y enviar el push
  -- mediante net.http_post hacia /api/public/hooks/send-push.
  RETURN;
END;
$$;

-- =========================
-- INSERTOR CENTRAL
-- =========================
CREATE OR REPLACE FUNCTION public.notify_users(
  _club_id uuid,
  _user_ids uuid[],
  _type text,
  _title text,
  _body text,
  _related_module text,
  _related_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _club_id IS NULL OR _user_ids IS NULL THEN RETURN; END IF;

  FOR v_id IN
    SELECT DISTINCT u FROM unnest(_user_ids) AS u
    WHERE u IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u)
  LOOP
    INSERT INTO public.notifications
      (club_id, user_id, type, title, body, related_module, related_id)
    VALUES (_club_id, v_id, _type, _title, _body, _related_module, _related_id)
    RETURNING id INTO v_id;
    PERFORM public.notifications_push_hook(v_id);
  END LOOP;
END;
$$;

-- =========================
-- SOLICITUDES
-- =========================
CREATE OR REPLACE FUNCTION public.notify_request_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_targets uuid[];
  v_requester text;
BEGIN
  SELECT array_agg(a.user_id) INTO v_targets
  FROM public.request_type_approver_ids(NEW.club_id, NEW.type) a
  WHERE a.user_id <> NEW.requester_id;

  IF v_targets IS NULL OR array_length(v_targets, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.email, 'Un miembro') INTO v_requester
  FROM public.profiles p WHERE p.id = NEW.requester_id;

  PERFORM public.notify_users(
    NEW.club_id, v_targets, 'solicitud_creada',
    'Nueva solicitud por aprobar',
    v_requester || ' solicitó: ' || NEW.title,
    'solicitudes', NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_request_created
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.notify_request_created();

CREATE OR REPLACE FUNCTION public.notify_request_decided()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('aprobada','rechazada') THEN RETURN NEW; END IF;

  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.requester_id],
    CASE WHEN NEW.status = 'aprobada' THEN 'solicitud_aprobada' ELSE 'solicitud_rechazada' END,
    CASE WHEN NEW.status = 'aprobada'
      THEN 'Tu solicitud de ' || NEW.title || ' fue aprobada'
      ELSE 'Tu solicitud de ' || NEW.title || ' fue rechazada' END,
    NEW.decision_note,
    'solicitudes', NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_request_decided
AFTER UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.notify_request_decided();

-- =========================
-- INVENTARIO: préstamo generado desde solicitud
-- =========================
CREATE OR REPLACE FUNCTION public.notify_loan_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item text;
BEGIN
  IF NEW.request_id IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_item FROM public.inventory_items WHERE id = NEW.item_id;

  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.borrower_user_id], 'prestamo_entregado',
    'Tu material está listo',
    COALESCE(v_item, 'Material') || ' ×' || NEW.quantity || ' fue entregado.',
    'inventario', NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_loan_created
AFTER INSERT ON public.inventory_loans
FOR EACH ROW EXECUTE FUNCTION public.notify_loan_created();

-- =========================
-- COORDINACIÓN: tareas
-- =========================
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t RECORD;
BEGIN
  SELECT club_id, title, created_by INTO t FROM public.tasks WHERE id = NEW.task_id;
  IF t IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id = COALESCE(t.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'tarea_asignada',
    'Se te asignó una tarea',
    t.title,
    'coordinacion_interna', NEW.task_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_task_assigned
AFTER INSERT ON public.task_assignees
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- =========================
-- COORDINACIÓN: juntas
-- =========================
CREATE OR REPLACE FUNCTION public.notify_meeting_invited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  m RECORD;
BEGIN
  SELECT club_id, title, starts_at, created_by INTO m
  FROM public.meetings WHERE id = NEW.meeting_id;
  IF m IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id = COALESCE(m.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_users(
    m.club_id, ARRAY[NEW.user_id], 'junta_invitacion',
    'Te invitaron a una junta',
    m.title || ' · ' || to_char(m.starts_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'coordinacion_interna', NEW.meeting_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_meeting_invited
AFTER INSERT ON public.meeting_attendees
FOR EACH ROW EXECUTE FUNCTION public.notify_meeting_invited();

-- =========================
-- INVENTARIO: préstamos por vencer (job diario)
-- =========================
CREATE OR REPLACE FUNCTION public.notify_due_loans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l RECORD;
  v_item text;
  v_vencido boolean;
BEGIN
  FOR l IN
    SELECT ln.* FROM public.inventory_loans ln
    WHERE ln.returned_at IS NULL
      AND ln.expected_return_at IS NOT NULL
      AND ln.expected_return_at <= now() + interval '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_module = 'inventario'
          AND n.related_id = ln.id
          AND n.type = 'prestamo_por_vencer'
          AND n.user_id = ln.borrower_user_id
          AND n.created_at > now() - interval '20 hours'
      )
  LOOP
    SELECT name INTO v_item FROM public.inventory_items WHERE id = l.item_id;
    v_vencido := l.expected_return_at < now();
    PERFORM public.notify_users(
      l.club_id, ARRAY[l.borrower_user_id], 'prestamo_por_vencer',
      CASE WHEN v_vencido THEN 'Préstamo vencido' ELSE 'Préstamo por vencer' END,
      COALESCE(v_item, 'Material') || ' ×' || (l.quantity - l.returned_quantity) ||
        CASE WHEN v_vencido THEN ' debió devolverse el ' ELSE ' se debe devolver el ' END ||
        to_char(l.expected_return_at AT TIME ZONE 'America/Mazatlan', 'DD/MM'),
      'inventario', l.id
    );
  END LOOP;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;