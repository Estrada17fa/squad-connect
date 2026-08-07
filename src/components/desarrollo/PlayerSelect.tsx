import * as React from "react";
import { Label } from "@/components/ui/label";
import type { DevelopmentRosterMember } from "@/hooks/useDevelopment";

interface Props {
  id?: string;
  label?: string;
  players: DevelopmentRosterMember[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
}

/** Selector de jugador limitado a los equipos donde el usuario puede editar 'desarrollo'. */
export function PlayerSelect({ id = "dev-player", label = "Jugador", players, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
      >
        <option value="">Selecciona…</option>
        {players.map((p) => (
          <option key={p.playerId} value={p.userId}>
            {p.fullName ?? "Sin nombre"}
            {p.teamName ? ` · ${p.teamName}` : ""}
          </option>
        ))}
      </select>
      {players.length === 0 ? (
        <p className="text-xs text-amber-400">
          No tienes equipos donde puedas registrar información de desarrollo.
        </p>
      ) : null}
    </div>
  );
}
