import * as React from "react";
import { AlertTriangle, CalendarClock, ChevronDown, ChevronRight, Columns3, List, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarStack } from "./AvatarStack";
import { PRIORITY_DOT, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/coordinacion";
import { TASK_GROUPS, groupOf, type TaskGroup, type TaskRow, type TaskStatus } from "@/hooks/useCoordinacion";
import { formatDateTime } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

const MOVE_TO: { key: TaskStatus; label: string }[] = [
  { key: "pendiente", label: "Por hacer" },
  { key: "en_progreso", label: "En progreso" },
  { key: "en_pausa", label: "En pausa" },
  { key: "completada", label: "Hecha" },
];

function isOverdue(t: TaskRow) {
  return !!t.due_at && t.status !== "completada" && new Date(t.due_at) < new Date();
}

/** Fila/tarjeta de tarea: barra de prioridad, título, avatares, fecha, categoría. */
export function TaskCard({
  task,
  canChangeStatus,
  onOpen,
  onStatus,
  draggable,
}: {
  task: TaskRow;
  canChangeStatus: boolean;
  onOpen: () => void;
  onStatus: (s: TaskStatus) => void;
  draggable?: boolean;
}) {
  const overdue = isOverdue(task);
  return (
    <div
      draggable={draggable && canChangeStatus}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className={cn(
        "group relative flex items-start gap-3 overflow-hidden rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur transition-colors hover:border-primary/40",
        draggable && canChangeStatus && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-1", PRIORITY_DOT[task.priority])}
        title={PRIORITY_LABEL[task.priority]}
      />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 pl-1.5 text-left">
        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5">
            {task.team?.name ?? "Todo el club"}
          </span>
          {task.due_at ? (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-destructive")}>
              {overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
              {formatDateTime(task.due_at)}
            </span>
          ) : null}
          {task.status === "en_pausa" ? (
            <span className="rounded-full bg-status-pending px-2 py-0.5 text-status-pending-foreground">
              {STATUS_LABEL.en_pausa}
            </span>
          ) : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <AvatarStack people={task.assignees} max={3} />
        {canChangeStatus ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Cambiar estado">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {MOVE_TO.map((s) => (
                <DropdownMenuItem
                  key={s.key}
                  disabled={s.key === task.status}
                  onSelect={() => onStatus(s.key)}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

/** Tablero: grupos apilados (móvil) o columnas kanban con arrastrar (escritorio). */
export function TaskBoard({
  tasks,
  userId,
  canEdit,
  onOpen,
  onStatus,
}: {
  tasks: TaskRow[];
  userId: string;
  canEdit: boolean;
  onOpen: (t: TaskRow) => void;
  onStatus: (t: TaskRow, s: TaskStatus) => void;
}) {
  const [view, setView] = React.useState<"lista" | "kanban">("lista");
  const [collapsed, setCollapsed] = React.useState<Record<TaskGroup, boolean>>({
    por_hacer: false,
    en_progreso: false,
    hecha: false,
  });
  const [dragOver, setDragOver] = React.useState<TaskGroup | null>(null);

  const byGroup = React.useMemo(() => {
    const out: Record<TaskGroup, TaskRow[]> = { por_hacer: [], en_progreso: [], hecha: [] };
    for (const t of tasks) out[groupOf(t.status)].push(t);
    return out;
  }, [tasks]);

  const canChange = (t: TaskRow) => canEdit || t.assignees.some((a) => a.id === userId);

  function drop(group: TaskGroup, id: string) {
    setDragOver(null);
    const task = tasks.find((t) => t.id === id);
    if (!task || !canChange(task)) return;
    const target = TASK_GROUPS.find((g) => g.key === group)!.status;
    if (groupOf(task.status) === group) return;
    onStatus(task, target);
  }

  return (
    <div className="space-y-3">
      <div className="hidden justify-end lg:flex">
        <div className="inline-flex rounded-full border border-border/60 p-0.5">
          {[
            { key: "lista" as const, label: "Grupos", icon: List },
            { key: "kanban" as const, label: "Kanban", icon: Columns3 },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  view === v.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "kanban" ? (
        <div className="hidden gap-3 lg:grid lg:grid-cols-3">
          {TASK_GROUPS.map((g) => (
            <div
              key={g.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(g.key);
              }}
              onDragLeave={() => setDragOver((v) => (v === g.key ? null : v))}
              onDrop={(e) => {
                e.preventDefault();
                drop(g.key, e.dataTransfer.getData("text/plain"));
              }}
              className={cn(
                "min-h-40 space-y-2 rounded-xl border border-border/60 bg-white/[0.02] p-2 transition-colors",
                dragOver === g.key && "border-primary/60 bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{g.label}</span>
                <span className="tabular-nums">{byGroup[g.key].length}</span>
              </div>
              {byGroup[g.key].map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  draggable
                  canChangeStatus={canChange(t)}
                  onOpen={() => onOpen(t)}
                  onStatus={(s) => onStatus(t, s)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className={cn("space-y-3", view === "kanban" && "lg:hidden")}>
        {TASK_GROUPS.map((g) => {
          const list = byGroup[g.key];
          const isOpen = !collapsed[g.key];
          return (
            <section key={g.key} className="space-y-2">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {list.length}
                </span>
              </button>
              {isOpen ? (
                list.length === 0 ? (
                  <p className="px-2 text-sm text-muted-foreground">Nada aquí.</p>
                ) : (
                  <div className="space-y-2">
                    {list.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        canChangeStatus={canChange(t)}
                        onOpen={() => onOpen(t)}
                        onStatus={(s) => onStatus(t, s)}
                      />
                    ))}
                  </div>
                )
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
