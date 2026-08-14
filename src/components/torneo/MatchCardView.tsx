import { CalendarDays, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { TeamCrest } from "./TeamCrest";
import type { MatchRow } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";
import { MATCH_STATUS_LABEL } from "@/lib/torneo";
import { cn } from "@/lib/utils";

export function formatKickoff(iso: string | null, withYear = false) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  match: MatchRow;
  teams: TournamentTeamRow[];
  /** Tarjeta grande para "próximos partidos". */
  highlight?: boolean;
}

/** Tarjeta de partido de solo lectura, con escudos y nuestro equipo resaltado. */
export function MatchCardView({ match, teams, highlight }: Props) {
  const home = teams.find((t) => t.id === match.home_team_id) ?? null;
  const away = teams.find((t) => t.id === match.away_team_id) ?? null;
  const played = match.status === "jugado" && match.home_goals != null && match.away_goals != null;
  const ours = home?.is_our_team || away?.is_our_team;
  const when = formatKickoff(match.kickoff_at);
  const shootoutName = match.shootout_winner_team_id
    ? teams.find((t) => t.id === match.shootout_winner_team_id)?.short_name ??
      teams.find((t) => t.id === match.shootout_winner_team_id)?.name ?? null
    : null;

  return (
    <article
      className={cn(
        "rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/5",
        ours && "bg-primary/10 ring-primary/25",
        highlight && "p-4",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {match.matchday != null ? `Jornada ${match.matchday}` : "Amistoso"}
        </span>
        <StatusBadge
          variant={
            match.status === "jugado" ? "approved" : match.status === "suspendido" ? "rejected" : "neutral"
          }
        >
          {MATCH_STATUS_LABEL[match.status]}
        </StatusBadge>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <TeamSide team={home} align="start" big={highlight} />
        <div className="shrink-0 px-1 text-center">
          {played ? (
            <p className={cn("font-semibold tabular-nums", highlight ? "text-2xl" : "text-lg")}>
              {match.home_goals} - {match.away_goals}
            </p>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">vs</p>
          )}
          {played && shootoutName ? (
            <p className="text-[11px] text-muted-foreground">Penales: {shootoutName}</p>
          ) : null}
        </div>
        <TeamSide team={away} align="end" big={highlight} />
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {when ? (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {when}
          </span>
        ) : null}
        {match.venue ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {match.venue}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function TeamSide({
  team,
  align,
  big,
}: {
  team: TournamentTeamRow | null;
  align: "start" | "end";
  big?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "end" && "flex-row-reverse text-right",
      )}
    >
      <TeamCrest
        path={team?.crest_path}
        name={team?.name ?? "Equipo"}
        className={big ? "h-12 w-12" : "h-9 w-9"}
      />
      <p
        className={cn(
          "min-w-0 truncate text-sm",
          team?.is_our_team ? "font-semibold text-primary" : "font-medium",
        )}
      >
        {team?.name ?? "Por definir"}
      </p>
    </div>
  );
}
