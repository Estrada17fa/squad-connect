import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { TeamCrest } from "@/components/torneo/TeamCrest";
import { AccentBar } from "@/components/squad/StandardCard";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import type { MatchRow } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";

/**
 * Bloque 2 de Inicio: el próximo partido de nuestro equipo, en grande.
 * Solo presentación: las filas llegan del resumen de torneo ya filtrado.
 */
export function NextMatchHero({
  match,
  teams,
  ourTeam,
}: {
  match: MatchRow;
  teams: TournamentTeamRow[];
  ourTeam: TournamentTeamRow;
}) {
  const navigate = useNavigate();
  const home = teams.find((t) => t.id === match.home_team_id) ?? null;
  const away = teams.find((t) => t.id === match.away_team_id) ?? null;
  const isHome = match.home_team_id === ourTeam.id;
  const rival = isHome ? away : home;
  const def = EVENT_TYPE_MAP["partido"];
  const kickoff = match.kickoff_at ? new Date(match.kickoff_at) : null;

  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/m/$module", params: { module: "torneo" } })}
      className="glass animate-card-in relative w-full overflow-hidden p-0 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
    >
      <AccentBar color={def.cssVar} label="Próximo partido" />
      <div className="space-y-4 py-5 pl-5 pr-4">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: def.cssVar }}
          >
            Próximo partido
          </span>
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {match.matchday != null ? `Jornada ${match.matchday}` : "Amistoso"}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <TeamCrest path={home?.crest_path} name={home?.name ?? "Local"} className="h-14 w-14" />
            <span className="line-clamp-2 text-center font-display text-sm font-semibold text-foreground">
              {home?.name ?? "Por definir"}
            </span>
          </div>
          <span className="shrink-0 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
            vs
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <TeamCrest
              path={away?.crest_path}
              name={away?.name ?? "Visitante"}
              className="h-14 w-14"
            />
            <span className="line-clamp-2 text-center font-display text-sm font-semibold text-foreground">
              {away?.name ?? "Por definir"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {kickoff ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {kickoff.toLocaleDateString("es-MX", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {kickoff.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </>
          ) : null}
          {match.venue ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{match.venue}</span>
            </span>
          ) : null}
        </div>

        <div className="flex justify-center">
          <span className="inline-flex rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] text-muted-foreground">
            {rival ? `${isHome ? "Local" : "Visitante"} · vs ${rival.name}` : isHome ? "Local" : "Visitante"}
          </span>
        </div>
      </div>
    </button>
  );
}
