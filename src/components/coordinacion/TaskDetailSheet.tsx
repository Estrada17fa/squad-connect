import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Pencil, AlertTriangle, CalendarClock, Info, Layers, ListChecks, Users } from "lucide-react";
import {
  DetailSheet,
  DetailBadge,
  DetailField,
  DetailGrid,
  DetailPeopleList,
  DetailSection,
  DetailValue,
  DetailEmptyBlock,
} from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { TaskChecklist } from "./TaskChecklist";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/calendar-utils";
import type { TaskRow, TaskStatus } from "@/hooks/useCoordinacion";
import { PRIORITY_DOT, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/coordinacion";
import { TASK_PRIORITY_ACCENT } from "@/lib/accents";
import { cn } from "@/lib/utils";


const STATUSES: TaskStatus[] = ["pendiente", "en_progreso", "en_pausa", "completada"];

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
  const [confirmDelete, setConfirmDelete] = React.useState(false);
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
      setConfirmDelete(false);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  if (!task) return null;

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        title={task.title}
        icon={ListChecks}
        description={task.team?.name ?? "Todo el club"}
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
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
              </Button>
            </>
          ) : undefined
        }
      >
        <DetailSection title="Estado">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => {
              const active = task.status === s;
              const disabled = !canChangeStatus || setStatus.isPending;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => setStatus.mutate(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                    disabled && !active && "cursor-not-allowed opacity-50",
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
          {!canChangeStatus ? (
            <p className="text-xs text-muted-foreground">Solo asignados o editores pueden cambiar el estado.</p>
          ) : null}
        </DetailSection>

        <DetailGrid>
          <DetailField label="Prioridad">
            <span className="inline-flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", PRIORITY_DOT[task.priority])} />
              {PRIORITY_LABEL[task.priority]}
            </span>
          </DetailField>

          <DetailField label="Alcance" icon={Layers}>
            {task.team?.name ?? "Todo el club"}
          </DetailField>

          <DetailField label="Fecha límite" icon={CalendarClock} full>
            {task.due_at ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>{formatDateTime(task.due_at)}</span>
                {overdue ? (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> Vencida
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="text-muted-foreground">Sin fecha límite</span>
            )}
          </DetailField>

          {task.description ? (
            <DetailField label="Descripción" full>
              <DetailValue value={task.description} />
            </DetailField>
          ) : null}
        </DetailGrid>

        <DetailSection title={`Asignados (${task.assignees.length})`}>
          <AvatarStack people={task.assignees} max={8} size="md" />
          {task.assignees.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {task.assignees.map((a) => (
                <li key={a.id} className="text-foreground [overflow-wrap:anywhere]">
                  {a.full_name ?? a.email ?? "—"}
                </li>
              ))}
            </ul>
          ) : null}
        </DetailSection>

        <DetailSection title={<span className="inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Subtareas</span>}>
          <TaskChecklist taskId={task.id} canEdit={canChangeStatus} />
        </DetailSection>

        <DetailGrid className="pt-1 text-xs">
          <DetailField label="Creada">{formatDateTime(task.created_at)}</DetailField>
          {task.completed_at ? (
            <DetailField label="Completada">{formatDateTime(task.completed_at)}</DetailField>
          ) : null}
        </DetailGrid>
      </DetailSheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar esta tarea?"
        description="Se eliminarán también sus subtareas y asignaciones."
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
