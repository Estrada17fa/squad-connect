import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import type { TaskRow, TaskPriority, TaskStatus } from "@/hooks/useCoordinacion";
import { PRIORITY_LABEL, PRIORITY_ORDER, PRIORITY_DOT, STATUS_LABEL } from "@/lib/coordinacion";
import { AssignmentPicker, detectScope, type AssignmentValue } from "./AssignmentPicker";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  teams: { id: string | null; name: string }[];
  task?: TaskRow | null;
  onSaved?: (info: { isEdit: boolean; assigneeIds: string[]; priority: TaskPriority }) => void;
}

const STATUSES: TaskStatus[] = ["pendiente", "en_progreso", "en_pausa", "completada"];

export function TaskFormDialog({ open, onOpenChange, clubId, userId, teams, task, onSaved }: Props) {
  const isEdit = !!task;
  const qc = useQueryClient();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("media");
  const [status, setStatus] = React.useState<TaskStatus>("pendiente");
  const [assignment, setAssignment] = React.useState<AssignmentValue>({
    scope: "personas",
    teamId: null,
    userIds: [],
  });
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueAt(task?.due_at ? toLocalInputValue(task.due_at) : "");
    setPriority(task?.priority ?? "media");
    setStatus(task?.status ?? "pendiente");
    setAssignment(
      task
        ? detectScope(task.team_id, (task.assignees ?? []).map((a) => a.id))
        : { scope: "personas", teamId: null, userIds: [userId] },
    );
  }, [open, task, userId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("El título es obligatorio");
      if (assignment.scope === "categoria" && !assignment.teamId)
        throw new Error("Elige la categoría");
      const payload = {
        club_id: clubId,
        team_id: assignment.scope === "categoria" ? assignment.teamId : null,
        title: title.trim(),
        description: description.trim() || null,
        due_at: dueAt ? fromLocalInputValue(dueAt) : null,
        priority,
        status,
      };
      let taskId = task?.id;
      if (isEdit && task) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert({ ...payload, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        taskId = data.id;
      }
      if (!taskId) return;
      const wanted = new Set(assignment.userIds);
      const { data: existing } = await supabase
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", taskId);
      const existingIds = new Set((existing ?? []).map((r) => r.user_id));
      const toAdd = [...wanted].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !wanted.has(id));
      if (toAdd.length) {
        const { error } = await supabase
          .from("task_assignees")
          .insert(toAdd.map((user_id) => ({ task_id: taskId!, user_id })));
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("task_assignees")
          .delete()
          .eq("task_id", taskId)
          .in("user_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Tarea actualizada" : "Tarea creada");
      qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] });
      qc.invalidateQueries({ queryKey: ["home-my-tasks"] });
      onSaved?.({ isEdit, assigneeIds: assignment.userIds, priority });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
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

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange}>
        <EntitySheetHeader>
          <EntitySheetTitle>{isEdit ? "Editar tarea" : "Nueva tarea"}</EntitySheetTitle>
          <EntitySheetDescription>Coordina al equipo de trabajo del club.</EntitySheetDescription>
        </EntitySheetHeader>

        <EntitySheetBody>
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p.ej. Preparar informe médico"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Descripción</Label>
            <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Fecha límite (opcional)</Label>
              <Input id="task-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      status === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridad</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    priority === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[p])} />
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <AssignmentPicker clubId={clubId} teams={teams} value={assignment} onChange={setAssignment} />
        </EntitySheetBody>

        <EntitySheetFooter>
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {isEdit ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </EntitySheetFooter>
      </EntitySheet>

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
