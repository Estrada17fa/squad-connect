import * as React from "react";
import { Clock, Package, Pencil, Target } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/squad/LoadingState";
import {
  CATEGORY_LABEL,
  PHASES,
  formatSessionDate,
  useExerciseMediaUrl,
  useSessionPlan,
  type SessionExerciseRow,
  type TrainingSessionRow,
} from "@/hooks/useTraining";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: TrainingSessionRow | null;
  /** Modo consulta: sin acciones de edición (se usa desde el Calendario). */
  readOnly?: boolean;
  onEdit?: () => void;
}

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

export function SessionDetailSheet({ open, onOpenChange, session, readOnly, onEdit }: Props) {
  const planQ = useSessionPlan(open && session ? session.id : null);
  const plan = planQ.data ?? [];

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
      <EntitySheetHeader>
        <EntitySheetTitle>{session?.title ?? "Sesión"}</EntitySheetTitle>
        <EntitySheetDescription>
          {session ? formatSessionDate(session.session_date) : ""}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
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
              <div key={phase.key} className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" /> {phase.label}
                </p>
                {items.map((item, i) => (
                  <PlanItem key={item.id} item={item} index={i} />
                ))}
              </div>
            );
          })
        )}

        {session?.notes ? (
          <div className="glass p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notas</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{session.notes}</p>
          </div>
        ) : null}
      </EntitySheetBody>

      {!readOnly && onEdit ? (
        <EntitySheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Editar sesión
          </Button>
        </EntitySheetFooter>
      ) : null}
    </EntitySheet>
  );
}
