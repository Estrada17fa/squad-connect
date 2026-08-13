import * as React from "react";
import { PlayerPicker } from "@/components/squad/PlayerPicker";
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
    <PlayerPicker
      id={id}
      label={label}
      players={players}
      value={value}
      onChange={onChange}
      disabled={disabled}
      emptyMessage="No tienes equipos donde puedas registrar información de desarrollo."
    />
  );
}
