import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
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
  useSaveMealPlan,
  type MealPlanRow,
  type NutritionRosterMember,
  type PlanDraftMeal,
} from "@/hooks/useNutrition";
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
  MEAL_SLOT_ORDER.map((slot) => ({ slot, notes: null, portions: [] }));

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
  const isEdit = !!plan;
  const base = plan ?? duplicateFrom ?? null;

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [weekStart, setWeekStart] = React.useState(weekStartOf());
  const [weekType, setWeekType] = React.useState(WEEK_TYPE_PRESETS[0]!);
  const [notes, setNotes] = React.useState("");
  const [meals, setMeals] = React.useState<PlanDraftMeal[]>(emptyMeals);

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
  const totalPortions = meals.reduce((a, m) => a + m.portions.length, 0);
  const disabled = !player || !weekStart || !weekType.trim() || totalPortions === 0 || save.isPending;

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

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>
          {isEdit ? "Editar plan semanal" : duplicateFrom ? "Duplicar plan semanal" : "Nuevo plan semanal"}
        </EntitySheetTitle>
        <EntitySheetDescription>
          Porciones por grupo de alimentos en cada tiempo de comida.
        </EntitySheetDescription>
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
          {meals.map((meal) => (
            <div key={meal.slot} className="glass space-y-3 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                <p className="font-display text-sm font-semibold">{MEAL_SLOT_LABEL[meal.slot]}</p>
              </div>

              {meal.portions.map((p, i) => (
                <div key={`${meal.slot}-${i}`} className="grid grid-cols-[1fr_5rem_auto] gap-2">
                  <Select
                    value={p.food_group}
                    onValueChange={(v) =>
                      patchMeal(meal.slot, {
                        portions: meal.portions.map((x, j) =>
                          j === i ? { ...x, food_group: v as FoodGroup } : x,
                        ),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_GROUP_ORDER.map((g) => (
                        <SelectItem key={g} value={g}>
                          {FOOD_GROUP_LABEL[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={p.portions}
                    onChange={(e) =>
                      patchMeal(meal.slot, {
                        portions: meal.portions.map((x, j) =>
                          j === i ? { ...x, portions: Number(e.target.value) } : x,
                        ),
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      patchMeal(meal.slot, { portions: meal.portions.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-2">
                <Select value="" onValueChange={(v) => addPortion(meal.slot, v as FoodGroup)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Agregar grupo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_GROUP_ORDER.map((g) => (
                      <SelectItem key={g} value={g}>
                        {FOOD_GROUP_LABEL[g]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>

              <Textarea
                rows={2}
                value={meal.notes ?? ""}
                onChange={(e) => patchMeal(meal.slot, { notes: e.target.value || null })}
                placeholder="Indicaciones de este tiempo de comida (opcional)"
              />
            </div>
          ))}
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
    </EntitySheet>
  );
}
