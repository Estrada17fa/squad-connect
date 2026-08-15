import { CalendarDays, MapPin, Users } from "lucide-react";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { TeamCrest } from "@/components/torneo/TeamCrest";
import { MATCH_STATUS_LABEL } from "@/lib/torneo";
import type { OurMatch } from "@/hooks/useMatchOps";
import { cn } from "@/lib/utils";

export function formatMatchWhen(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "hoy" / "mañana" / "en X días" para un partido próximo. */
export function relativeDays(iso: string | null): string | null {
  if (!iso) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

interface Props {
  match: OurMatch;
  callupCount: number;
  highlight?: boolean;
  onOpen: () => void;
}

/** Tarjeta escaneable de uno de nuestros partidos. */
export function MatchOpsCard({ match, callupCount, highlight, onOpen }: Props) {
  const played = match.status === "jugado" && match.home_goals != null && match.away_goals != null;
  const when = formatMatchWhen(match.kickoff_at);
  const rel = match.status === "programado" ? relativeDays(match.kickoff_at) : null;
  const ourGoals = match.isHome ? match.home_goals : match.away_goals;
  const rivalGoals = match.isHome ? match.away_goals : match.home_goals;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-white/[0.04] p-3 pl-5 text-left ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/[0.07]",
        highlight && "bg-primary/10 p-4 pl-5 ring-primary/25",
      )}
    >
      <AccentBar color={matchAccent(match.status)} label={MATCH_STATUS_LABEL[match.status]} />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs uppercase tracking-wider text-muted-foreground">
          {match.tournament_name}
          {match.matchday != null ? ` · J${match.matchday}` : ""}
        </span>
        <StatusBadge
          variant={
            match.status === "jugado" ? "approved" : match.status === "suspendido" ? "rejected" : "info"
          }
        >
          {MATCH_STATUS_LABEL[match.status]}
        </StatusBadge>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <TeamCrest
          name={match.rival?.name ?? "Rival"}
          path={match.rival?.crest_path ?? null}
          className={highlight ? "h-12 w-12" : "h-10 w-10"}
        />

        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium text-foreground", highlight && "text-lg")}>
            {match.rival?.name ?? "Rival por definir"}
          </p>
          <p className="text-xs text-muted-foreground">
            {match.isHome ? "Local" : "Visitante"}
            {match.ours?.name ? ` · ${match.ours.name}` : ""}
          </p>
        </div>
        {played ? (
          <p className="shrink-0 text-lg font-semibold tabular-nums">
            {ourGoals} - {rivalGoals}
          </p>
        ) : rel ? (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {rel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {callupCount} convocados
        </span>
      </div>
    </button>
  );
}
