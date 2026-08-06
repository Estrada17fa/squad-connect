import * as React from "react";
import { cn } from "@/lib/utils";
import type { TeamOption } from "@/hooks/useAccess";

interface Props {
  teams: TeamOption[];
  value: string | null; // null = todos
  onChange: (teamId: string | null) => void;
  className?: string;
}

/**
 * Filtro de visualización por equipo. No es un contexto global: cada página
 * mantiene su propio estado y "Todos" es el valor por defecto.
 */
export function TeamFilter({ teams, value, onChange, className }: Props) {
  if (teams.length < 2) return null;
  return (
    <div className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1", className)}>
      <Chip active={value === null} onClick={() => onChange(null)} label="Todos" />
      {teams.map((t) => (
        <Chip
          key={t.id ?? "club"}
          active={value === t.id}
          onClick={() => onChange(t.id)}
          label={t.name}
        />
      ))}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
      )}
    >
      {label}
    </button>
  );
}

/** Badge discreto con el nombre del equipo de un elemento. */
export function TeamBadge({ name, className }: { name: string | null | undefined; className?: string }) {
  if (!name) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-border/60 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {name}
    </span>
  );
}
