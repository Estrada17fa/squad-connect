import * as React from "react";
import { Clock, Package, Target } from "lucide-react";
import { DetailSection } from "@/components/squad/DetailSheet";
import { LoadingState } from "@/components/squad/LoadingState";
import {
  CATEGORY_LABEL,
  PHASES,
  useExerciseMediaUrl,
  useSessionPlan,
  type SessionExerciseRow,
  type TrainingSessionRow,
} from "@/hooks/useTraining";

function ExerciseMedia({ path }: { path: string }) {
  const { data: url } = useExerciseMediaUrl(path);
  if (!url) return null;
  const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(path);
  return isVideo ? (
    <video src={url} controls className="mt-2 w-full rounded-lg" />
  ) : (
    <img src={url} alt="" className="mt-2 w-full rounded-lg object-cover" loading="lazy" />
  );
}

function PlanItem({ item, index }: { item: SessionExerciseRow; index: number }) {
  const ex = item.exercise;
  const minutes = item.duration_override ?? ex?.duration_minutes ?? null;
  return (
    <div className="glass p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {index + 1}. {ex?.name ?? "Ejercicio"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ex ? CATEGORY_LABEL[ex.category] : ""}
            {minutes ? ` · ${minutes} min` : ""}
          </p>
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
      {ex?.media_path ? <ExerciseMedia path={ex.media_path} /> : null}
    </div>
  );
}

interface Props {
  session: TrainingSessionRow | null;
  /** Reservado: modo consulta sin acciones sobre el plan. */
  readOnly?: boolean;
  /** Cuando es false, no se dispara la consulta del plan. */
  enabled?: boolean;
}

/**
 * Contenido de lectura del plan de una sesión: objetivo, ejercicios por fase
 * (con su explicación y media) y notas. Compartido por la ficha de sesión y por
 * el detalle del evento de entrenamiento en la Agenda.
 */
export function SessionPlanContent({ session, enabled = true }: Props) {
  const planQ = useSessionPlan(enabled && session ? session.id : null);
  const plan = planQ.data ?? [];

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
        <p className="text-sm text-muted-foreground">Esta sesión aún no tiene ejercicios en su plan.</p>
      ) : (
        PHASES.map((phase) => {
          const items = plan.filter((p) => p.phase === phase.key);
          if (!items.length) return null;
          return (
            <DetailSection
              key={phase.key}
              title={
                <span className="flex items-center gap-1.5 normal-case tracking-normal text-foreground">
                  <Clock className="h-4 w-4 text-primary" /> {phase.label}
                </span>
              }
            >
              {items.map((item, i) => (
                <PlanItem key={item.id} item={item} index={i} />
              ))}
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
