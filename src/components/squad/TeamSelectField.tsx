import * as React from "react";
import { Label } from "@/components/ui/label";
import type { TeamOption } from "@/hooks/useAccess";

interface Props {
  id?: string;
  label?: string;
  teams: TeamOption[];
  value: string | null;
  onChange: (teamId: string) => void;
  disabled?: boolean;
}

/**
 * Selector de equipo destino en los formularios de creación.
 * Solo recibe equipos donde el usuario puede editar. Con un solo equipo se
 * muestra fijo (sin dropdown) para no obligar a elegir lo único posible.
 */
export function TeamSelectField({ id = "team-select", label = "Equipo", teams, value, onChange, disabled }: Props) {
  const single = teams.length === 1;
  const current = teams.find((t) => t.id === value) ?? null;

  React.useEffect(() => {
    if (single && teams[0].id && value !== teams[0].id) onChange(teams[0].id);
  }, [single, teams, value, onChange]);

  if (teams.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {single || disabled ? (
        <div className="flex h-10 w-full items-center rounded-md border border-input bg-white/[0.03] px-3 text-sm text-foreground">
          {current?.name ?? teams[0].name}
          {(current?.category ?? teams[0].category) ? (
            <span className="ml-2 text-xs text-muted-foreground">{current?.category ?? teams[0].category}</span>
          ) : null}
        </div>
      ) : (
        <select
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Selecciona un equipo
          </option>
          {teams.map((t) => (
            <option key={t.id ?? "club"} value={t.id ?? ""}>
              {t.name}
              {t.category ? ` · ${t.category}` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
