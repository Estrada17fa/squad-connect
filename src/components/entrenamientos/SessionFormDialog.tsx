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
import {
  useCalendarEvents,
  useEventAttendees,
  type CalendarEventRow,
} from "@/hooks/useCalendarEvents";
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
  /** Entrenamiento ya agendado al que se le va a armar el plan. */
  defaultEventId?: string | null;
  /** Igual que arriba, pero con los datos ya cargados (desde "Por planear"). */
  pendingEvent?: CalendarEventRow | null;
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
  pendingEvent,
  session,
}: Props) {
  const isEdit = !!session;
  const save = useSaveSession();
  const del = useDeleteSession();

  const initialEventId = session?.event_id ?? pendingEvent?.id ?? defaultEventId ?? null;

  const [teamId, setTeamId] = React.useState<string | null>(
    session?.team_id ?? pendingEvent?.team_id ?? defaultTeamId ?? teams[0]?.id ?? null,
  );
  const [title, setTitle] = React.useState(session?.title ?? pendingEvent?.title ?? "");
  const [objective, setObjective] = React.useState(session?.objective ?? "");
  const [notes, setNotes] = React.useState(session?.notes ?? "");
  const [date, setDate] = React.useState(
    session?.session_date ? toLocalInputValue(session.session_date) : "",
  );
  const [eventId] = React.useState<string | null>(initialEventId);
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
  const attendeesQ = useEventAttendees(open && initialEventId ? initialEventId : null);

  /** Entrenamiento ya agendado al que pertenece este plan (si lo hay). */
  const linkedEvent: CalendarEventRow | null = React.useMemo(() => {
    if (!initialEventId) return null;
    return (events ?? []).find((e) => e.id === initialEventId) ?? pendingEvent ?? null;
  }, [events, initialEventId, pendingEvent]);

  const exercisesById = React.useMemo(() => {
    const m = new Map<string, ExerciseRow>();
    for (const e of exercisesQ.data ?? []) m.set(e.id, e);
    return m;
  }, [exercisesQ.data]);

  const availableExercises = React.useMemo(
    () => (exercisesQ.data ?? []).filter((e) => !e.team_id || e.team_id === teamId),
    [exercisesQ.data, teamId],
  );

  React.useEffect(() => {
    if (!open) return;
    setTeamId(session?.team_id ?? pendingEvent?.team_id ?? defaultTeamId ?? teams[0]?.id ?? null);
    setTitle(session?.title ?? pendingEvent?.title ?? "");
    setObjective(session?.objective ?? "");
    setNotes(session?.notes ?? "");
    setDate(session?.session_date ? toLocalInputValue(session.session_date) : "");
    setLocation("");
    setLocationId(null);
    setAttendeeIds(new Set());
    setAttendeeMode("auto");

    setPickerPhase(null);
    if (!session) setPlan([]);
  }, [open, session, defaultTeamId, pendingEvent, teams]);

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

  // Cuando ya existe el entrenamiento en la agenda, sus datos mandan (una sola vez).
  const hydratedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open) {
      hydratedRef.current = null;
      return;
    }
    if (!linkedEvent || hydratedRef.current === linkedEvent.id) return;
    hydratedRef.current = linkedEvent.id;
    setTeamId(linkedEvent.team_id ?? null);
    setDate(toLocalInputValue(linkedEvent.starts_at));
    setLocation(linkedEvent.location ?? "");
    setLocationId(linkedEvent.location_id ?? null);
    prevTeamRef.current = linkedEvent.team_id ?? null;
  }, [open, linkedEvent]);

  const attendeesHydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!open) {
      attendeesHydratedRef.current = false;
      return;
    }
    if (attendeesHydratedRef.current || !attendeesQ.data) return;
    attendeesHydratedRef.current = true;
    const ids = (attendeesQ.data as any[]).map((a) => a.user_id as string);
    if (ids.length) {
      setAttendeeIds(new Set(ids));
      setAttendeeMode("detect");
    }
  }, [open, attendeesQ.data]);

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
    if (!date) return toast.error("Indica la fecha y hora");

    setBusy(true);
    try {
      const sessionDate = fromLocalInputValue(date);

      // Crea el entrenamiento en la agenda, o actualiza el que ya estaba agendado.
      const finalEventId = await saveCalendarEvent({
        eventId,
        clubId,
        teamId,
        eventType: "entrenamiento",
        title,
        startsAt: sessionDate,
        location,
        locationId,
        description: objective,
        attendeeIds: attendeeIds.size ? [...attendeeIds] : undefined,
        userId,
      });

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
      toast.success(isEdit ? "Entrenamiento actualizado" : "Entrenamiento guardado");
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
      toast.success("Entrenamiento eliminado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
      <EntitySheetHeader>
        <EntitySheetTitle>
          {isEdit ? "Editar entrenamiento" : linkedEvent ? "Planear entrenamiento" : "Nuevo entrenamiento"}
        </EntitySheetTitle>
        <EntitySheetDescription>
          Datos del entrenamiento y su plan de ejercicios. Puedes guardarlo sin plan y armarlo después.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <TeamSelectField
          id="sess-team"
          teams={teams}
          value={teamId}
          onChange={setTeamId}
          disabled={isEdit || !!linkedEvent}
        />

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
          <Label htmlFor="sess-date">Fecha y hora</Label>
          <Input
            id="sess-date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

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

        <div className="space-y-3 pt-2">
          <Label>Plan de ejercicios</Label>
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
          {isEdit ? "Guardar cambios" : "Guardar entrenamiento"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
