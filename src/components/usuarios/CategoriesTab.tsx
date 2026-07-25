import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamRow {
  id: string;
  name: string;
  category: string | null;
}

export function CategoriesTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<TeamRow | null>(null);

  const teamsQ = useQuery({
    queryKey: ["club-teams-full", clubId],
    queryFn: async (): Promise<TeamRow[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category")
        .eq("club_id", clubId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleDelete(t: TeamRow) {
    const [{ count: members }, { count: players }] = await Promise.all([
      supabase
        .from("team_memberships")
        .select("id", { count: "exact", head: true })
        .eq("team_id", t.id),
      supabase
        .from("player_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("team_id", t.id),
    ]);
    if ((members ?? 0) > 0 || (players ?? 0) > 0) {
      toast.error(
        `No se puede eliminar: tiene ${members ?? 0} miembros y ${players ?? 0} jugadores asignados.`,
      );
      return;
    }
    if (!confirm(`¿Eliminar la categoría "${t.name}"?`)) return;
    const { error } = await supabase.from("teams").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Categoría eliminada");
    qc.invalidateQueries({ queryKey: ["club-teams-full", clubId] });
    qc.invalidateQueries({ queryKey: ["club-teams-min", clubId] });
  }

  if (teamsQ.isLoading) return <LoadingState />;
  const teams = teamsQ.data ?? [];

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)} variant="secondary">
            <Plus className="mr-2 h-4 w-4" /> Nueva categoría
          </Button>
        </div>
      ) : null}

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin categorías"
          message="Crea la primera categoría del club (ej. Primer equipo, Sub-15, Femenil)."
          action={
            canEdit ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nueva categoría
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {teams.map((t) => (
            <StandardCard
              key={t.id}
              title={t.name}
              subtitle={t.category ?? "Sin rama"}
              icon={Users}
              action={
                canEdit ? (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditRow(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(t)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      <CategoryFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clubId={clubId}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["club-teams-full", clubId] });
          qc.invalidateQueries({ queryKey: ["club-teams-min", clubId] });
        }}
      />
      <CategoryFormDialog
        open={!!editRow}
        onOpenChange={(o) => !o && setEditRow(null)}
        clubId={clubId}
        row={editRow}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["club-teams-full", clubId] });
          qc.invalidateQueries({ queryKey: ["club-teams-min", clubId] });
        }}
      />
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  clubId,
  row,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubId: string;
  row?: TeamRow | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(row?.name ?? "");
      setCategory(row?.category ?? "");
    }
  }, [open, row]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const cat = category.trim() ? category.trim() : undefined;
      if (row) {
        const { error } = await supabase
          .from("teams")
          .update({ name: name.trim(), category: cat })
          .eq("id", row.id);
        if (error) throw error;
        toast.success("Categoría actualizada");
      } else {
        const { error } = await supabase
          .from("teams")
          .insert({ club_id: clubId, name: name.trim(), category: cat });
        if (error) throw error;
        toast.success("Categoría creada");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            Define un equipo o categoría del club (ej. Primer equipo, Sub-15 Varonil).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nombre</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sub-15"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-cat">Rama (opcional)</Label>
            <Input
              id="cat-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Varonil, Femenil, Fuerzas básicas"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Guardando..." : row ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
