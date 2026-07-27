
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'en_pausa';

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'programada',
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at_actual timestamptz;

ALTER TABLE public.meetings
  DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IN ('programada','en_curso','en_pausa','finalizada','cancelada'));
