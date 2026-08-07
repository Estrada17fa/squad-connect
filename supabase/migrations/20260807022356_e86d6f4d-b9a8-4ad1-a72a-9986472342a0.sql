
CREATE TYPE public.development_goal_status AS ENUM ('pendiente','en_progreso','cumplido','no_cumplido');
CREATE TYPE public.routine_assignment_status AS ENUM ('asignada','en_progreso','completada');

-- ============ funciones de permiso ============
CREATE OR REPLACE FUNCTION public.development_level(_user_id uuid, _team_id uuid)
RETURNS public.access_level
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
      AND rp.module_key = 'desarrollo'
      AND (tm.team_id = _team_id OR tm.team_id IS NULL)
  ), 'none');

  SELECT o.access_level INTO v_o FROM public.user_permission_overrides o
   WHERE o.user_id = _user_id AND o.module_key = 'desarrollo' AND o.team_id IS NULL LIMIT 1;
  IF v_o IS NOT NULL THEN v_lvl := v_o; END IF;

  IF _team_id IS NOT NULL THEN
    SELECT o.access_level INTO v_o FROM public.user_permission_overrides o
     WHERE o.user_id = _user_id AND o.module_key = 'desarrollo' AND o.team_id = _team_id LIMIT 1;
    IF v_o IS NOT NULL THEN v_lvl := v_o; END IF;
  END IF;

  RETURN COALESCE(v_lvl, 'none');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_development(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.development_level(_user_id, _team_id) IN ('editor','approver') $$;

-- ============ retroalimentación ============
CREATE TABLE public.development_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Mazatlan')::date,
  context text,
  content text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.development_feedback TO authenticated;
GRANT ALL ON public.development_feedback TO service_role;
ALTER TABLE public.development_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_feedback_select" ON public.development_feedback FOR SELECT TO authenticated
  USING (player_user_id = auth.uid() OR public.can_edit_development(auth.uid(), team_id));
CREATE POLICY "dev_feedback_insert" ON public.development_feedback FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_development(auth.uid(), team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY "dev_feedback_update" ON public.development_feedback FOR UPDATE TO authenticated
  USING (public.can_edit_development(auth.uid(), team_id))
  WITH CHECK (public.can_edit_development(auth.uid(), team_id));
CREATE POLICY "dev_feedback_delete" ON public.development_feedback FOR DELETE TO authenticated
  USING (public.can_edit_development(auth.uid(), team_id));
CREATE INDEX idx_dev_feedback_team ON public.development_feedback(team_id);
CREATE INDEX idx_dev_feedback_player ON public.development_feedback(player_user_id);
CREATE INDEX idx_dev_feedback_club ON public.development_feedback(club_id);
CREATE TRIGGER trg_dev_feedback_updated BEFORE UPDATE ON public.development_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ objetivos ============
CREATE TABLE public.development_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_date date,
  status public.development_goal_status NOT NULL DEFAULT 'pendiente',
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.development_goals TO authenticated;
GRANT ALL ON public.development_goals TO service_role;
ALTER TABLE public.development_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_goals_select" ON public.development_goals FOR SELECT TO authenticated
  USING (player_user_id = auth.uid() OR public.can_edit_development(auth.uid(), team_id));
CREATE POLICY "dev_goals_insert" ON public.development_goals FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_development(auth.uid(), team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY "dev_goals_update" ON public.development_goals FOR UPDATE TO authenticated
  USING (public.can_edit_development(auth.uid(), team_id))
  WITH CHECK (public.can_edit_development(auth.uid(), team_id));
CREATE POLICY "dev_goals_delete" ON public.development_goals FOR DELETE TO authenticated
  USING (public.can_edit_development(auth.uid(), team_id));
CREATE INDEX idx_dev_goals_team ON public.development_goals(team_id);
CREATE INDEX idx_dev_goals_player ON public.development_goals(player_user_id);
CREATE INDEX idx_dev_goals_club ON public.development_goals(club_id);
CREATE TRIGGER trg_dev_goals_updated BEFORE UPDATE ON public.development_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.development_goals_touch_completed()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'cumplido' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cumplido') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'cumplido' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_dev_goals_completed BEFORE INSERT OR UPDATE ON public.development_goals
  FOR EACH ROW EXECUTE FUNCTION public.development_goals_touch_completed();

-- ============ evaluaciones ============
CREATE TABLE public.development_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Mazatlan')::date,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.development_assessments TO authenticated;
GRANT ALL ON public.development_assessments TO service_role;
ALTER TABLE public.development_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_assess_select" ON public.development_assessments FOR SELECT TO authenticated
  USING (player_user_id = auth.uid() OR public.can_edit_development(auth.uid(), team_id));
CREATE POLICY "dev_assess_insert" ON public.development_assessments FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_development(auth.uid(), team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY "dev_assess_update" ON public.development_assessments FOR UPDATE TO authenticated
  USING (public.can_edit_development(auth.uid(), team_id))
  WITH CHECK (public.can_edit_development(auth.uid(), team_id));
CREATE POLICY "dev_assess_delete" ON public.development_assessments FOR DELETE TO authenticated
  USING (public.can_edit_development(auth.uid(), team_id));
CREATE INDEX idx_dev_assess_team ON public.development_assessments(team_id);
CREATE INDEX idx_dev_assess_player ON public.development_assessments(player_user_id);
CREATE INDEX idx_dev_assess_club ON public.development_assessments(club_id);
CREATE TRIGGER trg_dev_assess_updated BEFORE UPDATE ON public.development_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.development_assessments(id) ON DELETE CASCADE,
  attribute text NOT NULL,
  score numeric(4,1) NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, attribute)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_scores TO authenticated;
GRANT ALL ON public.assessment_scores TO service_role;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assess_scores_select" ON public.assessment_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.development_assessments a WHERE a.id = assessment_id
    AND (a.player_user_id = auth.uid() OR public.can_edit_development(auth.uid(), a.team_id))));
CREATE POLICY "assess_scores_write" ON public.assessment_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.development_assessments a WHERE a.id = assessment_id
    AND public.can_edit_development(auth.uid(), a.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.development_assessments a WHERE a.id = assessment_id
    AND public.can_edit_development(auth.uid(), a.team_id)));
CREATE INDEX idx_assess_scores_assessment ON public.assessment_scores(assessment_id);

-- ============ rutinas ============
CREATE TABLE public.training_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_routines TO authenticated;
GRANT ALL ON public.training_routines TO service_role;
ALTER TABLE public.training_routines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_routines_team ON public.training_routines(team_id);
CREATE INDEX idx_routines_club ON public.training_routines(club_id);
CREATE TRIGGER trg_routines_updated BEFORE UPDATE ON public.training_routines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.routine_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.training_routines(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets integer,
  reps text,
  instructions text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_exercises TO authenticated;
GRANT ALL ON public.routine_exercises TO service_role;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_routine_exercises_routine ON public.routine_exercises(routine_id);

CREATE TABLE public.routine_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.training_routines(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  status public.routine_assignment_status NOT NULL DEFAULT 'asignada',
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_id, player_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_assignments TO authenticated;
GRANT ALL ON public.routine_assignments TO service_role;
ALTER TABLE public.routine_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_routine_assign_routine ON public.routine_assignments(routine_id);
CREATE INDEX idx_routine_assign_player ON public.routine_assignments(player_user_id);
CREATE TRIGGER trg_routine_assign_updated BEFORE UPDATE ON public.routine_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- helper: ¿el usuario tiene asignada esta rutina?
CREATE OR REPLACE FUNCTION public.has_routine_assignment(_user_id uuid, _routine_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.routine_assignments ra
                 WHERE ra.routine_id = _routine_id AND ra.player_user_id = _user_id)
$$;

CREATE POLICY "routines_select" ON public.training_routines FOR SELECT TO authenticated
  USING (public.can_edit_development(auth.uid(), team_id) OR public.has_routine_assignment(auth.uid(), id));
CREATE POLICY "routines_write" ON public.training_routines FOR ALL TO authenticated
  USING (public.can_edit_development(auth.uid(), team_id))
  WITH CHECK (public.can_edit_development(auth.uid(), team_id) AND public.has_club_access(auth.uid(), club_id));

CREATE POLICY "routine_exercises_select" ON public.routine_exercises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_id
    AND (public.can_edit_development(auth.uid(), r.team_id) OR public.has_routine_assignment(auth.uid(), r.id))));
CREATE POLICY "routine_exercises_write" ON public.routine_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_id
    AND public.can_edit_development(auth.uid(), r.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_id
    AND public.can_edit_development(auth.uid(), r.team_id)));

CREATE POLICY "routine_assign_select" ON public.routine_assignments FOR SELECT TO authenticated
  USING (player_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.training_routines r
    WHERE r.id = routine_id AND public.can_edit_development(auth.uid(), r.team_id)));
CREATE POLICY "routine_assign_insert" ON public.routine_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_id
    AND public.can_edit_development(auth.uid(), r.team_id)));
CREATE POLICY "routine_assign_update" ON public.routine_assignments FOR UPDATE TO authenticated
  USING (player_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.training_routines r
    WHERE r.id = routine_id AND public.can_edit_development(auth.uid(), r.team_id)))
  WITH CHECK (player_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.training_routines r
    WHERE r.id = routine_id AND public.can_edit_development(auth.uid(), r.team_id)));
CREATE POLICY "routine_assign_delete" ON public.routine_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_id
    AND public.can_edit_development(auth.uid(), r.team_id)));

-- ============ notificaciones ============
CREATE OR REPLACE FUNCTION public.notify_development_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.player_user_id = COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;
  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.player_user_id], 'desarrollo_retro',
    'Tienes nueva retroalimentación',
    COALESCE(NEW.context || ' · ', '') || left(NEW.content, 90),
    'desarrollo', NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_dev_feedback AFTER INSERT ON public.development_feedback
  FOR EACH ROW EXECUTE FUNCTION public.notify_development_feedback();

CREATE OR REPLACE FUNCTION public.notify_development_goal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.player_user_id = COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;
  PERFORM public.notify_users(
    NEW.club_id, ARRAY[NEW.player_user_id], 'desarrollo_objetivo',
    'Tienes un nuevo objetivo',
    NEW.title || COALESCE(' · meta ' || to_char(NEW.target_date, 'DD/MM'), ''),
    'desarrollo', NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_dev_goal AFTER INSERT ON public.development_goals
  FOR EACH ROW EXECUTE FUNCTION public.notify_development_goal();

CREATE OR REPLACE FUNCTION public.notify_routine_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r RECORD;
BEGIN
  SELECT club_id, name INTO r FROM public.training_routines WHERE id = NEW.routine_id;
  IF r IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users(
    r.club_id, ARRAY[NEW.player_user_id], 'desarrollo_rutina',
    'Se te asignó una rutina',
    r.name || COALESCE(' · entrega ' || to_char(NEW.due_date, 'DD/MM'), ''),
    'desarrollo', NEW.routine_id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_routine_assignment AFTER INSERT ON public.routine_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_routine_assignment();
