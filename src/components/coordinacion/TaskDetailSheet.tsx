import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Pencil, AlertTriangle, CalendarClock } from "lucide-react";
import { DetailSheet, DetailField } from "@/components/squad/DetailSheet";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/calendar-utils";
import type { TaskRow, TaskStatus, TaskPriority } from "@/hooks/useCoordinacion";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<TaskPriority, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const PRIORITY_VARIANT: Record<TaskPriority, StatusVariant> = { alta: "rejected", media: "pending", baja: "info" };
const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: "pendiente", label: "Pendiente" },
  { key: "en_progreso", label: "En progreso" },
  { key: "en_pausa", label: "En pausa" },
  { key: "completada", label: "Completada" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: TaskRow | null;
  userId: string;
  clubId: string;
  canEdit: boolean;
  onEdit: () => void;
}

export function TaskDetailSheet({ open, onOpenChange, task, userId, clubId, canEdit, onEdit }: Props) {
  const qc = useQueryClient();
  const isMine = !!task && task.assignees.some((a) => a.id === userId);
  const canChangeStatus = !!task && (canEdit || isMine);
  const overdue = !!task?.due_at && task.status !== "completada" && new Date(task.due_at) < new Date();

  const setStatus = useMutation({
    mutationFn: async (status: TaskStatus) => {
      if (!task) return;
      const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] });
      qc.invalidateQueries({ queryKey: ["home-my-tasks"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarea eliminada");
      qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  if (!task) return null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={task.title}
      description="Detalle de la tarea"
      headerActions={
        canEdit ? (
          <>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (confirm("¿Eliminar esta tarea?")) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </Button>
          </>
        ) : undefined
      }
    >
      <DetailField label="Estado">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = task.status === s.key;
            const disabled = !canChangeStatus || setStatus.isPending;
            return (
              <button
                key={s.key}
                type="button"
                disabled={disabled}
                onClick={() => setStatus.mutate(s.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                  disabled && !active && "opacity-50 cursor-not-allowed",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {!canChangeStatus ? (
          <p className="mt-1 text-xs text-muted-foreground">Solo asignados o editores pueden cambiar el estado.</p>
        ) : null}
      </DetailField>

      <DetailField label="Prioridad">
        <StatusBadge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</StatusBadge>
      </DetailField>

      <DetailField label="Fecha límite" icon={CalendarClock}>
        {task.due_at ? (
          <div className="flex items-center gap-2">
            <span className="text-foreground">{formatDateTime(task.due_at)}</span>
            {overdue ? (
              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> Vencida
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">Sin fecha límite</span>
        )}
      </DetailField>

      {task.description ? (
        <DetailField label="Descripción">
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{task.description}</p>
        </DetailField>
      ) : null}

      <DetailField label={`Asignados (${task.assignees.length})`}>
        {task.assignees.length === 0 ? (
          <span className="text-muted-foreground">Sin asignados</span>
        ) : (
          <ul className="space-y-1.5">
            {task.assignees.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium">
                  {(a.full_name ?? a.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="text-foreground">{a.full_name ?? a.email ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </DetailField>

      <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-muted-foreground">
        <div>
          <div className="uppercase tracking-wider">Creada</div>
          <div className="mt-0.5 text-foreground/80">{formatDateTime(task.created_at)}</div>
        </div>
        {task.completed_at ? (
          <div>
            <div className="uppercase tracking-wider">Completada</div>
            <div className="mt-0.5 text-foreground/80">{formatDateTime(task.completed_at)}</div>
          </div>
        ) : null}
      </div>
    </DetailSheet>
  );
}
