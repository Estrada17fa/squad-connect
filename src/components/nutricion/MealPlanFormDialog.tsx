import * as React from "react";
import { toast } from "sonner";
import { CookingPot, Plus, Scale, Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { PlayerPicker } from "@/components/squad/PlayerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEquivalences,
  useRecipes,
  useSaveMealPlan,
  type MealPlanRow,
  type NutritionRosterMember,
  type PlanDraftMeal,
  type RecipeRow,
} from "@/hooks/useNutrition";
import { MEAL_SLOT_ICON, PortionField } from "@/components/nutricion/NutricionPieces";
import { EquivalenceSheet } from "@/components/nutricion/EquivalenceSheet";
import { RecipeFormDialog } from "@/components/nutricion/RecipeFormDialog";
import {
  FOOD_GROUP_LABEL,
  FOOD_GROUP_ORDER,
  MEAL_SLOT_LABEL,
  MEAL_SLOT_ORDER,
  WEEK_TYPE_PRESETS,
  addDaysISO,
  weekRangeLabel,
  weekStartOf,
  type FoodGroup,
} from "@/lib/nutricion";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Jugadores de las categorías donde el usuario puede editar 'nutricion'. */
  players: NutritionRosterMember[];
  plan?: MealPlanRow | null;
  /** Plan base para duplicar (se copian comidas y porciones, no las fechas). */
  duplicateFrom?: MealPlanRow | null;
  fixedPlayerUserId?: string | null;
  onSaved?: () => void;
}

const emptyMeals = (): PlanDraftMeal[] =>
  MEAL_SLOT_ORDER.map((slot) => ({ slot, notes: null, portions: [], recipes: [] }));

function mealsFrom(plan: MealPlanRow | null | undefined): PlanDraftMeal[] {
  if (!plan) return emptyMeals();
  return MEAL_SLOT_ORDER.map((slot) => {
    const m = (plan.meals ?? []).find((x) => x.slot === slot);
    return {
      slot,
      notes: m?.notes ?? null,
      portions: (m?.portions ?? []).map((p) => ({
        food_group: p.food_group,
        portions: Number(p.portions),
        note: p.note,
      })),
      recipes: (m?.recipes ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => ({ recipe_id: r.recipe_id, name: r.name })),
    };
  });
}

export function MealPlanFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  plan,
  duplicateFrom,
  fixedPlayerUserId,
  onSaved,
}: Props) {
  const save = useSaveMealPlan(clubId, userId);
  const recipesQ = useRecipes(clubId);
  const equivQ = useEquivalences(clubId);
  const isEdit = !!plan;
  const base = plan ?? duplicateFrom ?? null;

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [weekStart, setWeekStart] = React.useState(weekStartOf());
  const [weekType, setWeekType] = React.useState(WEEK_TYPE_PRESETS[0]!);
  const [notes, setNotes] = React.useState("");
  const [meals, setMeals] = React.useState<PlanDraftMeal[]>(emptyMeals);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [recipeFormSlot, setRecipeFormSlot] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(plan?.player_user_id ?? fixedPlayerUserId ?? duplicateFrom?.player_user_id ?? "");
    setWeekStart(plan?.week_start ?? weekStartOf());
    setWeekType(base?.week_type ?? WEEK_TYPE_PRESETS[0]!);
    setNotes(base?.notes ?? "");
    setMeals(mealsFrom(base));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan, duplicateFrom, fixedPlayerUserId]);

  const player = players.find((p) => p.userId === playerUserId);
  const weekEnd = addDaysISO(weekStart, 6);
  const totalItems = meals.reduce((a, m) => a + m.portions.length + m.recipes.length, 0);
  const disabled = !player || !weekStart || !weekType.trim() || totalItems === 0 || save.isPending;

  const patchMeal = (slot: string, patch: Partial<PlanDraftMeal>) =>
    setMeals((prev) => prev.map((m) => (m.slot === slot ? { ...m, ...patch } : m)));

  const addPortion = (slot: string, group: FoodGroup) =>
    setMeals((prev) =>
      prev.map((m) =>
        m.slot === slot
          ? { ...m, portions: [...m.portions, { food_group: group, portions: 1, note: null }] }
          : m,
      ),
    );

  const addRecipe = (slot: string, recipe: RecipeRow) =>
    setMeals((prev) =>
      prev.map((m) =>
        m.slot === slot && !m.recipes.some((r) => r.recipe_id === recipe.id)
          ? { ...m, recipes: [...m.recipes, { recipe_id: recipe.id, name: recipe.name }] }
          : m,
      ),
    );

  const submit = async () => {
    if (!player) return;
    try {
      await save.mutateAsync({
        id: plan?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        week_start: weekStart,
        week_end: weekEnd,
        week_type: weekType.trim(),
        notes: notes.trim() || null,
        meals,
      });
      toast.success(isEdit ? "Plan actualizado" : "Plan semanal guardado");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el plan");
    }
  };

  const recipes = recipesQ.data ?? [];

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>
          {isEdit ? "Editar plan semanal" : duplicateFrom ? "Duplicar plan semanal" : "Nuevo plan semanal"}
        </EntitySheetTitle>
        <EntitySheetDescription>
          Porciones por grupo de alimentos y recetas sugeridas en cada tiempo de comida.
        </EntitySheetDescription>
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => setGuideOpen(true)}>
            <Scale className="mr-1.5 h-3.5 w-3.5" /> Guía de equivalencias
          </Button>
        </div>
      </EntitySheetHeader>

      <EntitySheetBody className="space-y-5">
        <PlayerPicker
          id="nutri-plan-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit || !!fixedPlayerUserId}
          emptyMessage="No tienes categorías donde puedas registrar nutrición."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="np-week">Inicio de semana (lunes)</Label>
            <Input
              id="np-week"
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(weekStartOf(new Date(`${e.target.value}T12:00:00`)))}
            />
            <p className="text-xs text-muted-foreground">{weekRangeLabel(weekStart, weekEnd)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de semana</Label>
            <Select
              value={WEEK_TYPE_PRESETS.includes(weekType) ? weekType : "__custom__"}
              onValueChange={(v) => setWeekType(v === "__custom__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEK_TYPE_PRESETS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Otro…</SelectItem>
              </SelectContent>
            </Select>
            {!WEEK_TYPE_PRESETS.includes(weekType) ? (
              <Input
                value={weekType}
                onChange={(e) => setWeekType(e.target.value)}
                placeholder="Describe el tipo de semana"
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          {meals.map((meal) => {
            const Icon = MEAL_SLOT_ICON[meal.slot];
            const available = recipes.filter((r) => !meal.recipes.some((x) => x.recipe_id === r.id));
            return (
              <div key={meal.slot} className="glass space-y-3 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="font-display text-sm font-semibold">{MEAL_SLOT_LABEL[meal.slot]}</p>
                </div>

                {meal.portions.map((p, i) => (
                  <PortionField
                    key={`${meal.slot}-${i}`}
                    group={p.food_group}
                    portions={p.portions}
                    onGroupChange={(g) =>
                      patchMeal(meal.slot, {
                        portions: meal.portions.map((x, j) =>
                          j === i ? { ...x, food_group: g } : x,
                        ),
                      })
                    }
                    onPortionsChange={(n) =>
                      patchMeal(meal.slot, {
                        portions: meal.portions.map((x, j) => (j === i ? { ...x, portions: n } : x)),
                      })
                    }
                    onRemove={() =>
                      patchMeal(meal.slot, {
                        portions: meal.portions.filter((_, j) => j !== i),
                      })
                    }
                  />
                ))}

                <Select value="" onValueChange={(v) => addPortion(meal.slot, v as FoodGroup)}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Agregar grupo de alimentos…" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_GROUP_ORDER.map((g) => (
                      <SelectItem key={g} value={g}>
                        {FOOD_GROUP_LABEL[g]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2 border-t border-white/5 pt-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <CookingPot className="h-3.5 w-3.5" /> Recetas sugeridas
                  </p>
                  {meal.recipes.map((r, i) => (
                    <div
                      key={`${meal.slot}-rec-${i}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-2.5 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate">{r.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar receta"
                        onClick={() =>
                          patchMeal(meal.slot, {
                            recipes: meal.recipes.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value=""
                      onValueChange={(v) => {
                        const r = recipes.find((x) => x.id === v);
                        if (r) addRecipe(meal.slot, r);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue
                          placeholder={
                            available.length === 0 ? "Sin recetas en la biblioteca" : "Agregar receta…"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setRecipeFormSlot(meal.slot)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Nueva receta
                    </Button>
                  </div>
                </div>

                <Textarea
                  rows={2}
                  value={meal.notes ?? ""}
                  onChange={(e) => patchMeal(meal.slot, { notes: e.target.value || null })}
                  placeholder="Indicaciones de este tiempo de comida (opcional)"
                />
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="np-notes">Notas generales</Label>
          <Textarea
            id="np-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hidratación, suplementos, ajustes por carga…"
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button className="glow-primary" disabled={disabled} onClick={submit}>
          {save.isPending ? "Guardando…" : "Guardar plan"}
        </Button>
      </EntitySheetFooter>

      <EquivalenceSheet
        open={guideOpen}
        onOpenChange={setGuideOpen}
        equivalences={equivQ.data ?? []}
      />

      <RecipeFormDialog
        open={!!recipeFormSlot}
        onOpenChange={(v) => !v && setRecipeFormSlot(null)}
        clubId={clubId}
        userId={userId}
        onSaved={(r) => {
          if (recipeFormSlot) addRecipe(recipeFormSlot, r);
          setRecipeFormSlot(null);
        }}
      />
    </EntitySheet>
  );
}
