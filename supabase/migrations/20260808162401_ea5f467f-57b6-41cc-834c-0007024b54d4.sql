-- 1. Correcciones a las funciones nuevas
CREATE OR REPLACE FUNCTION public.effective_permission(_user_id uuid, _module_key text, _team_id uuid)
RETURNS permission_level LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN 'editor_global'::public.permission_level
    WHEN _team_id IS NOT NULL AND NOT public.has_club_access(
           _user_id, (SELECT t.club_id FROM public.teams t WHERE t.id = _team_id))
      THEN 'sin_acceso'::public.permission_level
    ELSE GREATEST(
      COALESCE(
        (SELECT o.level FROM public.user_permission_overrides o
          WHERE o.user_id = _user_id AND o.module_key = _module_key
            AND _team_id IS NOT NULL AND o.team_id = _team_id LIMIT 1),
        (SELECT o.level FROM public.user_permission_overrides o
          WHERE o.user_id = _user_id AND o.module_key = _module_key AND o.team_id IS NULL LIMIT 1),
        (SELECT max(rp.level) FROM public.team_memberships tm
          JOIN public.role_permissions rp ON rp.role_id = tm.role_id AND rp.module_key = _module_key
          WHERE tm.user_id = _user_id
            AND (tm.team_id IS NULL OR _team_id IS NULL OR tm.team_id = _team_id)),
        'sin_acceso'::public.permission_level
      ),
      COALESCE((
        SELECT max(lvl) FROM (
          SELECT rp.level AS lvl FROM public.team_memberships tm
            JOIN public.role_permissions rp ON rp.role_id = tm.role_id AND rp.module_key = _module_key
            WHERE tm.user_id = _user_id
          UNION ALL
          SELECT o.level FROM public.user_permission_overrides o
            WHERE o.user_id = _user_id AND o.module_key = _module_key
        ) s WHERE lvl IN ('lector_global','editor_global')
      ), 'sin_acceso'::public.permission_level)
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.can_view_own_row(_user_id uuid, _module_key text, _owner_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT _owner_id = _user_id
      OR CASE public.effective_permission(_user_id, _module_key, _team_id)
           WHEN 'sin_acceso' THEN false
           WHEN 'vista_jugador' THEN false
           ELSE true
         END
$function$;

-- 2. SALUD
DROP POLICY IF EXISTS med_profile_select ON public.player_medical_profile;
DROP POLICY IF EXISTS med_profile_insert ON public.player_medical_profile;
DROP POLICY IF EXISTS med_profile_update ON public.player_medical_profile;
DROP POLICY IF EXISTS med_profile_delete ON public.player_medical_profile;
CREATE POLICY med_profile_select ON public.player_medical_profile FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'salud', player_user_id, team_id));
CREATE POLICY med_profile_insert ON public.player_medical_profile FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY med_profile_update ON public.player_medical_profile FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'salud', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id));
CREATE POLICY med_profile_delete ON public.player_medical_profile FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'salud', team_id));

DROP POLICY IF EXISTS checkups_select ON public.medical_checkups;
DROP POLICY IF EXISTS checkups_insert ON public.medical_checkups;
DROP POLICY IF EXISTS checkups_update ON public.medical_checkups;
DROP POLICY IF EXISTS checkups_delete ON public.medical_checkups;
CREATE POLICY checkups_select ON public.medical_checkups FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'salud', player_user_id, team_id));
CREATE POLICY checkups_insert ON public.medical_checkups FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY checkups_update ON public.medical_checkups FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'salud', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id));
CREATE POLICY checkups_delete ON public.medical_checkups FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'salud', team_id));

DROP POLICY IF EXISTS prescriptions_select ON public.medical_prescriptions;
DROP POLICY IF EXISTS prescriptions_insert ON public.medical_prescriptions;
DROP POLICY IF EXISTS prescriptions_update ON public.medical_prescriptions;
DROP POLICY IF EXISTS prescriptions_delete ON public.medical_prescriptions;
CREATE POLICY prescriptions_select ON public.medical_prescriptions FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'salud', player_user_id, team_id));
CREATE POLICY prescriptions_insert ON public.medical_prescriptions FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY prescriptions_update ON public.medical_prescriptions FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'salud', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id));
CREATE POLICY prescriptions_delete ON public.medical_prescriptions FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'salud', team_id));

DROP POLICY IF EXISTS injuries_select ON public.injuries;
DROP POLICY IF EXISTS injuries_insert ON public.injuries;
DROP POLICY IF EXISTS injuries_update ON public.injuries;
DROP POLICY IF EXISTS injuries_delete ON public.injuries;
CREATE POLICY injuries_select ON public.injuries FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'salud', player_user_id, team_id));
CREATE POLICY injuries_insert ON public.injuries FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY injuries_update ON public.injuries FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'salud', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'salud', team_id));
CREATE POLICY injuries_delete ON public.injuries FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'salud', team_id));

DROP POLICY IF EXISTS injury_progress_select ON public.injury_progress;
DROP POLICY IF EXISTS injury_progress_insert ON public.injury_progress;
DROP POLICY IF EXISTS injury_progress_update ON public.injury_progress;
DROP POLICY IF EXISTS injury_progress_delete ON public.injury_progress;
CREATE POLICY injury_progress_select ON public.injury_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_progress.injury_id
    AND public.can_view_own_row(auth.uid(), 'salud', i.player_user_id, i.team_id)));
CREATE POLICY injury_progress_insert ON public.injury_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_progress.injury_id
    AND public.can_edit_module(auth.uid(), 'salud', i.team_id)));
CREATE POLICY injury_progress_update ON public.injury_progress FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_progress.injury_id
    AND public.can_edit_module(auth.uid(), 'salud', i.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_progress.injury_id
    AND public.can_edit_module(auth.uid(), 'salud', i.team_id)));
CREATE POLICY injury_progress_delete ON public.injury_progress FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.injuries i WHERE i.id = injury_progress.injury_id
    AND public.can_edit_module(auth.uid(), 'salud', i.team_id)));

-- 3. DESARROLLO
DROP POLICY IF EXISTS dev_feedback_select ON public.development_feedback;
DROP POLICY IF EXISTS dev_feedback_insert ON public.development_feedback;
DROP POLICY IF EXISTS dev_feedback_update ON public.development_feedback;
DROP POLICY IF EXISTS dev_feedback_delete ON public.development_feedback;
CREATE POLICY dev_feedback_select ON public.development_feedback FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'desarrollo', player_user_id, team_id));
CREATE POLICY dev_feedback_insert ON public.development_feedback FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY dev_feedback_update ON public.development_feedback FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id));
CREATE POLICY dev_feedback_delete ON public.development_feedback FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id));

DROP POLICY IF EXISTS dev_goals_select ON public.development_goals;
DROP POLICY IF EXISTS dev_goals_insert ON public.development_goals;
DROP POLICY IF EXISTS dev_goals_update ON public.development_goals;
DROP POLICY IF EXISTS dev_goals_delete ON public.development_goals;
CREATE POLICY dev_goals_select ON public.development_goals FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'desarrollo', player_user_id, team_id));
CREATE POLICY dev_goals_insert ON public.development_goals FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY dev_goals_update ON public.development_goals FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id));
CREATE POLICY dev_goals_delete ON public.development_goals FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id));

DROP POLICY IF EXISTS dev_assess_select ON public.development_assessments;
DROP POLICY IF EXISTS dev_assess_insert ON public.development_assessments;
DROP POLICY IF EXISTS dev_assess_update ON public.development_assessments;
DROP POLICY IF EXISTS dev_assess_delete ON public.development_assessments;
CREATE POLICY dev_assess_select ON public.development_assessments FOR SELECT TO authenticated
  USING (public.can_view_own_row(auth.uid(), 'desarrollo', player_user_id, team_id));
CREATE POLICY dev_assess_insert ON public.development_assessments FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id) AND public.has_club_access(auth.uid(), club_id));
CREATE POLICY dev_assess_update ON public.development_assessments FOR UPDATE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id));
CREATE POLICY dev_assess_delete ON public.development_assessments FOR DELETE TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id));

DROP POLICY IF EXISTS assess_scores_select ON public.assessment_scores;
DROP POLICY IF EXISTS assess_scores_write ON public.assessment_scores;
CREATE POLICY assess_scores_select ON public.assessment_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.development_assessments a WHERE a.id = assessment_scores.assessment_id
    AND public.can_view_own_row(auth.uid(), 'desarrollo', a.player_user_id, a.team_id)));
CREATE POLICY assess_scores_write ON public.assessment_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.development_assessments a WHERE a.id = assessment_scores.assessment_id
    AND public.can_edit_module(auth.uid(), 'desarrollo', a.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.development_assessments a WHERE a.id = assessment_scores.assessment_id
    AND public.can_edit_module(auth.uid(), 'desarrollo', a.team_id)));

DROP POLICY IF EXISTS routines_select ON public.training_routines;
DROP POLICY IF EXISTS routines_write ON public.training_routines;
CREATE POLICY routines_select ON public.training_routines FOR SELECT TO authenticated
  USING (
    public.has_routine_assignment(auth.uid(), id)
    OR public.effective_permission(auth.uid(), 'desarrollo', team_id)
       IN ('lector_categoria','lector_global','editor_categoria','editor_global')
  );
CREATE POLICY routines_write ON public.training_routines FOR ALL TO authenticated
  USING (public.can_edit_module(auth.uid(), 'desarrollo', team_id))
  WITH CHECK (public.can_edit_module(auth.uid(), 'desarrollo', team_id) AND public.has_club_access(auth.uid(), club_id));

DROP POLICY IF EXISTS routine_exercises_select ON public.routine_exercises;
DROP POLICY IF EXISTS routine_exercises_write ON public.routine_exercises;
CREATE POLICY routine_exercises_select ON public.routine_exercises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_exercises.routine_id
    AND (public.has_routine_assignment(auth.uid(), r.id)
         OR public.effective_permission(auth.uid(), 'desarrollo', r.team_id)
            IN ('lector_categoria','lector_global','editor_categoria','editor_global'))));
CREATE POLICY routine_exercises_write ON public.routine_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_exercises.routine_id
    AND public.can_edit_module(auth.uid(), 'desarrollo', r.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_exercises.routine_id
    AND public.can_edit_module(auth.uid(), 'desarrollo', r.team_id)));

DROP POLICY IF EXISTS routine_assign_select ON public.routine_assignments;
DROP POLICY IF EXISTS routine_assign_insert ON public.routine_assignments;
DROP POLICY IF EXISTS routine_assign_update ON public.routine_assignments;
DROP POLICY IF EXISTS routine_assign_delete ON public.routine_assignments;
CREATE POLICY routine_assign_select ON public.routine_assignments FOR SELECT TO authenticated
  USING (player_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_assignments.routine_id
      AND public.can_view_own_row(auth.uid(), 'desarrollo', routine_assignments.player_user_id, r.team_id)));
CREATE POLICY routine_assign_insert ON public.routine_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_assignments.routine_id
    AND public.can_edit_module(auth.uid(), 'desarrollo', r.team_id)));
CREATE POLICY routine_assign_update ON public.routine_assignments FOR UPDATE TO authenticated
  USING (player_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_assignments.routine_id
      AND public.can_edit_module(auth.uid(), 'desarrollo', r.team_id)))
  WITH CHECK (player_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_assignments.routine_id
      AND public.can_edit_module(auth.uid(), 'desarrollo', r.team_id)));
CREATE POLICY routine_assign_delete ON public.routine_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_routines r WHERE r.id = routine_assignments.routine_id
    AND public.can_edit_module(auth.uid(), 'desarrollo', r.team_id)));