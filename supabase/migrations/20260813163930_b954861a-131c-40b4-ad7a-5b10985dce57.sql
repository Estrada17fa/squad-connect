
-- Tiempos de comida y grupos de alimentos
CREATE TYPE public.nutrition_meal_slot AS ENUM ('desayuno','colacion_1','comida','colacion_2','cena');
CREATE TYPE public.nutrition_food_group AS ENUM ('proteinas','cereales','verduras','frutas','grasas','lacteos','leguminosas','azucares','libres');

-- PLANES SEMANALES
CREATE TABLE public.nutrition_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  player_user_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  week_type text NOT NULL DEFAULT 'Carga normal',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nutrition_meal_plans_player_idx ON public.nutrition_meal_plans (player_user_id, week_start DESC);
CREATE UNIQUE INDEX nutrition_meal_plans_unique_week ON public.nutrition_meal_plans (player_user_id, week_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_meal_plans TO authenticated;
GRANT ALL ON public.nutrition_meal_plans TO service_role;
ALTER TABLE public.nutrition_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY nutrition_plans_select ON public.nutrition_meal_plans FOR SELECT TO authenticated
  USING (can_view_own_row(auth.uid(), 'nutricion'::text, player_user_id, team_id));
CREATE POLICY nutrition_plans_insert ON public.nutrition_meal_plans FOR INSERT TO authenticated
  WITH CHECK (can_edit_module(auth.uid(), 'nutricion'::text, team_id) AND has_club_access(auth.uid(), club_id));
CREATE POLICY nutrition_plans_update ON public.nutrition_meal_plans FOR UPDATE TO authenticated
  USING (can_edit_module(auth.uid(), 'nutricion'::text, team_id))
  WITH CHECK (can_edit_module(auth.uid(), 'nutricion'::text, team_id));
CREATE POLICY nutrition_plans_delete ON public.nutrition_meal_plans FOR DELETE TO authenticated
  USING (can_edit_module(auth.uid(), 'nutricion'::text, team_id));

CREATE TRIGGER nutrition_meal_plans_touch BEFORE UPDATE ON public.nutrition_meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helpers para las tablas hijas
CREATE OR REPLACE FUNCTION public.can_view_nutrition_plan(_user_id uuid, _plan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nutrition_meal_plans p
    WHERE p.id = _plan_id
      AND can_view_own_row(_user_id, 'nutricion'::text, p.player_user_id, p.team_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_nutrition_plan(_user_id uuid, _plan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nutrition_meal_plans p
    WHERE p.id = _plan_id
      AND can_edit_module(_user_id, 'nutricion'::text, p.team_id)
  )
$$;

-- TIEMPOS DE COMIDA
CREATE TABLE public.nutrition_plan_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.nutrition_meal_plans(id) ON DELETE CASCADE,
  slot public.nutrition_meal_slot NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, slot)
);
CREATE INDEX nutrition_plan_meals_plan_idx ON public.nutrition_plan_meals (plan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plan_meals TO authenticated;
GRANT ALL ON public.nutrition_plan_meals TO service_role;
ALTER TABLE public.nutrition_plan_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY nutrition_meals_select ON public.nutrition_plan_meals FOR SELECT TO authenticated
  USING (can_view_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_meals_insert ON public.nutrition_plan_meals FOR INSERT TO authenticated
  WITH CHECK (can_edit_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_meals_update ON public.nutrition_plan_meals FOR UPDATE TO authenticated
  USING (can_edit_nutrition_plan(auth.uid(), plan_id))
  WITH CHECK (can_edit_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_meals_delete ON public.nutrition_plan_meals FOR DELETE TO authenticated
  USING (can_edit_nutrition_plan(auth.uid(), plan_id));

CREATE TRIGGER nutrition_plan_meals_touch BEFORE UPDATE ON public.nutrition_plan_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PORCIONES POR GRUPO
CREATE TABLE public.nutrition_plan_portions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES public.nutrition_plan_meals(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.nutrition_meal_plans(id) ON DELETE CASCADE,
  food_group public.nutrition_food_group NOT NULL,
  portions numeric(5,2) NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nutrition_plan_portions_meal_idx ON public.nutrition_plan_portions (meal_id);
CREATE INDEX nutrition_plan_portions_plan_idx ON public.nutrition_plan_portions (plan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plan_portions TO authenticated;
GRANT ALL ON public.nutrition_plan_portions TO service_role;
ALTER TABLE public.nutrition_plan_portions ENABLE ROW LEVEL SECURITY;

CREATE POLICY nutrition_portions_select ON public.nutrition_plan_portions FOR SELECT TO authenticated
  USING (can_view_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_portions_insert ON public.nutrition_plan_portions FOR INSERT TO authenticated
  WITH CHECK (can_edit_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_portions_update ON public.nutrition_plan_portions FOR UPDATE TO authenticated
  USING (can_edit_nutrition_plan(auth.uid(), plan_id))
  WITH CHECK (can_edit_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_portions_delete ON public.nutrition_plan_portions FOR DELETE TO authenticated
  USING (can_edit_nutrition_plan(auth.uid(), plan_id));

CREATE TRIGGER nutrition_plan_portions_touch BEFORE UPDATE ON public.nutrition_plan_portions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ESTUDIOS ANTROPOMÉTRICOS (ISAK)
CREATE TABLE public.nutrition_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  player_user_id uuid NOT NULL,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  -- básicas
  body_mass_kg numeric(6,2),
  height_cm numeric(6,2),
  sitting_height_cm numeric(6,2),
  arm_span_cm numeric(6,2),
  -- pliegues (mm)
  skf_triceps numeric(5,2),
  skf_subscapular numeric(5,2),
  skf_biceps numeric(5,2),
  skf_iliac_crest numeric(5,2),
  skf_supraspinale numeric(5,2),
  skf_abdominal numeric(5,2),
  skf_thigh numeric(5,2),
  skf_calf numeric(5,2),
  -- perímetros (cm)
  girth_head numeric(5,2),
  girth_neck numeric(5,2),
  girth_arm_relaxed numeric(5,2),
  girth_arm_flexed numeric(5,2),
  girth_forearm numeric(5,2),
  girth_wrist numeric(5,2),
  girth_chest numeric(5,2),
  girth_waist numeric(5,2),
  girth_hips numeric(5,2),
  girth_thigh_1cm numeric(5,2),
  girth_thigh_mid numeric(5,2),
  girth_calf numeric(5,2),
  girth_ankle numeric(5,2),
  -- diámetros (cm)
  brd_biacromial numeric(5,2),
  brd_ap_abdominal numeric(5,2),
  brd_biiliocristal numeric(5,2),
  brd_transverse_chest numeric(5,2),
  brd_ap_chest numeric(5,2),
  brd_humerus numeric(5,2),
  brd_biestyloid numeric(5,2),
  brd_femur numeric(5,2),
  brd_bimalleolar numeric(5,2),
  -- longitudes y alturas (cm)
  len_acromiale_radiale numeric(6,2),
  len_radiale_stylion numeric(6,2),
  len_midstylion_dactylion numeric(6,2),
  hgt_iliospinale numeric(6,2),
  hgt_trochanterion numeric(6,2),
  len_trochanterion_tibiale numeric(6,2),
  hgt_tibiale_laterale numeric(6,2),
  len_foot numeric(6,2),
  len_tibiale_mediale_sphyrion numeric(6,2),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nutrition_assessments_player_idx ON public.nutrition_assessments (player_user_id, assessed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_assessments TO authenticated;
GRANT ALL ON public.nutrition_assessments TO service_role;
ALTER TABLE public.nutrition_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY nutrition_assessments_select ON public.nutrition_assessments FOR SELECT TO authenticated
  USING (can_view_own_row(auth.uid(), 'nutricion'::text, player_user_id, team_id));
CREATE POLICY nutrition_assessments_insert ON public.nutrition_assessments FOR INSERT TO authenticated
  WITH CHECK (can_edit_module(auth.uid(), 'nutricion'::text, team_id) AND has_club_access(auth.uid(), club_id));
CREATE POLICY nutrition_assessments_update ON public.nutrition_assessments FOR UPDATE TO authenticated
  USING (can_edit_module(auth.uid(), 'nutricion'::text, team_id))
  WITH CHECK (can_edit_module(auth.uid(), 'nutricion'::text, team_id));
CREATE POLICY nutrition_assessments_delete ON public.nutrition_assessments FOR DELETE TO authenticated
  USING (can_edit_module(auth.uid(), 'nutricion'::text, team_id));

CREATE TRIGGER nutrition_assessments_touch BEFORE UPDATE ON public.nutrition_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
