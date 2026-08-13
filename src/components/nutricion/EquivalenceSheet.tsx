import * as React from "react";
import { Scale } from "lucide-react";
import { DetailSheet } from "@/components/squad/DetailSheet";
import { HealthEmpty } from "@/components/salud/HealthPieces";
import { FOOD_GROUP_LABEL, FOOD_GROUP_ORDER, type FoodGroup } from "@/lib/nutricion";
import type { EquivalenceRow } from "@/hooks/useNutrition";

/** Ficha de un grupo: qué equivale 1 porción y ejemplos de alimentos. */
export function EquivalenceGroupCard({
  group,
  equivalence,
}: {
  group: FoodGroup;
  equivalence?: EquivalenceRow | null;
}) {
  const items = equivalence?.items ?? [];
  return (
    <div className="glass space-y-2 rounded-lg p-3">
      <p className="font-display text-sm font-semibold">{FOOD_GROUP_LABEL[group]}</p>
      <p className="text-xs text-muted-foreground">
        {equivalence?.description?.trim() || "Sin descripción capturada."}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin ejemplos de alimentos.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="text-sm text-foreground">
              <span>{it.food_name}</span>
              {it.amount ? <span className="text-muted-foreground"> — {it.amount}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Guía consultable de equivalencias. Si se pasa `group`, muestra ese grupo
 * primero; si no, la guía completa del club.
 */
export function EquivalenceSheet({
  open,
  onOpenChange,
  equivalences,
  group,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equivalences: EquivalenceRow[];
  group?: FoodGroup | null;
}) {
  const byGroup = React.useMemo(
    () => new Map(equivalences.map((e) => [e.food_group, e])),
    [equivalences],
  );
  const groups = group ? [group] : FOOD_GROUP_ORDER;
  const hasAny = equivalences.length > 0;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={group ? `1 porción de ${FOOD_GROUP_LABEL[group].toLowerCase()}` : "Guía de equivalencias"}
      description="Referencia del club: a qué equivale una porción de cada grupo."
      size="md"
    >
      {hasAny ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <EquivalenceGroupCard key={g} group={g} equivalence={byGroup.get(g)} />
          ))}
        </div>
      ) : (
        <HealthEmpty
          icon={Scale}
          title="Sin guía configurada"
          message="La nutrióloga aún no define a qué equivale una porción de cada grupo."
        />
      )}
    </DetailSheet>
  );
}
