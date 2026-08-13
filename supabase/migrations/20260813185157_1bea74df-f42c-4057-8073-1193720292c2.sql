-- Equivalencias por grupo de alimentos (una tabla por club)
CREATE TABLE public.nutrition_portion_equivalences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  food_group nutrition_food_group NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, food_group)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_portion_equivalences TO authenticated;
GRANT ALL ON public.nutrition_portion_equivalences TO service_role;
ALTER TABLE public.nutrition_portion_equivalences ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutrition_equiv_select ON public.nutrition_portion_equivalences FOR SELECT TO authenticated
  USING (public.can_view_club_module(auth.uid(), club_id, 'nutricion'));
CREATE POLICY nutrition_equiv_insert ON public.nutrition_portion_equivalences FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'nutricion'));
CREATE POLICY nutrition_equiv_update ON public.nutrition_portion_equivalences FOR UPDATE TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'nutricion'))
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'nutricion'));
CREATE POLICY nutrition_equiv_delete ON public.nutrition_portion_equivalences FOR DELETE TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'nutricion'));
CREATE TRIGGER trg_nutrition_equiv_updated BEFORE UPDATE ON public.nutrition_portion_equivalences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ejemplos de alimentos de cada equivalencia
CREATE TABLE public.nutrition_equivalence_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equivalence_id UUID NOT NULL REFERENCES public.nutrition_portion_equivalences(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  amount TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nutrition_equiv_items_parent ON public.nutrition_equivalence_items(equivalence_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_equivalence_items TO authenticated;
GRANT ALL ON public.nutrition_equivalence_items TO service_role;
ALTER TABLE public.nutrition_equivalence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutrition_equiv_items_select ON public.nutrition_equivalence_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_portion_equivalences e
    WHERE e.id = equivalence_id AND public.can_view_club_module(auth.uid(), e.club_id, 'nutricion')));
CREATE POLICY nutrition_equiv_items_insert ON public.nutrition_equivalence_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.nutrition_portion_equivalences e
    WHERE e.id = equivalence_id AND public.can_edit_club_module(auth.uid(), e.club_id, 'nutricion')));
CREATE POLICY nutrition_equiv_items_update ON public.nutrition_equivalence_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_portion_equivalences e
    WHERE e.id = equivalence_id AND public.can_edit_club_module(auth.uid(), e.club_id, 'nutricion')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.nutrition_portion_equivalences e
    WHERE e.id = equivalence_id AND public.can_edit_club_module(auth.uid(), e.club_id, 'nutricion')));
CREATE POLICY nutrition_equiv_items_delete ON public.nutrition_equivalence_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_portion_equivalences e
    WHERE e.id = equivalence_id AND public.can_edit_club_module(auth.uid(), e.club_id, 'nutricion')));

-- Biblioteca de recetas del club
CREATE TABLE public.nutrition_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  food_groups nutrition_food_group[] NOT NULL DEFAULT '{}',
  ingredients TEXT,
  preparation TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nutrition_recipes_club ON public.nutrition_recipes(club_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_recipes TO authenticated;
GRANT ALL ON public.nutrition_recipes TO service_role;
ALTER TABLE public.nutrition_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutrition_recipes_select ON public.nutrition_recipes FOR SELECT TO authenticated
  USING (public.can_view_club_module(auth.uid(), club_id, 'nutricion'));
CREATE POLICY nutrition_recipes_insert ON public.nutrition_recipes FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'nutricion'));
CREATE POLICY nutrition_recipes_update ON public.nutrition_recipes FOR UPDATE TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'nutricion'))
  WITH CHECK (public.can_edit_club_module(auth.uid(), club_id, 'nutricion'));
CREATE POLICY nutrition_recipes_delete ON public.nutrition_recipes FOR DELETE TO authenticated
  USING (public.can_edit_club_module(auth.uid(), club_id, 'nutricion'));
CREATE TRIGGER trg_nutrition_recipes_updated BEFORE UPDATE ON public.nutrition_recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recetas asignadas a un tiempo de comida de un plan
CREATE TABLE public.nutrition_plan_meal_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES public.nutrition_plan_meals(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.nutrition_meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.nutrition_recipes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nutrition_meal_recipes_meal ON public.nutrition_plan_meal_recipes(meal_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plan_meal_recipes TO authenticated;
GRANT ALL ON public.nutrition_plan_meal_recipes TO service_role;
ALTER TABLE public.nutrition_plan_meal_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutrition_meal_recipes_select ON public.nutrition_plan_meal_recipes FOR SELECT TO authenticated
  USING (public.can_view_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_meal_recipes_insert ON public.nutrition_plan_meal_recipes FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_meal_recipes_update ON public.nutrition_plan_meal_recipes FOR UPDATE TO authenticated
  USING (public.can_edit_nutrition_plan(auth.uid(), plan_id))
  WITH CHECK (public.can_edit_nutrition_plan(auth.uid(), plan_id));
CREATE POLICY nutrition_meal_recipes_delete ON public.nutrition_plan_meal_recipes FOR DELETE TO authenticated
  USING (public.can_edit_nutrition_plan(auth.uid(), plan_id));