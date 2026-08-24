import * as React from "react";
import {
  Activity,
  AlertCircle,
  MapPin,
  Dumbbell,
  Flame,
  Hand,
  HeartPulse,
  Image as ImageIcon,
  Layers,
  Package,
  Repeat,
  Shield,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { DeleteAction } from "@/components/squad/DeleteAction";
import { cn } from "@/lib/utils";
import { ACCENT } from "@/lib/accents";
import {
  CATEGORY_LABEL,
  useExerciseMediaUrl,
  type ExerciseCategory,
  type ExerciseRow,
  type SessionPhase,
} from "@/hooks/useTraining";

/**
 * Piezas visuales compartidas del módulo Entrenamientos.
 * Mismo estándar escaneable que Salud/Desarrollo: mini-tarjetas, chips e iconos.
 */

export const CATEGORY_ICON: Record<ExerciseCategory, LucideIcon> = {
  calentamiento: Flame,
  tecnica: Target,
  tactica: Layers,
  fisico: Dumbbell,
  portero: Hand,
  recuperacion: HeartPulse,
  otro: Activity,
};

export const PHASE_ICON: Record<SessionPhase, LucideIcon> = {
  calentamiento: Flame,
  principal: Activity,
  vuelta_calma: HeartPulse,
};

export function isVideoPath(path: string) {
  return /\.(mp4|mov|webm|m4v)$/i.test(path);
}

/** Chip compacto con icono. */
export function TrainingChip({
  icon: Icon,
  children,
  tone = "muted",
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  tone?: "muted" | "primary";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "primary" ? "bg-primary/15 text-primary" : "bg-white/[0.06] text-muted-foreground",
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

/** Miniatura cuadrada de la media del ejercicio, con icono por tipo como respaldo. */
export function ExerciseThumb({
  exercise,
  size = "md",
  className,
}: {
  exercise: Pick<ExerciseRow, "category" | "media_path">;
  size?: "sm" | "md";
  className?: string;
}) {
  const { data: url } = useExerciseMediaUrl(exercise.media_path);
  const Icon = CATEGORY_ICON[exercise.category] ?? Activity;
  const box = size === "sm" ? "h-12 w-12" : "h-16 w-16";
  const showImage = url && exercise.media_path && !isVideoPath(exercise.media_path);

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]",
        box,
        className,
      )}
    >
      {showImage ? (
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          {exercise.media_path ? <ImageIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
      )}
    </div>
  );
}

/** Media completa (imagen o video) del ejercicio. */
export function ExerciseMedia({ path, className }: { path: string; className?: string }) {
  const { data: url } = useExerciseMediaUrl(path);
  if (!url) return null;
  return isVideoPath(path) ? (
    <video src={url} controls className={cn("w-full rounded-xl", className)} />
  ) : (
    <img src={url} alt="" className={cn("w-full rounded-xl object-cover", className)} loading="lazy" />
  );
}

/** Chips de carga: duración, series y repeticiones. */
export function LoadChips({
  minutes,
  sets,
  reps,
}: {
  minutes?: number | null;
  sets?: number | null;
  reps?: number | null;
}) {
  if (!minutes && !sets && !reps) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {minutes ? <TrainingChip icon={Timer}>{minutes} min</TrainingChip> : null}
      {sets ? <TrainingChip icon={Layers}>{sets} series</TrainingChip> : null}
      {reps ? <TrainingChip icon={Repeat}>{reps} reps</TrainingChip> : null}
    </div>
  );
}

/** Tarjeta visual de la biblioteca. */
export function ExerciseCard({
  exercise,
  scopeLabel,
  onClick,
}: {
  exercise: ExerciseRow;
  scopeLabel: string;
  onClick?: () => void;
}) {
  const Icon = CATEGORY_ICON[exercise.category] ?? Activity;
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass w-full p-3 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <ExerciseThumb exercise={exercise} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate font-display font-semibold text-foreground">{exercise.name}</p>
          <div className="flex flex-wrap gap-1.5">
            <TrainingChip icon={Icon} tone="primary">
              {CATEGORY_LABEL[exercise.category]}
            </TrainingChip>
            <TrainingChip icon={Shield}>{scopeLabel}</TrainingChip>
          </div>
          <LoadChips
            minutes={exercise.duration_minutes}
            sets={exercise.default_sets}
            reps={exercise.default_reps}
          />
          {exercise.objective ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{exercise.objective}</p>
          ) : null}
          {exercise.materials ? (
            <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
              <Package className="h-3 w-3 shrink-0" /> {exercise.materials}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/** Resumen del plan de una sesión: ejercicios, minutos y fases. */
export function PlanSummaryChips({
  count,
  minutes,
  phases,
  phaseLabels,
}: {
  count: number;
  minutes: number;
  phases: SessionPhase[];
  phaseLabels: Record<SessionPhase, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <TrainingChip icon={Dumbbell} tone="primary">
        {count} ejercicio{count === 1 ? "" : "s"}
      </TrainingChip>
      {minutes ? <TrainingChip icon={Timer}>{minutes} min</TrainingChip> : null}
      {phases.map((p) => {
        const Icon = PHASE_ICON[p];
        return (
          <TrainingChip key={p} icon={Icon}>
            {phaseLabels[p]}
          </TrainingChip>
        );
      })}
    </div>
  );
}

/** Entrenamiento ya agendado que todavía no tiene plan de ejercicios. */
export function PendingPlanCard({
  title,
  startsAt,
  teamLabel,
  location,
  onClick,
  onDelete,
}: {
  title: string;
  startsAt: string;
  teamLabel?: string | null;
  location?: string | null;
  onClick?: () => void;
  /** Solo cuando la persona puede editar esa categoría. */
  onDelete?: () => Promise<unknown> | void;
}) {
  const when = new Date(startsAt).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="glass relative overflow-hidden transition-all hover:border-white/15 hover:bg-white/[0.06]">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 rounded-l-[inherit]"
        style={{ backgroundColor: ACCENT.mid }}
      />
      <button
        type="button"
        onClick={onClick}
        className="w-full p-4 pl-5 pr-12 text-left active:scale-[0.99]"
      >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{when}</p>
          <p className="mt-1 break-words font-display font-semibold text-foreground [overflow-wrap:anywhere]">
            {title}
          </p>
        </div>
        <TrainingChip icon={AlertCircle}>Sin plan</TrainingChip>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {teamLabel ? <TrainingChip icon={Shield}>{teamLabel}</TrainingChip> : null}
        {location ? <TrainingChip icon={MapPin}>{location}</TrainingChip> : null}
      </div>
      </button>
      {onDelete ? (
        <div className="absolute bottom-2 right-2">
          <DeleteAction
            iconOnly
            label="Eliminar entrenamiento"
            title="¿Eliminar este entrenamiento?"
            description="Se quitará de la agenda. Esta acción no se puede deshacer."
            successMessage="Entrenamiento eliminado"
            onDelete={onDelete}
          />
        </div>
      ) : null}
    </div>
  );
}
