import * as React from "react";
import { toast } from "sonner";
import { Pencil, Plus, Scale, Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/squad/EmptyState";
import { FOOD_GROUP_LABEL, FOOD_GROUP_ORDER, type FoodGroup } from "@/lib/nutricion";
import {
  useEquivalences,
  useSaveEquivalence,
  type EquivalenceRow,
} from "@/hooks/useNutrition";

interface DraftItem {
  food_name: string;
  amount: string;
}

function EquivalenceFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  group,
  equivalence,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  group: FoodGroup;
  equivalence?: EquivalenceRow | null;
}) {
  const save = useSaveEquivalence(clubId, userId);
  const [description, setDescription] = React.useState("");
  const [items, setItems] = React.useState<DraftItem[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setDescription(equivalence?.description ?? "");
    setItems(
      (equivalence?.items ?? []).map((i) => ({ food_name: i.food_name, amount: i.amount ?? "" })),
    );
  }, [open, equivalence]);

  const patch = (i: number, p: Partial<DraftItem>) =>
    setItems((prev) => prev.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const submit = async () => {
    try {
      await save.mutateAsync({
        id: equivalence?.id ?? null,
        food_group: group,
        description: description.trim() || null,
        items: items.map((i) => ({ food_name: i.food_name, amount: i.amount || null })),
      });
      toast.success("Equivalencias guardadas");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudieron guardar las equivalencias");
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>1 porción de {FOOD_GROUP_LABEL[group].toLowerCase()}</EntitySheetTitle>
        <EntitySheetDescription>
          Define a qué equivale una porción y agrega ejemplos de alimentos con su cantidad.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="eq-desc">Descripción</Label>
          <Textarea
            id="eq-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Alimentos de origen animal bajos en grasa"
          />
        </div>

        <div className="space-y-2">
          <Label>Ejemplos de alimentos</Label>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aún no hay ejemplos.</p>
          ) : null}
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2">
              <Input
                value={it.food_name}
                onChange={(e) => patch(i, { food_name: e.target.value })}
                placeholder="Alimento (pollo)"
                aria-label="Alimento"
              />
              <Input
                value={it.amount}
                onChange={(e) => patch(i, { amount: e.target.value })}
                placeholder="30 g"
                aria-label="Cantidad"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar ejemplo"
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setItems((prev) => [...prev, { food_name: "", amount: "" }])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar alimento
          </Button>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button className="glow-primary" disabled={save.isPending} onClick={submit}>
          {save.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

/** Guía de porciones del club: una tarjeta por grupo de alimentos. */
export function EquivalencesTab({
  clubId,
  userId,
  canEdit,
}: {
  clubId: string;
  userId: string;
  canEdit: boolean;
}) {
  const q = useEquivalences(clubId);
  const byGroup = React.useMemo(
    () => new Map((q.data ?? []).map((e) => [e.food_group, e])),
    [q.data],
  );
  const [editing, setEditing] = React.useState<FoodGroup | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Referencia del club: a qué equivale 1 porción de cada grupo. Se configura una vez y se
        consulta desde cualquier plan.
      </p>

      {q.data && q.data.length === 0 && !canEdit ? (
        <EmptyState
          icon={Scale}
          title="Sin guía configurada"
          message="La nutrióloga aún no define las equivalencias del club."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FOOD_GROUP_ORDER.map((g) => {
            const eq = byGroup.get(g);
            const items = eq?.items ?? [];
            return (
              <div key={g} className="glass space-y-2 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold">{FOOD_GROUP_LABEL[g]}</p>
                    <p className="text-xs text-muted-foreground">
                      {eq?.description?.trim() || "Sin descripción"}
                    </p>
                  </div>
                  {canEdit ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(g)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                  ) : null}
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin ejemplos de alimentos.</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-1">
                    {items.map((it) => (
                      <li key={it.id} className="text-sm">
                        <span className="text-foreground">{it.food_name}</span>
                        {it.amount ? (
                          <span className="text-muted-foreground"> — {it.amount}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && canEdit ? (
        <EquivalenceFormDialog
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          clubId={clubId}
          userId={userId}
          group={editing}
          equivalence={byGroup.get(editing) ?? null}
        />
      ) : null}
    </div>
  );
}
