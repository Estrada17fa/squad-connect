-- ===== Módulo Entrenamientos =====

CREATE TYPE public.exercise_category AS ENUM ('calentamiento','tecnica','tactica','fisico','portero','recuperacion','otro');
CREATE TYPE public.session_phase AS ENUM ('calentamiento','principal','vuelta_calma');

-- Nivel efectivo del módulo 'entrenamientos' por equipo
CREATE OR REPLACE FUNCTION public.training_level(_user_id uuid, _team_id uuid)
RETURNS public.access_level
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_club uuid;
  v_lvl public.access_level := 'none';
  v_o public.access_level;
BEGIN
  IF _user_id IS NULL THEN RETURN 'none'; END IF;
  IF public.is_super_admin(_user_id) THEN RETURN 'approver'; END IF;
  v_club := public.get_user_club_id(_user_id);
  IF v_club IS NULL THEN RETURN 'none'; END IF;
  IF _team_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.club_id = v_club) THEN
    RETURN 'none';
  END IF;

  v_lvl := COALESCE((
    SELECT CASE max(CASE rp.access_level
                 WHEN 'approver' THEN 3 WHEN 'editor' THEN 2 WHEN 'read' THEN 1 ELSE 0 END)
             WHEN 3 THEN 'approver'::public.access_level
             WHEN 2 THEN 'editor'::public.access_level
             WHEN 1 THEN 'read'::public.access_level
             ELSE 'none'::public.access_level END
    FROM public.team_memberships tm
    JOIN public.role_permissions rp ON rp.role_id = tm.role_id
    WHERE tm.user_id = _user_id
      AND rp.module_key = 'entrenamientos'
      AND (tm.team_id = _team_id OR tm.team_id IS NULL)
  ), 'none');

  SELECT o.access_level INTO v_o FROM public.user_permission_overrides o
   WHERE o.user_id = _user_id AND o.module_key = 'entrenamientos' AND o.team_id IS NULL LIMIT 1;
  IF v_o IS NOT NULL THEN v_lvl := v_o; END IF;

  IF _team_id IS NOT NULL THEN
    SELECT o.access_level INTO v_o FROM public.user_permission_overrides o
     WHERE o.user_id = _user_id AND o.module_key = 'entrenamientos' AND o.team_id = _team_id LIMIT 1;
    IF v_o IS NOT NULL THEN v_lvl := v_o; END IF;
  END IF;

  RETURN COALESCE(v_lvl, 'none');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_training(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.training_level(_user_id, _team_id) <> 'none'
$$;

CREATE OR REPLACE FUNCTION public.can_edit_training(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.training_level(_user_id, _team_id) IN ('editor','approver')
$$;

-- Nivel a nivel club (para ejercicios de biblioteca sin equipo)
CREATE OR REPLACE FUNCTION public.can_view_training_club(_user_id uuid, _club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
     OR (public.has_club_access(_user_id, _club_id) AND (
          public.training_level(_user_id, NULL) <> 'none'
          OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.club_id = _club_id AND public.training_level(_user_id, t.id) <> 'none')
        ))
$$;

CREATE OR REPLACE FUNCTION public.can_edit_training_club(_user_id uuid, _club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
     OR (public.has_club_access(_user_id, _club_id) AND (
          public.training_level(_user_id, NULL) IN ('editor','approver')
          OR EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.club_id = _club_id AND public.training_level(_user_id, t.id) IN ('editor','approver'))
        ))
$$;

-- 1. Biblioteca de ejercicios
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  objective text,
  category public.exercise_category NOT NULL DEFAULT 'otro',
  duration_minutes integer,
  materials text,
  media_path text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_exercises_club ON public.exercises(club_id);
CREATE INDEX idx_exercises_team ON public.exercises(team_id);
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "exercises_select" ON public.exercises FOR SELECT TO authenticated
  USING (CASE WHEN team_id IS NULL
              THEN public.can_view_training_club(auth.uid(), club_id)
              ELSE public.can_view_training(auth.uid(), team_id) END);
CREATE POLICY "exercises_write" ON public.exercises FOR ALL TO authenticated
  USING (CASE WHEN team_id IS NULL
              THEN public.can_edit_training_club(auth.uid(), club_id)
              ELSE public.can_edit_training(auth.uid(), team_id) END)
  WITH CHECK (public.has_club_access(auth.uid(), club_id)
    AND (CASE WHEN team_id IS NULL
              THEN public.can_edit_training_club(auth.uid(), club_id)
              ELSE public.can_edit_training(auth.uid(), team_id) END));

-- 2. Sesiones de entrenamiento
CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  title text NOT NULL,
  objective text,
  session_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_sessions TO service_role;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sessions_club ON public.training_sessions(club_id);
CREATE INDEX idx_sessions_team ON public.training_sessions(team_id);
CREATE INDEX idx_sessions_event ON public.training_sessions(event_id);
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "sessions_select" ON public.training_sessions FOR SELECT TO authenticated
  USING (public.can_view_training(auth.uid(), team_id));
CREATE POLICY "sessions_write" ON public.training_sessions FOR ALL TO authenticated
  USING (public.can_edit_training(auth.uid(), team_id))
  WITH CHECK (public.can_edit_training(auth.uid(), team_id)
    AND public.has_club_access(auth.uid(), club_id));

-- 3. Plan de la sesión
CREATE TABLE public.session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  phase public.session_phase NOT NULL DEFAULT 'principal',
  order_index integer NOT NULL DEFAULT 0,
  custom_notes text,
  duration_override integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_exercises TO authenticated;
GRANT ALL ON public.session_exercises TO service_role;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_session_exercises_session ON public.session_exercises(session_id);
CREATE INDEX idx_session_exercises_exercise ON public.session_exercises(exercise_id);

CREATE POLICY "session_exercises_select" ON public.session_exercises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_id
    AND public.can_view_training(auth.uid(), s.team_id)));
CREATE POLICY "session_exercises_write" ON public.session_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_id
    AND public.can_edit_training(auth.uid(), s.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_id
    AND public.can_edit_training(auth.uid(), s.team_id)));

-- Notificación: plan de sesión publicado
CREATE OR REPLACE FUNCTION public.notify_training_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ids uuid[];
BEGIN
  IF NEW.session_date < now() THEN RETURN NEW; END IF;
  IF NEW.event_id IS NULL THEN RETURN NEW; END IF;
  SELECT array_agg(ea.user_id) INTO v_ids
    FROM public.event_attendees ea WHERE ea.event_id = NEW.event_id;
  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users(
    NEW.club_id, v_ids, 'entrenamiento_publicado',
    'Plan de entrenamiento disponible', NEW.title,
    'entrenamientos', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_training_session
  AFTER INSERT ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_training_session();
