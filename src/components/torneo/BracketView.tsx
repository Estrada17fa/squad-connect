import * as React from "react";
import { Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamCrest } from "./TeamCrest";
import { cn } from "@/lib/utils";
import type { MatchRow } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";
import { tieLegs, type PlayoffTieRow } from "@/hooks/useTournamentPlayoffs";
import { PLAYOFF_ROUND_LABEL, playoffRounds, tieAggregate } from "@/lib/torneo";

interface Props {
  startRound: number;
  teams: TournamentTeamRow[];
  matches: MatchRow[];
  ties: PlayoffTieRow[];
  canEdit: boolean;
  onOpenTie?: (roundSize: number, slot: number, tie: PlayoffTieRow | null) => void;
}

/** Bracket adaptativo: se dibujan solo las rondas desde la inicial configurada. */
export function BracketView({
  startRound,
  teams,
  matches,
  ties,
  canEdit,
  onOpenTie,
}: Props) {
  const rounds = React.useMemo(() => playoffRounds(startRound), [startRound]);
  const teamById = React.useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams],
  );

  if (!rounds.length) {
    return <p className="text-sm text-muted-foreground">Este torneo no tiene fase final.</p>;
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((size) => {
          const slots = Array.from({ length: size / 2 }, (_, i) => i);
          return (
            <div key={size} className="w-64 shrink-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {PLAYOFF_ROUND_LABEL[size] ?? `Ronda de ${size}`}
              </p>
              {slots.map((slot) => {
                const tie = ties.find((t) => t.round_size === size && t.slot === slot) ?? null;
                const legs = tieLegs(matches, tie?.id);
                const agg = tieAggregate(
                  legs.map((m) => ({
                    home_team_id: m.home_team_id,
                    away_team_id: m.away_team_id,
                    home_goals: m.home_goals,
                    away_goals: m.away_goals,
                  })),
                  tie?.home_team_id ?? null,
                  tie?.away_team_id ?? null,
                );
                const home = tie?.home_team_id ? teamById.get(tie.home_team_id) : undefined;
                const away = tie?.away_team_id ? teamById.get(tie.away_team_id) : undefined;
                const clickable = canEdit && !!onOpenTie;

                const Wrapper: any = clickable ? "button" : "div";
                return (
                  <Wrapper
                    key={slot}
                    {...(clickable
                      ? { type: "button", onClick: () => onOpenTie?.(size, slot, tie) }
                      : {})}
                    className={cn(
                      "w-full rounded-xl bg-white/[0.04] p-2.5 text-left ring-1 ring-inset ring-white/5",
                      clickable && "transition-colors hover:bg-white/[0.07]",
                    )}
                  >
                    {!tie ? (
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        {canEdit ? <Plus className="h-3.5 w-3.5" /> : null}
                        {canEdit ? "Definir llave" : "Por definir"}
                      </span>
                    ) : (
                      <div className="space-y-1.5">
                        <TieSide
                          team={home}
                          goals={agg.hasScore ? agg.home : null}
                          winner={tie.winner_team_id === tie.home_team_id}
                        />
                        <TieSide
                          team={away}
                          goals={agg.hasScore ? agg.away : null}
                          winner={tie.winner_team_id === tie.away_team_id}
                        />
                        {tie.two_legs ? (
                          <p className="text-[11px] text-muted-foreground">Ida y vuelta</p>
                        ) : null}
                      </div>
                    )}
                  </Wrapper>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TieSide({
  team,
  goals,
  winner,
}: {
  team: TournamentTeamRow | undefined;
  goals: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <TeamCrest path={team?.crest_path ?? null} name={team?.name ?? "Por definir"} className="h-5 w-5" />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          winner ? "font-semibold text-primary" : team ? "" : "text-muted-foreground",
        )}
      >
        {team?.name ?? "Por definir"}
      </span>
      {winner ? <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
      <span className="w-5 shrink-0 text-right text-sm tabular-nums">
        {goals ?? "—"}
      </span>
    </div>
  );
}
