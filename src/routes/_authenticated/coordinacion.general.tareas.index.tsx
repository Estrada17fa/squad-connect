import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ListChecks, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApp } from "@/components/squad/AppLayout";
import { useMeetings, useTasks, type TaskRow } from "@/hooks/useCoordinacion";
import { splitMeetings } from "@/lib/juntas";
import { MeetingListRow } from "@/components/coord/juntas/MeetingListRow";
import { MeetingFormSheet } from "@/components/coord/juntas/MeetingFormSheet";
import { AreaSwitcher } from "@/components/coord/AreaSwitcher";
import { getArea } from "@/lib/coordAreas";
import { WHEN_GROUPS, whenGroup, isRecentDone, isMine, sortTasks, type WhenGroup } from "@/lib/tareas";
import { STATUS_LABEL } from "@/lib/coordinacion";
import { TaskListRow, Segmented } from "@/components/coord/tareas/parts";
import { TaskFormSheet } from "@/components/coord/tareas/TaskFormSheet";
import { useTaskAccess } from "@/components/coord/tareas/useTaskAccess";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coordinacion/general/tareas/")({
  validateSearch: (s: Record<string, unknown>): { tab?: "juntas"; nueva?: 1 } => (s.tab === "juntas" ? { tab: "juntas", ...(String(s.nueva) === "1" ? { nueva: 1 as const } : {}) } : {}),
  head: () => ({
    meta: [
      { title: "Tareas y juntas — Coordinación Squad" },
      { name: "description", content: "Tareas del staff agrupadas por vencimiento, con checklist, comentarios y evidencia." },
      { property: "og:title", content: "Tareas y juntas — Coordinación Squad" },
      { property: "og:description", content: "Tareas del staff agrupadas por vencimiento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TareasPage,
});

interface Filters { team: string | "all"; person: string | "all"; priority: string | "all"; status: string | "all" }
const NO_FILTERS: Filters = { team: "all", person: "all", priority: "all", status: "all" };

function TareasPage() {
  const area = getArea("general")!;
  const navigate = useNavigate();
  const { profile, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const { userId, categories, canCreate, canAct } = useTaskAccess();
  const tasksQ = useTasks(clubId);
  const meetingsQ = useMeetings(clubId);
  const { tab: tabParam, nueva } = Route.useSearch();
  const [creatingMeeting, setCreatingMeeting] = React.useState(nueva === 1);
  const tab = tabParam === "juntas" ? "juntas" : "tareas";
  const [when, setWhen] = React.useState<"proximas" | "pasadas">("proximas");

  const [scope, setScope] = React.useState<"mias" | "todas">("mias");
  const [search, setSearch] = React.useState<string | null>(null);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<Filters>(NO_FILTERS);
  const [creating, setCreating] = React.useState(false);
  const [doneOpen, setDoneOpen] = React.useState(false);
  const [olderDone, setOlderDone] = React.useState(false);

  const all = tasksQ.data ?? [];
  const term = (search ?? "").trim().toLowerCase();
  const visible = all.filter((t) =>
    (scope === "todas" || isMine(t, userId)) &&
    (!term || t.title.toLowerCase().includes(term) || (t.description ?? "").toLowerCase().includes(term)) &&
    (filters.team === "all" || (filters.team === "club" ? t.team_id === null : t.team_id === filters.team)) &&
    (filters.person === "all" || t.assignees.some((a) => a.id === filters.person)) &&
    (filters.priority === "all" || (filters.priority === "alta" ? t.priority === "alta" || t.priority === "urgente" : t.priority === filters.priority)) &&
    (filters.status === "all" || t.status === filters.status),
  );

  const groups = new Map<WhenGroup, TaskRow[]>();
  for (const t of visible) {
    const g = whenGroup(t);
    if (g === "hechas" && !olderDone && !isRecentDone(t)) continue;
    groups.set(g, [...(groups.get(g) ?? []), t]);
  }
  const hiddenDone = visible.filter((t) => t.status === "completada" && !isRecentDone(t)).length;
  const openCount = visible.filter((t) => t.status !== "completada").length;
  const activeFilters = Object.values(filters).filter((v) => v !== "all").length;

  const people = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const t of all) for (const a of t.assignees) m.set(a.id, a.full_name ?? a.email ?? "—");
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [all]);

  return (
    <div className="coord-enter mx-auto max-w-4xl space-y-4 pb-24">
      <header className="sticky top-0 z-20 -mx-4 space-y-1 bg-background/90 px-4 pb-2 pt-1 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link to="/coordinacion/$area" params={{ area: "general" }} className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
            <ChevronLeft className="h-5 w-5" /> General
          </Link>
          <div className="flex gap-1">
            <button aria-label="Buscar" onClick={() => setSearch(search === null ? "" : null)} className={cn("coord-press flex h-10 w-10 items-center justify-center rounded-xl", search !== null && "bg-muted")}>
              <Search className="h-5 w-5" />
            </button>
            <button aria-label="Filtrar" onClick={() => setFilterOpen(true)} className={cn("coord-press relative flex h-10 w-10 items-center justify-center rounded-xl", activeFilters && "bg-muted")}>
              <SlidersHorizontal className="h-5 w-5" />
              {activeFilters ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-area-general" /> : null}
            </button>
            {canCreate ? (
              <button aria-label={tab === "juntas" ? "Nueva junta" : "Nueva tarea"} onClick={() => (tab === "juntas" ? setCreatingMeeting(true) : setCreating(true))} className="coord-press flex h-10 w-10 items-center justify-center rounded-xl">
                <Plus className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>
        <h1 className="flex items-center gap-3 text-xl font-bold">
          <ListChecks className={cn("h-5 w-5", area.text)} /> Tareas y juntas
        </h1>
        {search !== null ? (
          <div className="coord-enter flex items-center gap-2 rounded-xl bg-muted px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tareas…" className="min-h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <button aria-label="Cerrar búsqueda" onClick={() => setSearch(null)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        ) : null}
      </header>

      <AreaSwitcher
        items={[{ key: "tareas", label: "Tareas" }, { key: "juntas", label: "Juntas" }]}
        active={tab}
        onChange={(k) => navigate({ to: "/coordinacion/general/tareas", search: k === "juntas" ? { tab: "juntas" } : {}, replace: true })}
        indicatorClass={area.bg}
      />

      {tab === "juntas" ? (() => {
        const { upcoming, past } = splitMeetings(meetingsQ.data ?? []);
        const list = when === "proximas" ? upcoming : past;
        return (
          <div className="space-y-4">
            <Segmented items={[{ key: "proximas", label: "Próximas" }, { key: "pasadas", label: "Pasadas" }]} value={when} onChange={setWhen} />
            {meetingsQ.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
              : list.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{when === "proximas" ? "No hay juntas próximas." : "Aún no hay juntas pasadas."}</p>
              : <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">{list.map((m) => <MeetingListRow key={m.id} m={m} />)}</ul>}
          </div>
        );
      })() : (<>

      <Segmented items={[{ key: "mias", label: "Mías" }, { key: "todas", label: "Todas" }]} value={scope} onChange={setScope} />

      {tasksQ.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : openCount === 0 && !groups.get("hechas")?.length ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <ListChecks className={cn("h-8 w-8", area.text)} />
          <p className="mt-3 text-sm text-muted-foreground">Nada pendiente. ¡Buen trabajo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {openCount === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nada pendiente. ¡Buen trabajo!</p> : null}
          {WHEN_GROUPS.map(({ key, label }) => {
            const list = groups.get(key);
            if (!list?.length && !(key === "hechas" && hiddenDone)) return null;
            const isDone = key === "hechas";
            const sorted = isDone
              ? [...(list ?? [])].sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
              : sortTasks(list ?? []);
            return (
              <section key={key}>
                {isDone ? (
                  <button onClick={() => setDoneOpen((v) => !v)} className="coord-press mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    {label} · {list?.length ?? 0}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", doneOpen && "rotate-180")} />
                  </button>
                ) : (
                  <h2 className={cn("mb-1.5 text-xs font-semibold", key === "vencidas" ? "text-urgency-red" : "text-muted-foreground")}>
                    {label} · {sorted.length}
                  </h2>
                )}
                {!isDone || doneOpen ? (
                  <>
                    {sorted.length ? (
                      <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
                        {sorted.map((t) => <TaskListRow key={t.id} task={t} userId={userId} clubId={clubId} canAct={canAct(t)} />)}
                      </ul>
                    ) : null}
                    {isDone && !olderDone && hiddenDone > 0 ? (
                      <button onClick={() => setOlderDone(true)} className="coord-press mt-2 text-xs font-semibold text-area-general">Ver anteriores ({hiddenDone})</button>
                    ) : null}
                  </>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      </>)}

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-[22px] border-0 bg-background px-4 pb-6 pt-4">
          <SheetHeader className="mb-3 text-left"><SheetTitle className="font-display">Filtrar</SheetTitle></SheetHeader>
          <div className="space-y-4">
            <ChipGroup label="Categoría" value={filters.team} onChange={(v) => setFilters({ ...filters, team: v })}
              options={[{ v: "all", l: "Todas" }, { v: "club", l: "Todo el club" }, ...teamOptions.filter((t) => t.id).map((t) => ({ v: t.id as string, l: t.name }))]} />
            <ChipGroup label="Responsable" value={filters.person} onChange={(v) => setFilters({ ...filters, person: v })}
              options={[{ v: "all", l: "Todos" }, ...people.map(([v, l]) => ({ v, l }))]} />
            <ChipGroup label="Prioridad" value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v })}
              options={[{ v: "all", l: "Todas" }, { v: "baja", l: "Baja" }, { v: "media", l: "Media" }, { v: "alta", l: "Alta" }]} />
            <ChipGroup label="Estado" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
              options={[{ v: "all", l: "Todos" }, ...(["pendiente", "en_progreso", "en_pausa", "completada"] as const).map((s) => ({ v: s, l: s === "completada" ? "Hecha" : s === "pendiente" ? "Por hacer" : STATUS_LABEL[s] }))]} />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setFilters(NO_FILTERS)} className="coord-press min-h-11 flex-1 rounded-xl bg-muted text-sm font-semibold">Limpiar</button>
              <button onClick={() => setFilterOpen(false)} className="coord-press min-h-11 flex-1 rounded-xl bg-area-general text-sm font-bold text-background">Listo</button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {clubId && canCreate ? (
        <MeetingFormSheet open={creatingMeeting} onOpenChange={setCreatingMeeting} clubId={clubId} userId={userId} categories={categories} />
      ) : null}

      {clubId ? (
        <TaskFormSheet open={creating} onOpenChange={setCreating} clubId={clubId} userId={userId} categories={categories} />
      ) : null}
    </div>
  );
}

function ChipGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cn("coord-press min-h-9 rounded-full px-3 text-xs font-semibold", value === o.v ? "bg-area-general text-background" : "bg-muted")}>
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}
