import * as React from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { TeamSelectField } from "@/components/squad/TeamSelectField";
import type { TeamOption } from "@/hooks/useAccess";
import {
  EXERCISE_CATEGORIES,
  useDeleteExercise,
  useSaveExercise,
  type ExerciseCategory,
  type ExerciseRow,
} from "@/hooks/useTraining";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Equipos donde el usuario puede editar el módulo. */
  teams: TeamOption[];
  exercise?: ExerciseRow | null;
}

export function ExerciseFormDialog({ open, onOpenChange, clubId, userId, teams, exercise }: Props) {
  const isEdit = !!exercise;
  const save = useSaveExercise();
  const del = useDeleteExercise();

  const [scope, setScope] = React.useState<"club" | "team">(exercise?.team_id ? "team" : "club");
  const [teamId, setTeamId] = React.useState<string | null>(exercise?.team_id ?? teams[0]?.id ?? null);
  const [name, setName] = React.useState(exercise?.name ?? "");
  const [category, setCategory] = React.useState<ExerciseCategory>(exercise?.category ?? "tecnica");
  const [duration, setDuration] = React.useState(
    exercise?.duration_minutes != null ? String(exercise.duration_minutes) : "",
  );
  const [sets, setSets] = React.useState(
    exercise?.default_sets != null ? String(exercise.default_sets) : "",
  );
  const [reps, setReps] = React.useState(
    exercise?.default_reps != null ? String(exercise.default_reps) : "",
  );
  const [objective, setObjective] = React.useState(exercise?.objective ?? "");
  const [description, setDescription] = React.useState(exercise?.description ?? "");
  const [materials, setMaterials] = React.useState(exercise?.materials ?? "");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setScope(exercise?.team_id ? "team" : "club");
    setTeamId(exercise?.team_id ?? teams[0]?.id ?? null);
    setName(exercise?.name ?? "");
    setCategory(exercise?.category ?? "tecnica");
    setDuration(exercise?.duration_minutes != null ? String(exercise.duration_minutes) : "");
    setSets(exercise?.default_sets != null ? String(exercise.default_sets) : "");
    setReps(exercise?.default_reps != null ? String(exercise.default_reps) : "");
    setObjective(exercise?.objective ?? "");
    setDescription(exercise?.description ?? "");
    setMaterials(exercise?.materials ?? "");
    setFile(null);
  }, [open, exercise, teams]);

  async function handleSave() {
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (scope === "team" && !teamId) return toast.error("Selecciona un equipo");
    setBusy(true);
    try {
      let mediaPath = exercise?.media_path ?? null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${clubId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("exercise-media").upload(path, file);
        if (error) throw error;
        mediaPath = path;
      }
      await save.mutateAsync({
        id: exercise?.id,
        club_id: clubId,
        team_id: scope === "team" ? teamId : null,
        name: name.trim(),
        category,
        duration_minutes: duration ? Number(duration) : null,
        default_sets: sets ? Number(sets) : null,
        default_reps: reps ? Number(reps) : null,
        objective: objective.trim() || null,
        description: description.trim() || null,
        materials: materials.trim() || null,
        media_path: mediaPath,
        ...(isEdit ? {} : { created_by: userId }),
      });
      toast.success(isEdit ? "Ejercicio actualizado" : "Ejercicio creado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!exercise) return;
    try {
      await del.mutateAsync(exercise.id);
      toast.success("Ejercicio eliminado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar ejercicio" : "Nuevo ejercicio"}</EntitySheetTitle>
        <EntitySheetDescription>
          Se guarda en la biblioteca y puede reutilizarse en cualquier sesión.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="ex-name">Nombre</Label>
          <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p.ej. Rondo 4v2" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ex-cat">Categoría</Label>
            <select
              id="ex-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {EXERCISE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-dur">Duración (min)</Label>
            <Input
              id="ex-dur"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ex-scope">Alcance</Label>
          <select
            id="ex-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as "club" | "team")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="club">Todo el club</option>
            <option value="team">Un equipo</option>
          </select>
        </div>

        {scope === "team" ? (
          <TeamSelectField id="ex-team" teams={teams} value={teamId} onChange={setTeamId} />
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="ex-obj">Objetivo</Label>
          <Input
            id="ex-obj"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Qué desarrolla"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ex-desc">Cómo se hace</Label>
          <Textarea
            id="ex-desc"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explicación completa del ejercicio…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ex-mat">Material</Label>
          <Input
            id="ex-mat"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            placeholder="Conos, balones, petos…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ex-media">Imagen o video</Label>
          <label
            htmlFor="ex-media"
            className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground"
          >
            <Upload className="h-4 w-4" />
            {file ? file.name : exercise?.media_path ? "Reemplazar archivo" : "Subir archivo"}
          </label>
          <input
            id="ex-media"
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
            onClick={handleDelete}
            disabled={del.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={busy}>
          {isEdit ? "Guardar cambios" : "Crear ejercicio"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
