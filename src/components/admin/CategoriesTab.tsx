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
    const checks: Array<{ table: string; column: string; label: string }> = [
      { table: "team_memberships", column: "team_id", label: "miembros" },
      { table: "player_profiles", column: "team_id", label: "jugadores" },
      { table: "calendar_events", column: "team_id", label: "eventos" },
      { table: "documents", column: "team_id", label: "documentos" },
      { table: "requests", column: "team_id", label: "solicitudes" },
      { table: "trips", column: "team_id", label: "viajes" },
      { table: "training_sessions", column: "team_id", label: "sesiones de entrenamiento" },
      { table: "exercises", column: "team_id", label: "ejercicios" },
      { table: "training_routines", column: "team_id", label: "rutinas" },
      { table: "injuries", column: "team_id", label: "lesiones" },
      { table: "medical_checkups", column: "team_id", label: "revisiones médicas" },
      { table: "player_medical_profile", column: "team_id", label: "expedientes médicos" },
      { table: "development_goals", column: "team_id", label: "objetivos de desarrollo" },
      { table: "development_feedback", column: "team_id", label: "feedback de desarrollo" },
      { table: "development_assessments", column: "team_id", label: "evaluaciones" },
      { table: "inventory_loans", column: "team_id", label: "préstamos de inventario" },
    ];
    const db = supabase as any;
    const used = (
      await Promise.all(
        checks.map(async (c) => {
          const { count } = await db
            .from(c.table)
            .select("id", { count: "exact", head: true })
            .eq(c.column, t.id);
          return (count ?? 0) > 0 ? `${count} ${c.label}` : null;
        }),
      )
    ).filter(Boolean) as string[];

    if (used.length > 0) {
      toast.error(
        `No se puede eliminar "${t.name}": tiene ${used.join(", ")}. Reasigna o quita esos registros primero.`,
        { duration: 8000 },
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
        <Button onClick={() => setCreateOpen(true)} className="w-full glow-primary">
          <Plus className="mr-2 h-4 w-4" /> Nueva categoría
        </Button>
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
      const cat = category.trim();
      if (row) {
        const { error } = await supabase
          .from("teams")
          .update({ name: name.trim(), ...(cat ? { category: cat } : { category: null as any }) })
          .eq("id", row.id);
        if (error) throw error;
        toast.success("Categoría actualizada");
      } else {
        const payload: any = { club_id: clubId, name: name.trim() };
        if (cat) payload.category = cat;
        const { error } = await supabase.from("teams").insert(payload);
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
