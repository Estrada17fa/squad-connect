import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TeamSelectField } from "@/components/squad/TeamSelectField";
import type { TeamOption } from "@/hooks/useAccess";
import { useSaveRoutine, type ExerciseDraft, type RoutineRow } from "@/hooks/useDevelopment";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  teams: TeamOption[];
  routine?: RoutineRow | null;
}

const emptyExercise = (): ExerciseDraft => ({ name: "", sets: "", reps: "", instructions: "" });

export function RoutineFormDialog({ open, onOpenChange, clubId, userId, teams, routine }: Props) {
  const isEdit = !!routine;
  const save = useSaveRoutine(clubId, userId);

  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [exercises, setExercises] = React.useState<ExerciseDraft[]>([emptyExercise()]);

  React.useEffect(() => {
    if (!open) return;
    setTeamId(routine?.team_id ?? teams[0]?.id ?? null);
    setName(routine?.name ?? "");
    setDescription(routine?.description ?? "");
    setCategory(routine?.category ?? "");
    setExercises(
      routine?.exercises && routine.exercises.length > 0
        ? routine.exercises.map((e) => ({
            name: e.name,
            sets: e.sets != null ? String(e.sets) : "",
            reps: e.reps ?? "",
            instructions: e.instructions ?? "",
          }))
        : [emptyExercise()],
    );
  }, [open, routine, teams]);

  const disabled = !teamId || !name.trim() || save.isPending;

  const submit = () => {
    if (!teamId) return;
    save.mutate(
      {
        id: routine?.id ?? null,
        team_id: teamId,
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        exercises,
      },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Rutina actualizada" : "Rutina creada");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  };

  const setEx = (idx: number, patch: Partial<ExerciseDraft>) =>
    setExercises((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar rutina" : "Nueva rutina"}</EntitySheetTitle>
        <EntitySheetDescription>Rutina física del equipo con sus ejercicios.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <TeamSelectField
          id="routine-team"
          teams={teams}
          value={teamId}
          onChange={setTeamId}
          disabled={isEdit}
        />

        <div className="space-y-1.5">
          <Label htmlFor="routine-name">Nombre</Label>
          <Input
            id="routine-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p.ej. Fuerza de tren inferior"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="routine-cat">Categoría (opcional)</Label>
          <Input
            id="routine-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Fuerza · Movilidad · Recuperación"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="routine-desc">Descripción (opcional)</Label>
          <Textarea
            id="routine-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Ejercicios</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setExercises((p) => [...p, emptyExercise()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
            </Button>
          </div>
          {exercises.map((ex, idx) => (
            <div key={idx} className="glass space-y-2 p-3">
              <div className="flex items-start gap-2">
                <Input
                  value={ex.name}
                  onChange={(e) => setEx(idx, { name: e.target.value })}
                  placeholder="Ejercicio"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => setExercises((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={ex.sets}
                  inputMode="numeric"
                  onChange={(e) => setEx(idx, { sets: e.target.value.replace(/\D/g, "") })}
                  placeholder="Series"
                />
                <Input
                  value={ex.reps}
                  onChange={(e) => setEx(idx, { reps: e.target.value })}
                  placeholder="Repeticiones"
                />
              </div>
              <Textarea
                value={ex.instructions}
                onChange={(e) => setEx(idx, { instructions: e.target.value })}
                placeholder="Instrucciones"
                rows={2}
              />
            </div>
          ))}
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={disabled}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear rutina"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
