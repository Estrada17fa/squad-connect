import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Cargando...",
  className,
  compact,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 text-muted-foreground",
        compact ? "py-4" : "py-16",
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/5", className)} />;
}

/**
 * Skeleton para grillas/listas de tarjetas (Plantel, Tareas, Juntas).
 * Preserva la estructura de la página para evitar el "flash" en blanco al navegar.
 */
export function CardGridSkeleton({
  count = 6,
  variant = "grid",
  className,
}: {
  count?: number;
  variant?: "grid" | "list";
  className?: string;
}) {
  const items = Array.from({ length: count });
  if (variant === "list") {
    return (
      <div className={cn("flex flex-col divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50", className)}>
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/[0.02] p-3">
            <LoadingSkeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton className="h-3.5 w-1/2" />
              <LoadingSkeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((_, i) => (
        <div key={i} className="glass p-4">
          <div className="flex items-center gap-3">
            <LoadingSkeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton className="h-3.5 w-2/3" />
              <LoadingSkeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <LoadingSkeleton className="h-3 w-3/4" />
            <LoadingSkeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton para listas cronológicas (Agenda). */
export function AgendaSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass p-4">
          <div className="flex items-center gap-3">
            <LoadingSkeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton className="h-4 w-2/3" />
              <LoadingSkeleton className="h-3 w-1/2" />
            </div>
            <LoadingSkeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
