import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Layers, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import {
  DetailField,
  DetailGrid,
  DetailSection,
  DetailSheet,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamRow {
  id: string;
  name: string;
  category: string | null;
}

const ALL = "__all__";
const db = supabase as any;

const USAGE_CHECKS: Array<{ table: string; column: string; label: string }> = [
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

async function categoryUsage(teamId: string): Promise<string[]> {
  const rows = await Promise.all(
    USAGE_CHECKS.map(async (c) => {
      const { count } = await db
        .from(c.table)
        .select("id", { count: "exact", head: true })
        .eq(c.column, teamId);
      return (count ?? 0) > 0 ? `${count} ${c.label}` : null;
    }),
  );
  return rows.filter(Boolean) as string[];
}

export function CategoriesTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [branch, setBranch] = React.useState(ALL);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<TeamRow | null>(null);
  const [toDelete, setToDelete] = React.useState<TeamRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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

  const membersQ = useQuery({
    queryKey: ["club-team-member-counts", clubId],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await db.from("team_memberships").select("team_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of (data ?? []) as { team_id: string | null }[]) {
        if (r.team_id) map[r.team_id] = (map[r.team_id] ?? 0) + 1;
      }
      return map;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["club-teams-full", clubId] });
    qc.invalidateQueries({ queryKey: ["club-teams-min", clubId] });
    qc.invalidateQueries({ queryKey: ["club-team-member-counts", clubId] });
  };

  const branches = React.useMemo(
    () =>
      Array.from(new Set((teamsQ.data ?? []).map((t) => t.category).filter(Boolean) as string[])).sort(),
    [teamsQ.data],
  );

  const list = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = teamsQ.data ?? [];
    if (q) rows = rows.filter((t) => t.name.toLowerCase().includes(q));
    if (branch !== ALL) rows = rows.filter((t) => (t.category ?? "") === branch);
    return rows;
  }, [teamsQ.data, search, branch]);

  const activeFilters = branch === ALL ? 0 : 1;

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const used = await categoryUsage(toDelete.id);
      if (used.length > 0) {
        toast.error(
          `No se puede eliminar "${toDelete.name}": tiene ${used.join(", ")}. Reasigna o quita esos registros primero.`,
          { duration: 8000 },
        );
        return;
      }
      const { error } = await supabase.from("teams").delete().eq("id", toDelete.id);
      if (error) throw error;
      toast.success("Categoría eliminada");
      setToDelete(null);
      setDetail(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  }

  if (teamsQ.isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Button onClick={() => setCreateOpen(true)} className="w-full glow-primary">
          <Plus className="mr-2 h-4 w-4" /> Nueva categoría
        </Button>
      ) : null}

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar categoría"
              className="pl-9"
              aria-label="Buscar categorías"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="shrink-0">
                <Filter className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Filtrar</span>
                {activeFilters > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[11px] font-semibold text-primary">
                    {activeFilters}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rama</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas las ramas</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeFilters > 0 ? (
                <Button variant="ghost" className="w-full" onClick={() => setBranch(ALL)}>
                  Limpiar filtros
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground">
          {list.length} {list.length === 1 ? "categoría" : "categorías"}
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={search || activeFilters ? "Sin resultados" : "Sin categorías"}
          message={
            search || activeFilters
              ? "Prueba con otro nombre o rama."
              : "Crea la primera categoría del club (ej. Primer equipo, Sub-15, Femenil)."
          }
          action={
            canEdit && !search && !activeFilters ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nueva categoría
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((t) => {
            const count = membersQ.data?.[t.id] ?? 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetail(t)}
                className="glass w-full rounded-xl p-3 text-left transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-display text-sm font-semibold leading-tight [overflow-wrap:anywhere]">
                      {t.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge variant="info">{t.category || "Sin rama"}</StatusBadge>
                      <StatusBadge variant={count > 0 ? "approved" : "pending"}>
                        {count} {count === 1 ? "miembro" : "miembros"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <DetailSheet
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.name ?? ""}
        description="Categoría del club"
        canEdit={canEdit}
        headerActions={
          canEdit && detail ? (
            <Button size="sm" variant="ghost" onClick={() => setToDelete(detail)}>
              <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" /> Eliminar
            </Button>
          ) : null
        }
        renderEdit={
          detail && canEdit
            ? ({ done }) => (
                <div className="p-4">
                  <CategoryForm
                    clubId={clubId}
                    row={detail}
                    onCancel={done}
                    onSaved={(row) => {
                      setDetail(row);
                      invalidate();
                      done();
                    }}
                  />
                </div>
              )
            : undefined
        }
      >
        {detail ? (
          <DetailSection title="Información">
            <DetailGrid>
              <DetailField label="Nombre">
                <DetailValue value={detail.name} />
              </DetailField>
              <DetailField label="Rama">
                <DetailValue value={detail.category ?? ""} />
              </DetailField>
              <DetailField label="Miembros asignados" icon={Users}>
                <DetailValue value={membersQ.data?.[detail.id] ?? 0} />
              </DetailField>
            </DetailGrid>
            <p className="text-xs text-muted-foreground">
              Renombrar es seguro: los registros quedan ligados por identificador, solo cambia la
              etiqueta en todos los módulos.
            </p>
          </DetailSection>
        ) : null}
      </DetailSheet>

      <DetailSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nueva categoría"
        description="Define un equipo o categoría del club (ej. Primer equipo, Sub-15 Varonil)."
        footer={null}
      >
        <CategoryForm
          clubId={clubId}
          row={null}
          onCancel={() => setCreateOpen(false)}
          onSaved={() => {
            invalidate();
            setCreateOpen(false);
          }}
        />
      </DetailSheet>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar "${toDelete?.name ?? ""}"?`}
        description="Solo se puede eliminar si no tiene nada asignado."
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function CategoryForm({
  clubId,
  row,
  onSaved,
  onCancel,
}: {
  clubId: string;
  row: TeamRow | null;
  onSaved: (row: TeamRow) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(row?.name ?? "");
  const [category, setCategory] = React.useState(row?.category ?? "");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!name.trim()) return toast.error("Escribe el nombre de la categoría");
    setSaving(true);
    try {
      const cat = category.trim();
      if (row) {
        const { data, error } = await supabase
          .from("teams")
          .update({ name: name.trim(), category: (cat || null) as any })
          .eq("id", row.id)
          .select("id, name, category")
          .maybeSingle();
        if (error) throw error;
        toast.success("Categoría actualizada");
        onSaved((data as TeamRow) ?? { ...row, name: name.trim(), category: cat || null });
      } else {
        const payload: any = { club_id: clubId, name: name.trim() };
        if (cat) payload.category = cat;
        const { data, error } = await supabase
          .from("teams")
          .insert(payload)
          .select("id, name, category")
          .maybeSingle();
        if (error) throw error;
        toast.success("Categoría creada");
        onSaved(data as TeamRow);
      }
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Sub-15"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-branch">Rama (opcional)</Label>
        <Input
          id="cat-branch"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Ej. Varonil"
        />
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="glow-primary">
          {saving ? "Guardando…" : row ? "Guardar cambios" : "Crear categoría"}
        </Button>
      </div>
    </div>
  );
}
