import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bloque "marcador": dato clave grande a la izquierda de la tarjeta. */
export function CardLead({
  top,
  bottom,
  icon: Icon,
  accent,
  className,
}: {
  top?: React.ReactNode;
  bottom?: React.ReactNode;
  icon?: LucideIcon;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 text-foreground",
        className,
      )}
      style={{
        background: accent
          ? `color-mix(in oklab, ${accent} 14%, transparent)`
          : "var(--card-lead-bg)",
        borderColor: accent ? `color-mix(in oklab, ${accent} 30%, transparent)` : undefined,
      }}
    >
      {top != null ? (
        <>
          <span className="font-display text-xl font-bold leading-none tabular-nums">{top}</span>
          {bottom != null ? <span className="card-label mt-1 leading-none">{bottom}</span> : null}
        </>
      ) : Icon ? (
        <Icon className="h-6 w-6" style={accent ? { color: accent } : undefined} />
      ) : null}
    </div>
  );
}

export interface MetaItem {
  icon?: LucideIcon;
  label: React.ReactNode;
}

/** Fila de metadatos con íconos pequeños. */
export function CardMeta({ items, className }: { items: MetaItem[]; className?: string }) {
  const visible = items.filter((i) => i.label != null && i.label !== "");
  if (!visible.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      {visible.map((m, i) => (
        <span key={i} className="inline-flex min-w-0 items-center gap-1">
          {m.icon ? <m.icon className="h-3.5 w-3.5 shrink-0 opacity-70" /> : null}
          <span className="truncate">{m.label}</span>
        </span>
      ))}
    </div>
  );
}

/** Etiqueta pequeña en mayúsculas sobre un valor destacado. */
export function CardStat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="card-label">{label}</span>
      <span className="font-display text-base font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}
