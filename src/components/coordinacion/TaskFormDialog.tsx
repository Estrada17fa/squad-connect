import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { useClubStaff, type TaskRow, type TaskPriority } from "@/hooks/useCoordinacion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  task?: TaskRow | null;
  onSaved?: (info: { isEdit: boolean; assigneeIds: string[] }) => void;
}

const PRIORITIES: { key: TaskPriority; label: string }[] = [
  { key: "baja", label: "Baja" },
  { key: "media", label: "Media" },
  { key: "alta", label: "Alta" },
];

export function TaskFormDialog({ open, onOpenChange, clubId, userId, task }: Props) {
  const isEdit = !!task;
  const qc = useQueryClient();
  const staffQ = useClubStaff(clubId);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("media");
  const [assignees, setAssignees] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueAt(task?.due_at ? toLocalInputValue(task.due_at) : "");
    setPriority(task?.priority ?? "media");
    setAssignees(new Set((task?.assignees ?? []).map((a) => a.id)));
    setSearch("");
  }, [open, task]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("El título es obligatorio");
      const payload = {
        club_id: clubId,
        title: title.trim(),
        description: description.trim() || null,
        due_at: dueAt ? fromLocalInputValue(dueAt) : null,
        priority,
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
      const { data: existing } = await supabase
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", taskId);
      const existingIds = new Set((existing ?? []).map((r) => r.user_id));
      const toAdd = [...assignees].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !assignees.has(id));
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
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  const filtered = (staffQ.data ?? []).filter((m) =>
    (m.full_name ?? m.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    setAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>Coordina al staff del club.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p.ej. Preparar informe médico" />
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
              <Label>Prioridad</Label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPriority(p.key)}
                    className={cn(
                      "flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      priority === p.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Asignados ({assignees.size})</Label>
            <Input placeholder="Buscar staff…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60">
              {filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Sin miembros</div>
              ) : (
                filtered.map((m) => {
                  const selected = assignees.has(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.04]",
                        selected && "bg-white/[0.06]",
                      )}
                    >
                      <span className="truncate">
                        <span className="text-foreground">{m.full_name ?? m.email ?? "—"}</span>
                        {m.role_name ? <span className="ml-2 text-xs text-muted-foreground">{m.role_name}</span> : null}
                      </span>
                      <span className={cn("h-4 w-4 shrink-0 rounded border", selected ? "border-primary bg-primary" : "border-border")} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {isEdit ? "Guardar cambios" : "Crear tarea"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
