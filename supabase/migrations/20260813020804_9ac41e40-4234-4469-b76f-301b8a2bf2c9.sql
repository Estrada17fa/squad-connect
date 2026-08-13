-- 1) Nuevos estados de disponibilidad
ALTER TYPE public.availability_status ADD VALUE IF NOT EXISTS 'en_recuperacion';
ALTER TYPE public.availability_status ADD VALUE IF NOT EXISTS 'baja_medica';

-- 2) Tipo de evento para citas médicas
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'medico';

-- 3) Tipo de revisión
ALTER TABLE public.medical_checkups
  ADD COLUMN IF NOT EXISTS checkup_type text NOT NULL DEFAULT 'valoracion';
ALTER TABLE public.medical_checkups
  DROP CONSTRAINT IF EXISTS medical_checkups_type_check;
ALTER TABLE public.medical_checkups
  ADD CONSTRAINT medical_checkups_type_check
  CHECK (checkup_type IN ('valoracion','fisioterapia','estudio','consulta_externa'));

-- 4) Eventos privados en agenda
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
CREATE POLICY calendar_events_select ON public.calendar_events
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.event_attendees ea
           WHERE ea.event_id = calendar_events.id AND ea.user_id = auth.uid())
  OR (
    NOT is_private
    AND CASE
      WHEN team_id IS NULL THEN public.has_club_access(auth.uid(), club_id)
           AND public.max_permission_any_team(auth.uid(), 'agenda') <> 'sin_acceso'
      ELSE public.can_view_module(auth.uid(), 'agenda', team_id)
    END
  )
  OR (is_private AND team_id IS NOT NULL AND public.can_view_module(auth.uid(), 'salud', team_id))
);

-- 5) Citas médicas
CREATE TABLE IF NOT EXISTS public.medical_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  appointment_type text NOT NULL DEFAULT 'valoracion',
  reason text NOT NULL,
  place text,
  notes text,
  status text NOT NULL DEFAULT 'programada',
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medical_appointments_type_check
    CHECK (appointment_type IN ('valoracion','fisioterapia','estudio','consulta_externa')),
  CONSTRAINT medical_appointments_status_check
    CHECK (status IN ('programada','realizada','cancelada'))
);

CREATE INDEX IF NOT EXISTS medical_appointments_player_idx
  ON public.medical_appointments (player_user_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS medical_appointments_club_idx
  ON public.medical_appointments (club_id, scheduled_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_appointments TO authenticated;
GRANT ALL ON public.medical_appointments TO service_role;

ALTER TABLE public.medical_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY medical_appointments_select ON public.medical_appointments
FOR SELECT TO authenticated
USING (
  player_user_id = auth.uid()
  OR public.can_view_own_row(auth.uid(), 'salud', player_user_id, team_id)
);

CREATE POLICY medical_appointments_insert ON public.medical_appointments
FOR INSERT TO authenticated
WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id));

CREATE POLICY medical_appointments_update ON public.medical_appointments
FOR UPDATE TO authenticated
USING (public.can_edit_module(auth.uid(), 'salud', team_id))
WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id));

CREATE POLICY medical_appointments_delete ON public.medical_appointments
FOR DELETE TO authenticated
USING (public.can_edit_module(auth.uid(), 'salud', team_id));

CREATE TRIGGER medical_appointments_touch
BEFORE UPDATE ON public.medical_appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) Sincronización con la agenda (evento privado, sin diagnóstico)
CREATE OR REPLACE FUNCTION public.sync_medical_appointment_to_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.event_id IS NOT NULL THEN
      DELETE FROM public.calendar_events WHERE id = OLD.event_id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.status = 'cancelada' THEN
    IF NEW.event_id IS NOT NULL THEN
      DELETE FROM public.calendar_events WHERE id = NEW.event_id;
      NEW.event_id := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.event_id IS NULL THEN
    INSERT INTO public.calendar_events
      (club_id, team_id, event_type, title, starts_at, location, description, created_by, is_private)
    VALUES
      (NEW.club_id, NEW.team_id, 'medico', 'Cita médica', NEW.scheduled_at, NEW.place, NULL,
       NEW.created_by, true)
    RETURNING id INTO v_event;
    NEW.event_id := v_event;
    INSERT INTO public.event_attendees (event_id, user_id)
    VALUES (v_event, NEW.player_user_id)
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.calendar_events
       SET starts_at = NEW.scheduled_at,
           location = NEW.place,
           team_id = NEW.team_id
     WHERE id = NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER medical_appointments_calendar_sync
BEFORE INSERT OR UPDATE ON public.medical_appointments
FOR EACH ROW EXECUTE FUNCTION public.sync_medical_appointment_to_calendar();

CREATE TRIGGER medical_appointments_calendar_delete
AFTER DELETE ON public.medical_appointments
FOR EACH ROW EXECUTE FUNCTION public.sync_medical_appointment_to_calendar();

-- 7) Aviso al jugador
CREATE OR REPLACE FUNCTION public.notify_medical_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status <> 'programada' THEN RETURN NEW; END IF;
  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.player_user_id], 'salud_cita',
    'Tienes una cita médica programada',
    to_char(NEW.scheduled_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI') ||
      COALESCE(' · ' || NEW.place, ''),
    'salud', NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER medical_appointments_notify
AFTER INSERT ON public.medical_appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_medical_appointment();