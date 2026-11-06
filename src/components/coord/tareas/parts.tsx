import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Camera, Check, Flag, Loader2, MapPin, MessageCircle, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AvatarStack } from "@/components/coordinacion/AvatarStack";
import { dueLabel, whenGroup } from "@/lib/tareas";
import type { TaskRow } from "@/hooks/useCoordinacion";
import { useTaskMutations } from "@/hooks/useTaskExtras";

/**
 * Círculo para completar de un toque. Si la tarea pide foto, primero abre
 * cámara/galería y sube la evidencia; la base vuelve a validar.
 */
export function TaskCheck({
  task, userId, clubId, canAct, size = "md",
}: { task: Pick<TaskRow, "id" | "status" | "requires_evidence">; userId: string; clubId: string | null; canAct: boolean; size?: "md" | "lg" }) {
  const { setStatus, completeWithEvidence } = useTaskMutations(clubId);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const done = task.status === "completada";
  const busy = setStatus.isPending || completeWithEvidence.isPending;
  const dim = size === "lg" ? "h-7 w-7" : "h-6 w-6";

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canAct || busy) return;
    if (!done && task.requires_evidence) return fileRef.current?.click();
    setStatus.mutate(
      { id: task.id, status: done ? "pendiente" : "completada" },
      { onSuccess: () => !done && toast.success("Tarea hecha"), onError: (err: any) => toast.error(err.message) },
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    completeWithEvidence.mutate(
      { taskId: task.id, userId, file },
      { onSuccess: () => toast.success("Evidencia subida · Tarea hecha"), onError: (err: any) => toast.error(err.message ?? "No se pudo subir la foto") },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={!canAct}
        aria-label={done ? "Marcar como pendiente" : task.requires_evidence ? "Subir foto y completar" : "Completar tarea"}
        className={cn(
          "coord-press flex shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-40",
          dim,
          done ? "border-area-general bg-area-general text-background" : "border-muted-foreground/50 hover:border-area-general",
        )}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} onClick={(e) => e.stopPropagation()} />
    </>
  );
}

export function TaskListRow({ task, userId, clubId, canAct }: { task: TaskRow; userId: string; clubId: string | null; canAct: boolean }) {
  const label = dueLabel(task.due_at);
  const overdue = whenGroup(task) === "vencidas";
  const cat = task.team?.name ?? "Todo el club";
  const done = task.status === "completada";
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <TaskCheck task={task} userId={userId} clubId={clubId} canAct={canAct} />
      <Link
        to="/coordinacion/general/tareas/$taskId"
        params={{ taskId: task.id }}
        className="coord-press flex min-w-0 flex-1 items-center gap-2 outline-none focus-visible:underline"
      >
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", done && "text-muted-foreground line-through")}>{task.title}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {label ? <span className={cn(overdue && "text-urgency-red")}>{label}</span> : null}
            {label ? " · " : ""}
            {cat}
            {task.location ? <> · <MapPin className="inline h-3 w-3 -translate-y-px" aria-label="Lugar" /> {task.location.name.split(",")[0]}</> : null}
            {task.status === "en_pausa" ? " · En pausa" : ""}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          {task.priority === "alta" || task.priority === "urgente" ? <Flag className="h-3.5 w-3.5 text-urgency-red" aria-label="Prioridad alta" /> : null}
          {task.requires_evidence ? <Camera className="h-3.5 w-3.5" aria-label="Pide foto" /> : null}
          {task.checklist_total > 0 ? (
            <span className="inline-flex items-center gap-0.5"><ListChecks className="h-3.5 w-3.5" />{task.checklist_done}/{task.checklist_total}</span>
          ) : null}
          {task.comment_count > 0 ? (
            <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3.5 w-3.5" />{task.comment_count}</span>
          ) : null}
          {task.assignees.length ? <AvatarStack people={task.assignees} max={3} /> : null}
        </span>
      </Link>
    </li>
  );
}

/** Control segmentado simple. */
export function Segmented<T extends string>({
  items, value, onChange, disabled, className,
}: { items: { key: T; label: string }[]; value: T; onChange: (v: T) => void; disabled?: boolean; className?: string }) {
  return (
    <div role="radiogroup" className={cn("flex rounded-xl bg-muted p-0.5", className)}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="radio"
          aria-checked={value === it.key}
          disabled={disabled}
          onClick={() => onChange(it.key)}
          className={cn(
            "min-h-9 flex-1 rounded-[10px] px-2 text-xs font-semibold transition-colors disabled:opacity-60",
            value === it.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
