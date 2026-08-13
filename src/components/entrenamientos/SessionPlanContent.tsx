import * as React from "react";
import { Package, Target } from "lucide-react";
import { DetailSection } from "@/components/squad/DetailSheet";
import { LoadingState } from "@/components/squad/LoadingState";
import { EmptyState } from "@/components/squad/EmptyState";
import { Dumbbell } from "lucide-react";
import {
  CATEGORY_LABEL,
  PHASES,
  itemMinutes,
  useSessionPlan,
  type SessionExerciseRow,
  type TrainingSessionRow,
} from "@/hooks/useTraining";
import {
  CATEGORY_ICON,
  ExerciseMedia,
  ExerciseThumb,
  LoadChips,
  PHASE_ICON,
  TrainingChip,
} from "@/components/entrenamientos/TrainingPieces";

function PlanItem({ item, index }: { item: SessionExerciseRow; index: number }) {
  const ex = item.exercise;
  const [showMedia, setShowMedia] = React.useState(false);
  const minutes = itemMinutes(item) || null;
  const Icon = ex ? CATEGORY_ICON[ex.category] : Dumbbell;

  return (
    <div className="glass p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
          {index + 1}
        </div>
        {ex ? <ExerciseThumb exercise={ex} size="sm" /> : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="break-words font-display font-semibold text-foreground [overflow-wrap:anywhere]">
            {ex?.name ?? "Ejercicio"}
          </p>
          {ex ? (
            <TrainingChip icon={Icon} tone="primary">
              {CATEGORY_LABEL[ex.category]}
            </TrainingChip>
          ) : null}
          <LoadChips minutes={minutes} sets={item.sets} reps={item.reps} />
        </div>
      </div>

      {ex?.objective ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {ex.objective}
        </p>
      ) : null}
      {ex?.description ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{ex.description}</p>
      ) : null}
      {item.custom_notes ? (
        <p className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
          Ajuste: {item.custom_notes}
        </p>
      ) : null}
      {ex?.materials ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" /> {ex.materials}
        </p>
      ) : null}
      {ex?.media_path ? (
        showMedia ? (
          <ExerciseMedia path={ex.media_path} className="mt-2" />
        ) : (
          <button
            type="button"
            onClick={() => setShowMedia(true)}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            Ver imagen o video
          </button>
        )
      ) : null}
    </div>
  );
}

interface Props {
  session: TrainingSessionRow | null;
  /** Reservado: modo consulta sin acciones sobre el plan. */
  readOnly?: boolean;
  /** Cuando es false, no se dispara la consulta del plan. */
  enabled?: boolean;
  /** Acción para editores cuando la sesión aún no tiene ejercicios. */
  onAddExercises?: () => void;
}

/**
 * Plan de la sesión en secuencia: fases con su duración, ejercicios como
 * tarjetas con carga (min / series / reps), material y media.
 * Compartido por la ficha de sesión y por el detalle del evento en Agenda.
 */
export function SessionPlanContent({ session, enabled = true, onAddExercises }: Props) {
  const planQ = useSessionPlan(enabled && session ? session.id : null);
  const plan = planQ.data ?? [];

  let counter = 0;

  return (
    <>
      {session?.objective ? (
        <div className="glass p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Objetivo</p>
          <p className="mt-1 text-sm text-foreground">{session.objective}</p>
        </div>
      ) : null}

      {planQ.isLoading ? (
        <LoadingState />
      ) : plan.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sin ejercicios"
          message="Esta sesión aún no tiene un plan armado."
          action={
            onAddExercises ? (
              <button
                type="button"
                onClick={onAddExercises}
                className="text-sm font-medium text-primary hover:underline"
              >
                Agregar ejercicios
              </button>
            ) : undefined
          }
        />
      ) : (
        PHASES.map((phase) => {
          const items = plan.filter((p) => p.phase === phase.key);
          if (!items.length) return null;
          const minutes = items.reduce((s, i) => s + itemMinutes(i), 0);
          const PhaseIcon = PHASE_ICON[phase.key];
          return (
            <DetailSection
              key={phase.key}
              title={
                <span className="flex items-center gap-2 normal-case tracking-normal text-foreground">
                  <PhaseIcon className="h-4 w-4 text-primary" /> {phase.label}
                  <span className="text-xs font-normal text-muted-foreground">
                    {items.length} ej.{minutes ? ` · ${minutes} min` : ""}
                  </span>
                </span>
              }
            >
              {items.map((item) => {
                const index = counter++;
                return <PlanItem key={item.id} item={item} index={index} />;
              })}
            </DetailSection>
          );
        })
      )}

      {session?.notes ? (
        <div className="glass p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Notas</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{session.notes}</p>
        </div>
      ) : null}
    </>
  );
}
