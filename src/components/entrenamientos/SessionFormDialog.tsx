import * as React from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
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
import { TeamSelectField } from "@/components/squad/TeamSelectField";
import type { TeamOption } from "@/hooks/useAccess";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { saveCalendarEvent } from "@/lib/calendarEvents";
import { AttendeePicker, type AttendeeMode } from "@/components/calendar/AttendeePicker";
import { LocationPicker } from "@/components/calendar/LocationPicker";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import {
  CATEGORY_LABEL,
  PHASES,
  useDeleteSession,
  useExercises,
  useSaveSession,
  useSessionPlan,
  type ExerciseRow,
  type PlanDraftItem,
  type SessionPhase,
  type TrainingSessionRow,
} from "@/hooks/useTraining";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  teams: TeamOption[];
  defaultTeamId?: string | null;
  /** Evento del calendario al que queda ligada la sesión (desde el detalle del evento). */
  defaultEventId?: string | null;
  session?: TrainingSessionRow | null;
}

export function SessionFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  teams,
  defaultTeamId,
  defaultEventId,
  session,
}: Props) {
  const isEdit = !!session;
  const save = useSaveSession();
  const del = useDeleteSession();

  const [teamId, setTeamId] = React.useState<string | null>(
    session?.team_id ?? defaultTeamId ?? teams[0]?.id ?? null,
  );
  const [title, setTitle] = React.useState(session?.title ?? "");
  const [objective, setObjective] = React.useState(session?.objective ?? "");
  const [notes, setNotes] = React.useState(session?.notes ?? "");
  const [date, setDate] = React.useState(
    session?.session_date ? toLocalInputValue(session.session_date) : "",
  );
  const [eventMode, setEventMode] = React.useState<"none" | "link" | "create">(
    session?.event_id || defaultEventId ? "link" : "create",
  );
  const [eventId, setEventId] = React.useState<string | null>(session?.event_id ?? defaultEventId ?? null);
  const [location, setLocation] = React.useState("");
  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [attendeeIds, setAttendeeIds] = React.useState<Set<string>>(new Set());
  const [attendeeMode, setAttendeeMode] = React.useState<AttendeeMode>("auto");

  const [plan, setPlan] = React.useState<PlanDraftItem[]>([]);
  const [pickerPhase, setPickerPhase] = React.useState<SessionPhase | null>(null);
  const [busy, setBusy] = React.useState(false);

  const exercisesQ = useExercises(clubId);
  const planQ = useSessionPlan(open && session ? session.id : null);
  const { data: events } = useCalendarEvents({ mode: "club", clubId });

  const exercisesById = React.useMemo(() => {
    const m = new Map<string, ExerciseRow>();
    for (const e of exercisesQ.data ?? []) m.set(e.id, e);
    return m;
  }, [exercisesQ.data]);

  const availableExercises = React.useMemo(
    () => (exercisesQ.data ?? []).filter((e) => !e.team_id || e.team_id === teamId),
    [exercisesQ.data, teamId],
  );

  const trainingEvents = React.useMemo(
    () =>
      (events ?? []).filter(
        (e) => e.event_type === "entrenamiento" && (!teamId || e.team_id === teamId),
      ),
    [events, teamId],
  );

  React.useEffect(() => {
    if (!open) return;
    setTeamId(session?.team_id ?? defaultTeamId ?? teams[0]?.id ?? null);
    setTitle(session?.title ?? "");
    setObjective(session?.objective ?? "");
    setNotes(session?.notes ?? "");
    setDate(session?.session_date ? toLocalInputValue(session.session_date) : "");
    setEventMode(session?.event_id || defaultEventId ? "link" : "create");
    setEventId(session?.event_id ?? defaultEventId ?? null);
    setLocation("");
    setLocationId(null);
    setAttendeeIds(new Set());
    setAttendeeMode("auto");

    setPickerPhase(null);
    if (!session) setPlan([]);
  }, [open, session, defaultTeamId, defaultEventId, teams]);

  // Al cambiar de equipo, la convocatoria se recalcula al equipo completo.
  const prevTeamRef = React.useRef<string | null>(teamId);
  React.useEffect(() => {
    if (prevTeamRef.current === teamId) return;
    prevTeamRef.current = teamId;
    if (attendeeMode === "custom") toast.info("Se recalculó la convocatoria al equipo completo");
    setAttendeeMode("auto");
    setAttendeeIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);



  React.useEffect(() => {
    if (!open || !session || !planQ.data) return;
    setPlan(
      planQ.data.map((p) => ({
        exercise_id: p.exercise_id,
        phase: p.phase,
        custom_notes: p.custom_notes,
        duration_override: p.duration_override,
        sets: p.sets ?? null,
        reps: p.reps ?? null,
      })),
    );
  }, [open, session, planQ.data]);

  function addExercise(exerciseId: string, phase: SessionPhase) {
    const ex = exercisesById.get(exerciseId);
    setPlan((prev) => [
      ...prev,
      {
        exercise_id: exerciseId,
        phase,
        custom_notes: null,
        duration_override: null,
        sets: ex?.default_sets ?? null,
        reps: ex?.default_reps ?? null,
      },
    ]);
    setPickerPhase(null);
  }

  function updateItem(index: number, patch: Partial<PlanDraftItem>) {
    setPlan((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removeItem(index: number) {
    setPlan((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    setPlan((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!teamId) return toast.error("Selecciona un equipo");
    if (!title.trim()) return toast.error("El título es obligatorio");
    if (eventMode !== "link" && !date) return toast.error("Indica la fecha y hora");
    if (eventMode === "link" && !eventId) return toast.error("Selecciona el evento del calendario");

    setBusy(true);
    try {
      let finalEventId: string | null = null;
      let sessionDate = date ? fromLocalInputValue(date) : new Date().toISOString();

      if (eventMode === "link" && eventId) {
        finalEventId = eventId;
        const ev = trainingEvents.find((e) => e.id === eventId);
        if (ev) sessionDate = ev.starts_at;
      } else if (eventMode === "create") {
        finalEventId = await saveCalendarEvent({
          clubId,
          teamId,
          eventType: "entrenamiento",
          title,
          startsAt: sessionDate,
          location,
          locationId,
          description: objective,
          attendeeIds: [...attendeeIds],
          userId,
        });
      }

      await save.mutateAsync({
        id: session?.id,
        session: {
          club_id: clubId,
          team_id: teamId,
          event_id: finalEventId ?? session?.event_id ?? null,
          title: title.trim(),
          objective: objective.trim() || null,
          notes: notes.trim() || null,
          session_date: sessionDate,
          ...(isEdit ? {} : { created_by: userId }),
        },
        plan,
      });
      toast.success(isEdit ? "Sesión actualizada" : "Sesión creada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    try {
      await del.mutateAsync(session.id);
      toast.success("Sesión eliminada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar sesión" : "Nueva sesión"}</EntitySheetTitle>
        <EntitySheetDescription>
          Arma el plan con ejercicios de la biblioteca, por fase y en orden.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <TeamSelectField id="sess-team" teams={teams} value={teamId} onChange={setTeamId} disabled={isEdit} />

        <div className="space-y-1.5">
          <Label htmlFor="sess-title">Título</Label>
          <Input
            id="sess-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p.ej. Sesión de presión alta"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sess-obj">Objetivo de la sesión</Label>
          <Input id="sess-obj" value={objective} onChange={(e) => setObjective(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sess-evmode">Evento del calendario</Label>
          <select
            id="sess-evmode"
            value={eventMode}
            onChange={(e) => setEventMode(e.target.value as "none" | "link" | "create")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="create">Crear evento nuevo</option>
            <option value="link">Ligar a un entrenamiento existente</option>
            <option value="none">Sin evento (solo plan)</option>
          </select>
        </div>

        {eventMode === "link" ? (
          <div className="space-y-1.5">
            <Label htmlFor="sess-event">Entrenamiento</Label>
            <select
              id="sess-event"
              value={eventId ?? ""}
              onChange={(e) => setEventId(e.target.value || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecciona un evento</option>
              {trainingEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {new Date(e.starts_at).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {e.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="sess-date">Fecha y hora</Label>
              <Input
                id="sess-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            {eventMode === "create" ? (
              <>
                <LocationPicker
                  id="sess-loc"
                  clubId={clubId}
                  userId={userId}
                  value={location}
                  onChange={setLocation}
                  locationId={locationId}
                  onLocationIdChange={setLocationId}
                />
                <AttendeePicker
                  clubId={clubId}
                  teamId={teamId}
                  value={attendeeIds}
                  onChange={setAttendeeIds}
                  label="Convocados"
                  mode={attendeeMode}
                  onModeChange={setAttendeeMode}

                />
              </>
            ) : null}
          </>
        )}

        <div className="space-y-3 pt-2">
          <Label>Plan de la sesión</Label>
          {PHASES.map((phase) => {
            const items = plan
              .map((p, i) => ({ ...p, index: i }))
              .filter((p) => p.phase === phase.key);
            return (
              <div key={phase.key} className="glass space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{phase.label}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPickerPhase(pickerPhase === phase.key ? null : phase.key)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
                  </Button>
                </div>

                {pickerPhase === phase.key ? (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60">
                    {availableExercises.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        La biblioteca está vacía. Crea ejercicios primero.
                      </div>
                    ) : (
                      availableExercises.map((ex) => (
                        <button
                          type="button"
                          key={ex.id}
                          onClick={() => addExercise(ex.id, phase.key)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.04]"
                        >
                          <span className="truncate text-foreground">{ex.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {CATEGORY_LABEL[ex.category]}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}

                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin ejercicios en esta fase.</p>
                ) : (
                  items.map((item) => {
                    const ex = exercisesById.get(item.exercise_id);
                    return (
                      <div key={item.index} className="rounded-lg border border-border/60 p-2">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {ex?.name ?? "Ejercicio"}
                          </span>
                          <button type="button" onClick={() => move(item.index, -1)} className="p-1 text-muted-foreground">
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => move(item.index, 1)} className="p-1 text-muted-foreground">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.index)}
                            className="p-1 text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            min={1}
                            placeholder="min"
                            value={item.duration_override ?? ""}
                            onChange={(e) =>
                              updateItem(item.index, {
                                duration_override: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                          <Input
                            type="number"
                            min={1}
                            placeholder="series"
                            value={item.sets ?? ""}
                            onChange={(e) =>
                              updateItem(item.index, { sets: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                          <Input
                            type="number"
                            min={1}
                            placeholder="reps"
                            value={item.reps ?? ""}
                            onChange={(e) =>
                              updateItem(item.index, { reps: e.target.value ? Number(e.target.value) : null })
                            }
                          />
                        </div>
                        <Input
                          className="mt-2"
                          placeholder="Ajuste para esta sesión"
                          value={item.custom_notes ?? ""}
                          onChange={(e) => updateItem(item.index, { custom_notes: e.target.value || null })}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        <div className={cn("space-y-1.5")}>
          <Label htmlFor="sess-notes">Notas</Label>
          <Textarea id="sess-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
          {isEdit ? "Guardar cambios" : "Crear sesión"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
