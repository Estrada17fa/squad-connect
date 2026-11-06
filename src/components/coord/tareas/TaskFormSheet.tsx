import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Check, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useClubStaff, type TaskPriority, type TaskRow } from "@/hooks/useCoordinacion";
import { initialsOf } from "@/lib/coordinacion";
import { cn } from "@/lib/utils";
import { Segmented } from "./parts";

export interface CategoryOption { id: string | null; name: string }

/* ------------------------------ Fecha límite ------------------------------ */

function atTime(d: Date, h = 18) {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0);
  // "Hoy" después de las 6 pm: al final del día para no nacer vencida.
  const now = new Date();
  if (out < now && out.toDateString() === now.toDateString()) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59);
  return out;
}
function nextFriday(now: Date) {
  const add = (5 - now.getDay() + 7) % 7 || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + add);
}

export function DuePicker({ value, onChange }: { value: Date | null; onChange: (d: Date | null) => void }) {
  const [open, setOpen] = React.useState(false);
  const now = new Date();
  const shortcuts = [
    { label: "Hoy", d: now },
    { label: "Mañana", d: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) },
    { label: "Viernes", d: nextFriday(now) },
  ];
  const time = value ? format(value, "HH:mm") : "18:00";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {shortcuts.map((s) => {
          const on = value && format(value, "yyyy-MM-dd") === format(s.d, "yyyy-MM-dd");
          return (
            <button key={s.label} type="button" onClick={() => onChange(atTime(s.d, value ? value.getHours() : 18))}
              className={cn("coord-press min-h-9 rounded-full px-3 text-xs font-semibold", on ? "bg-area-general text-background" : "bg-muted")}>
              {s.label}
            </button>
          );
        })}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="coord-press inline-flex min-h-9 items-center gap-1 rounded-full bg-muted px-3 text-xs font-semibold">
              <CalendarDays className="h-3.5 w-3.5" /> Otra fecha
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" locale={es} selected={value ?? undefined} defaultMonth={value ?? now}
              onSelect={(d) => { if (d) { onChange(atTime(d, value ? value.getHours() : 18)); setOpen(false); } }} />
          </PopoverContent>
        </Popover>
        {value ? (
          <button type="button" onClick={() => onChange(null)} className="coord-press min-h-9 rounded-full px-2 text-xs text-muted-foreground">Quitar</button>
        ) : null}
      </div>
      {value ? (
        <div className="flex items-center gap-2 text-sm">
          <span>{(() => { const t = format(value, "EEEE d 'de' MMMM", { locale: es }); return t.charAt(0).toUpperCase() + t.slice(1); })()}</span>
          <input type="time" value={time} aria-label="Hora"
            onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); if (!isNaN(h)) onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate(), h, m || 0)); }}
            className="h-9 rounded-lg bg-muted px-2 text-sm outline-none" />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Responsables ------------------------------ */

export function StaffPicker({ clubId, value, onChange }: { clubId: string | null; value: string[]; onChange: (ids: string[]) => void }) {
  const staff = useClubStaff(clubId);
  const [q, setQ] = React.useState("");
  const list = (staff.data ?? []).filter((p) => !q || (p.full_name ?? p.email ?? "").toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona…" className="h-10 rounded-xl" />
      <ul className="max-h-48 overflow-y-auto rounded-xl bg-card">
        {list.map((p) => {
          const on = value.includes(p.id);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => toggle(p.id)} className="coord-press flex w-full items-center gap-3 px-3 py-2 text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initialsOf(p.full_name, p.email)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{p.full_name ?? p.email}</span>
                  {p.role_name ? <span className="block truncate text-[11px] text-muted-foreground">{p.role_name}</span> : null}
                </span>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", on ? "border-area-general bg-area-general text-background" : "border-muted-foreground/40")}>
                  {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 ? <li className="px-3 py-3 text-xs text-muted-foreground">Sin resultados</li> : null}
      </ul>
    </div>
  );
}

/* --------------------------------- Hoja ---------------------------------- */

const PRIORITIES: { key: TaskPriority; label: string }[] = [
  { key: "baja", label: "Baja" },
  { key: "media", label: "Media" },
  { key: "alta", label: "Alta" },
];

export function TaskFormSheet({
  open, onOpenChange, clubId, userId, categories, task, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubId: string;
  userId: string;
  /** Categorías donde el usuario puede crear (incluye "Todo el club" con id null si aplica). */
  categories: CategoryOption[];
  /** Si viene, edita esa tarea. */
  task?: TaskRow | null;
  onSaved?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!task;
  const [title, setTitle] = React.useState("");
  const [assignees, setAssignees] = React.useState<string[]>([]);
  const [due, setDue] = React.useState<Date | null>(null);
  const [more, setMore] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("media");
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [steps, setSteps] = React.useState<string[]>([]);
  const [step, setStep] = React.useState("");
  const [evidence, setEvidence] = React.useState(false);
  const [showPeople, setShowPeople] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const staff = useClubStaff(clubId);

  React.useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setAssignees(task ? task.assignees.map((a) => a.id) : [userId]);
    setDue(task?.due_at ? new Date(task.due_at) : null);
    setDescription(task?.description ?? "");
    setPriority(task ? (task.priority === "urgente" ? "alta" : task.priority) : "media");
    setTeamId(task ? task.team_id : (categories.find((c) => c.id === null) ? null : categories[0]?.id ?? null));
    setEvidence(task?.requires_evidence ?? false);
    setSteps([]);
    setStep("");
    setMore(isEdit);
    setShowPeople(false);
  }, [open, task, userId, categories, isEdit]);

  const chosen = (staff.data ?? []).filter((p) => assignees.includes(p.id));

  async function save() {
    if (!title.trim()) return toast.error("Escribe un título");
    if (!categories.some((c) => c.id === teamId)) return toast.error("Elige una categoría");
    setSaving(true);
    try {
      const payload = {
        club_id: clubId,
        team_id: teamId,
        title: title.trim(),
        description: description.trim() || null,
        due_at: due ? due.toISOString() : null,
        priority: task?.priority === "urgente" && priority === "alta" ? ("urgente" as const) : priority,
        requires_evidence: evidence,
      };
      let id = task?.id;
      if (task) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("tasks").insert({ ...payload, created_by: userId }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const before = new Set(task?.assignees.map((a) => a.id) ?? []);
      const add = assignees.filter((a) => !before.has(a));
      const remove = [...before].filter((a) => !assignees.includes(a));
      if (add.length) {
        const { error } = await supabase.from("task_assignees").insert(add.map((user_id) => ({ task_id: id!, user_id })));
        if (error) throw error;
      }
      if (remove.length) {
        const { error } = await supabase.from("task_assignees").delete().eq("task_id", id!).in("user_id", remove);
        if (error) throw error;
      }
      const pending = [...steps, ...(step.trim() ? [step.trim()] : [])];
      if (!task && pending.length) {
        const { error } = await supabase.from("task_checklist_items").insert(pending.map((content, i) => ({ task_id: id!, content, order_index: i, created_by: userId })));
        if (error) throw error;
      }
      toast.success(isEdit ? "Tarea actualizada" : "Tarea creada");
      qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] });
      qc.invalidateQueries({ queryKey: ["home-my-tasks"] });
      onOpenChange(false);
      onSaved?.(id!);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-0 bg-background px-4 pb-6 pt-4">
        <SheetHeader className="mb-3 text-left">
          <SheetTitle className="font-display">{isEdit ? "Editar tarea" : "Nueva tarea"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <Input autoFocus={!isEdit} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" className="h-12 rounded-xl text-base" />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Responsables</p>
            <button type="button" onClick={() => setShowPeople((v) => !v)} className="coord-press flex min-h-11 w-full items-center gap-2 rounded-xl bg-card px-3 text-left text-sm">
              {chosen.length ? (
                <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {chosen.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-0.5 pr-2 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-background text-[9px] font-semibold">
                        {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initialsOf(p.full_name, p.email)}
                      </span>
                      {(p.full_name ?? p.email ?? "").split(" ")[0]}
                    </span>
                  ))}
                </span>
              ) : <span className="flex-1 text-muted-foreground">Elegir personas</span>}
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", showPeople && "rotate-180")} />
            </button>
            {showPeople ? <StaffPicker clubId={clubId} value={assignees} onChange={setAssignees} /> : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Fecha límite</p>
            <DuePicker value={due} onChange={setDue} />
          </div>

          {!more ? (
            <button type="button" onClick={() => setMore(true)} className="coord-press inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-area-general">
              <Plus className="h-4 w-4" /> Más detalles
            </button>
          ) : (
            <div className="space-y-4">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" rows={3} className="rounded-xl" />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Prioridad</p>
                <Segmented items={PRIORITIES} value={priority} onChange={setPriority} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Categoría</p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <button key={c.id ?? "club"} type="button" onClick={() => setTeamId(c.id)}
                      className={cn("coord-press min-h-9 rounded-full px-3 text-xs font-semibold", teamId === c.id ? "bg-area-general text-background" : "bg-muted")}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {!isEdit ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Checklist</p>
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm">
                      <span className="h-4 w-4 shrink-0 rounded border border-muted-foreground/50" />
                      <span className="flex-1">{s}</span>
                      <button type="button" aria-label="Quitar paso" onClick={() => setSteps(steps.filter((_, j) => j !== i))}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input value={step} onChange={(e) => setStep(e.target.value)} placeholder="Agregar paso"
                      onKeyDown={(e) => { if (e.key === "Enter" && step.trim()) { e.preventDefault(); setSteps([...steps, step.trim()]); setStep(""); } }}
                      className="h-10 rounded-xl" />
                    <button type="button" aria-label="Agregar paso" onClick={() => { if (step.trim()) { setSteps([...steps, step.trim()]); setStep(""); } }}
                      className="coord-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : null}
              <label className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-3 text-sm">
                <span>Pedir foto al completar</span>
                <Switch checked={evidence} onCheckedChange={setEvidence} aria-label="Pedir foto al completar" />
              </label>
            </div>
          )}

          <button type="button" disabled={saving} onClick={save}
            className="coord-press flex min-h-12 w-full items-center justify-center rounded-xl bg-area-general text-sm font-bold text-background disabled:opacity-60">
            {saving ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
