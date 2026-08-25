import { useNavigate } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { TeamCrest } from "@/components/torneo/TeamCrest";
import { HomeSection } from "./HomeSection";
import type { StandingRow } from "@/lib/torneo";
import type { TournamentRow } from "@/hooks/useTournaments";

/**
 * Bloque 4 de Inicio: nuestra posición en el torneo, en una sola fila.
 * No muestra la tabla completa; toca y lleva al módulo Torneo.
 */
export function TournamentStandingBlock({
  tournament,
  standing,
  groupLabel,
}: {
  tournament: TournamentRow;
  standing: StandingRow;
  groupLabel: string | null;
}) {
  const navigate = useNavigate();

  return (
    <HomeSection
      icon={Trophy}
      title="Torneo"
      actionLabel="Ver torneo"
      onAction={() => navigate({ to: "/m/$module", params: { module: "torneo" } })}
    >
      <button
        type="button"
        onClick={() => navigate({ to: "/m/$module", params: { module: "torneo" } })}
        className="glass animate-card-in flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
      >
        <TeamCrest path={standing.crest_path} name={standing.name} className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold text-foreground">
            {standing.position}° · {standing.points} pts
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {tournament.name}
            {groupLabel ? ` · Grupo ${groupLabel}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
          {standing.played} PJ
        </span>
      </button>
    </HomeSection>
  );
}
