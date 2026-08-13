import * as React from "react";
import { toast } from "sonner";
import { CookingPot, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { DetailSheet } from "@/components/squad/DetailSheet";
import { RecipeFormDialog } from "@/components/nutricion/RecipeFormDialog";
import { FOOD_GROUP_LABEL, type FoodGroup } from "@/lib/nutricion";
import { useDeleteRecipe, useRecipes, type RecipeRow } from "@/hooks/useNutrition";

export function RecipeGroups({ groups }: { groups: FoodGroup[] }) {
  if (!groups?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.map((g) => (
        <span
          key={g}
          className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-white/10"
        >
          {FOOD_GROUP_LABEL[g]}
        </span>
      ))}
    </div>
  );
}

/** Ficha de lectura de una receta. */
export function RecipeDetailSheet({
  open,
  onOpenChange,
  recipe,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipe: RecipeRow | null;
}) {
  if (!recipe) return null;
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} title={recipe.name} size="md">
      <div className="space-y-4">
        <RecipeGroups groups={recipe.food_groups ?? []} />
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ingredientes
          </h3>
          <p className="whitespace-pre-wrap text-sm">
            {recipe.ingredients?.trim() || <span className="text-muted-foreground">—</span>}
          </p>
        </section>
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preparación
          </h3>
          <p className="whitespace-pre-wrap text-sm">
            {recipe.preparation?.trim() || <span className="text-muted-foreground">—</span>}
          </p>
        </section>
      </div>
    </DetailSheet>
  );
}

export function RecipesTab({
  clubId,
  userId,
  canEdit,
}: {
  clubId: string;
  userId: string;
  canEdit: boolean;
}) {
  const q = useRecipes(clubId);
  const del = useDeleteRecipe(clubId);
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RecipeRow | null>(null);
  const [detail, setDetail] = React.useState<RecipeRow | null>(null);

  const term = search.trim().toLowerCase();
  const recipes = (q.data ?? []).filter(
    (r) =>
      !term ||
      r.name.toLowerCase().includes(term) ||
      (r.ingredients ?? "").toLowerCase().includes(term),
  );

  const remove = async (r: RecipeRow) => {
    try {
      await del.mutateAsync(r);
      toast.success("Receta eliminada");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar la receta");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar receta"
            className="pl-9"
            aria-label="Buscar receta"
          />
        </div>
        {canEdit ? (
          <Button
            className="glow-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nueva receta
          </Button>
        ) : null}
      </div>

      {q.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={CookingPot}
          title="Sin recetas"
          message="La biblioteca de recetas del club está vacía."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <div key={r.id} className="glass space-y-2 rounded-lg p-3">
              <button
                type="button"
                onClick={() => setDetail(r)}
                className="w-full text-left font-display text-sm font-semibold"
              >
                {r.name}
              </button>
              <RecipeGroups groups={r.food_groups ?? []} />
              {r.ingredients ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{r.ingredients}</p>
              ) : null}
              {canEdit ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(r);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <RecipeFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        clubId={clubId}
        userId={userId}
        recipe={editing}
      />
      <RecipeDetailSheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)} recipe={detail} />
    </div>
  );
}
