import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, Star } from "lucide-react";
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SectionLabel, GroupCard } from "@/components/admin/users/ui";
import { ClubSheet } from "./parts";

const db = supabase as any;

export interface TeamRow { id: string; name: string; category: string | null; display_order: number; is_primary: boolean }

/** Revisión de datos asociados antes de eliminar (incluye torneos y partidos). */
const USAGE_CHECKS: Array<{ table: string; label: [string, string] }> = [
  { table: "team_memberships", label: ["membresía", "membresías"] },
  { table: "player_profiles", label: ["jugador", "jugadores"] },
  { table: "tournaments", label: ["torneo", "torneos"] },
  { table: "calendar_events", label: ["evento o partido", "eventos o partidos"] },
  { table: "documents", label: ["documento", "documentos"] },
  { table: "requests", label: ["solicitud", "solicitudes"] },
  { table: "trips", label: ["viaje", "viajes"] },
  { table: "training_sessions", label: ["sesión de entrenamiento", "sesiones de entrenamiento"] },
  { table: "exercises", label: ["ejercicio", "ejercicios"] },
  { table: "training_routines", label: ["rutina", "rutinas"] },
  { table: "injuries", label: ["lesión", "lesiones"] },
  { table: "medical_checkups", label: ["revisión médica", "revisiones médicas"] },
  { table: "player_medical_profile", label: ["expediente médico", "expedientes médicos"] },
  { table: "development_goals", label: ["objetivo de desarrollo", "objetivos de desarrollo"] },
  { table: "development_feedback", label: ["feedback de desarrollo", "feedbacks de desarrollo"] },
  { table: "development_assessments", label: ["evaluación", "evaluaciones"] },
  { table: "inventory_loans", label: ["préstamo", "préstamos"] },
];

export async function categoryUsage(teamId: string): Promise<string[]> {
  const rows = await Promise.all(
    USAGE_CHECKS.map(async (c) => {
      const { count } = await db.from(c.table).select("id", { count: "exact", head: true }).eq("team_id", teamId);
      const n = count ?? 0;
      return n > 0 ? `${n} ${n === 1 ? c.label[0] : c.label[1]}` : null;
    }),
  );
  return rows.filter(Boolean) as string[];
}

function joinEs(list: string[]) {
  return list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
}

export function CategoriesSection({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const teamsQ = useQuery({
    queryKey: ["club-teams-full", clubId],
    queryFn: async (): Promise<TeamRow[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category, display_order, is_primary")
        .eq("club_id", clubId)
        .order("is_primary", { ascending: false })
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const countsQ = useQuery({
    queryKey: ["club-team-role-counts", clubId],
    queryFn: async (): Promise<Record<string, { players: number; staff: number }>> => {
      const { data, error } = await db.from("team_memberships").select("team_id, roles(base_role)");
      if (error) throw error;
      const map: Record<string, { players: number; staff: number }> = {};
      for (const r of (data ?? []) as any[]) {
        const m = (map[r.team_id] ??= { players: 0, staff: 0 });
        if (String(r.roles?.base_role ?? "").toLowerCase() === "jugador") m.players++;
        else m.staff++;
      }
      return map;
    },
  });

  const [rows, setRows] = React.useState<TeamRow[]>([]);
  React.useEffect(() => setRows(teamsQ.data ?? []), [teamsQ.data]);
  const [edit, setEdit] = React.useState<TeamRow | "new" | null>(null);

  const invalidate = () => {
    for (const k of ["club-teams-full", "club-teams-min", "club-team-member-counts", "club-team-role-counts"]) qc.invalidateQueries({ queryKey: [k, clubId] });
    qc.invalidateQueries({ queryKey: ["teams"] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.id === active.id);
    const to = rows.findIndex((r) => r.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(rows, from, to);
    setRows(next);
    try {
      const results = await Promise.all(next.map((r, i) => supabase.from("teams").update({ display_order: i + 1 } as any).eq("id", r.id)));
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
      toast.success("Orden guardado");
    } catch (er: any) {
      toast.error(er.message ?? "No se pudo guardar el orden");
    } finally {
      invalidate();
    }
  }

  const branches = Array.from(new Set(rows.map((r) => r.category).filter(Boolean) as string[])).sort();

  return (
    <section>
      <SectionLabel
        action={canEdit ? (
          <button type="button" onClick={() => setEdit("new")} className="coord-press inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" /> Agregar categoría
          </button>
        ) : null}
      >
        Categorías
      </SectionLabel>
      <GroupCard>
        {teamsQ.isLoading ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">Aún no hay categorías.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {rows.map((t) => (
                <CategoryRow key={t.id} row={t} canEdit={canEdit} counts={countsQ.data?.[t.id]} onOpen={() => canEdit && setEdit(t)} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </GroupCard>
      {canEdit && rows.length > 1 ? <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">Arrastra ⋮⋮ para cambiar el orden en toda la app.</p> : null}

      <CategorySheet
        clubId={clubId}
        row={edit}
        branches={branches}
        nextOrder={rows.length + 1}
        onClose={() => setEdit(null)}
        onChanged={invalidate}
      />
    </section>
  );
}

function CategoryRow({ row, canEdit, counts, onOpen }: { row: TeamRow; canEdit: boolean; counts?: { players: number; staff: number }; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: !canEdit });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center bg-card ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      {canEdit ? (
        <button type="button" aria-label={`Mover ${row.name}`} className="flex h-12 w-10 shrink-0 touch-none items-center justify-center text-muted-foreground/70" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      ) : <span className="w-3" />}
      <button type="button" onClick={onOpen} className="coord-press flex min-h-12 min-w-0 flex-1 items-center gap-2 py-2 pr-3 text-left outline-none">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className="truncate">{row.name}</span>
            {row.is_primary ? <Star aria-label="Principal" className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" /> : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {counts ? `${counts.players} jugadores · ${counts.staff} staff` : "0 jugadores · 0 staff"}
          </span>
        </span>
        {canEdit ? <span aria-hidden className="text-muted-foreground/60">›</span> : null}
      </button>
    </div>
  );
}

function CategorySheet({
  clubId, row, branches, nextOrder, onClose, onChanged,
}: { clubId: string; row: TeamRow | "new" | null; branches: string[]; nextOrder: number; onClose: () => void; onChanged: () => void }) {
  const isNew = row === "new";
  const current = row && row !== "new" ? row : null;
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [confirmDel, setConfirmDel] = React.useState(false);

  React.useEffect(() => {
    setName(current?.name ?? "");
    setCategory(current?.category ?? "");
    setBlocked(null);
    setConfirmDel(false);
  }, [row]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!name.trim()) return toast.error("Escribe el nombre");
    setBusy(true);
    try {
      if (current) {
        const { error } = await supabase.from("teams").update({ name: name.trim(), category: (category.trim() || null) as any }).eq("id", current.id);
        if (error) throw error;
        toast.success("Categoría actualizada");
      } else {
        const payload: any = { club_id: clubId, name: name.trim(), display_order: nextOrder };
        if (category.trim()) payload.category = category.trim();
        const { error } = await supabase.from("teams").insert(payload);
        if (error) throw error;
        const { data: all } = await db.from("member_all_categories").select("user_id").eq("club_id", clubId);
        const n = new Set(((all ?? []) as { user_id: string }[]).map((r) => r.user_id)).size;
        toast.success(
          n > 0
            ? `Se asignó automáticamente a ${n === 1 ? "la persona" : `las ${n} personas`} con Todas las categorías`
            : "Categoría creada",
          { duration: 6000 },
        );
      }
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary() {
    if (!current) return;
    setBusy(true);
    try {
      const { error: e1 } = await db.from("teams").update({ is_primary: false }).eq("club_id", clubId).eq("is_primary", true);
      if (e1) throw e1;
      const { error } = await db.from("teams").update({ is_primary: true }).eq("id", current.id);
      if (error) throw error;
      toast.success(`${current.name} es la categoría principal`);
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo marcar como principal");
    } finally {
      setBusy(false);
    }
  }

  async function tryDelete() {
    if (!current) return;
    setBusy(true);
    try {
      const used = await categoryUsage(current.id);
      if (used.length) {
        setBlocked(`Tiene ${joinEs(used)}. Reasigna o quita esos datos antes de eliminarla.`);
        return;
      }
      if (!confirmDel) { setConfirmDel(true); return; }
      const { error } = await supabase.from("teams").delete().eq("id", current.id);
      if (error) throw error;
      toast.success("Categoría eliminada");
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ClubSheet open={row !== null} onOpenChange={(o) => !o && onClose()} title={isNew ? "Agregar categoría" : current?.name ?? ""}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name" className="text-xs text-muted-foreground">Nombre</Label>
          <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" placeholder="Sub-17" enterKeyHint="done" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-type" className="text-xs text-muted-foreground">Tipo (opcional)</Label>
          <Input id="cat-type" list="cat-types" value={category} onChange={(e) => setCategory(e.target.value)} className="h-11" placeholder="Varonil, Femenil, Fuerzas básicas…" />
          <datalist id="cat-types">{branches.map((b) => <option key={b} value={b} />)}</datalist>
        </div>
        <Button className="h-11 w-full" disabled={busy || !name.trim()} onClick={save}>{isNew ? "Agregar" : "Guardar"}</Button>

        {current ? (
          <div className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-background/60">
            {!current.is_primary ? (
              <button type="button" disabled={busy} onClick={makePrimary} className="coord-press flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm">
                <Star className="h-4 w-4 text-primary" /> Marcar como principal
              </button>
            ) : (
              <p className="flex min-h-12 items-center gap-2 px-3 text-sm text-muted-foreground"><Star className="h-4 w-4 fill-primary text-primary" /> Es la categoría principal</p>
            )}
            <button type="button" disabled={busy} onClick={tryDelete} className="coord-press flex min-h-12 w-full items-center px-3 text-left text-sm font-semibold text-destructive">
              {confirmDel ? "Toca otra vez para eliminar definitivamente" : "Eliminar categoría"}
            </button>
          </div>
        ) : null}
        {blocked ? (
          <p role="alert" className="rounded-xl bg-urgency-amber-soft px-3 py-2.5 text-sm text-urgency-amber">
            No se puede eliminar. {blocked}
          </p>
        ) : null}
      </div>
    </ClubSheet>
  );
}
