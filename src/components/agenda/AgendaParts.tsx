import * as React from "react";
import { ChevronRight, MapPin, Navigation, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchupHeader } from "@/components/match/MatchupHeader";
import { TeamCrest } from "@/components/match/TeamCrest";
import { useCrestUrl } from "@/hooks/useTournaments";
import type { OurMatch, OurMatchTeam } from "@/hooks/useMatchOps";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { agendaKind, rowTime } from "@/lib/agenda";
import { getClubTimeZone, formatRelativeDayLabel, formatTime } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

const short = (t: OurMatchTeam | null) => t?.short_name || t?.name || "Por definir";

function useCrestTeam(t: OurMatchTeam | null) {
  const { data: url } = useCrestUrl(t?.crest_path);
  return { shortName: short(t), src: url ?? null, own: !!t?.is_our_team && !t?.crest_path };
}

export function MatchCrests({ match }: { match: OurMatch }) {
  const home = useCrestTeam(match.home);
  const away = useCrestTeam(match.away);
  return (
    <span className="flex shrink-0 items-center -space-x-1.5">
      <TeamCrest team={home} size="sm" />
      <TeamCrest team={away} size="sm" />
    </span>
  );
}

const dayFmt = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });
export const shortDay = (d: Date) => dayFmt.format(d).replace(/\./g, "").replace(/^\w/, (c) => c.toUpperCase());
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Etiqueta pequeña del protagonista: "MAÑANA · JORNADA 11". */
function heroTag(iso: string, extra?: string | null) {
  const d = new Date(iso);
  const rel = formatRelativeDayLabel(d);
  const day = rel === "HOY" || rel === "MAÑANA" ? rel : shortDay(d).toUpperCase();
  return [day, extra?.toUpperCase()].filter(Boolean).join(" · ");
}

const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export interface HeroTrip { id: string; destination: string | null; title: string; departure_at: string; meeting_at: string | null; meeting_point: string | null }

export function AgendaHero({
  event, match, callup, myTrip, trip, onOpen, onOpenTrip,
}: {
  event: CalendarEventRow;
  match?: OurMatch | null;
  callup?: "Convocado" | "No convocado" | "Convocatoria pendiente" | null;
  /** Viaje publicado donde viaja (para el botón "Mi viaje" del partido). */
  myTrip?: HeroTrip | null;
  /** Si el protagonista ES un viaje. */
  trip?: HeroTrip | null;
  onOpen: () => void;
  onOpenTrip: (id: string) => void;
}) {
  const kind = agendaKind(event);
  const home = useCrestTeam(match?.home ?? null);
  const away = useCrestTeam(match?.away ?? null);
  const where = match?.venue || event.location;
  const when = cap(longFmt.format(new Date(event.starts_at)));

  return (
    <section className="rounded-2xl bg-primary/[0.08] p-4">
      {kind === "partido" && match ? (
        <button type="button" onClick={onOpen} className="block w-full text-center">
          <p className="text-[11px] font-bold tracking-[0.12em] text-primary">{heroTag(event.starts_at, match.matchday ? `Jornada ${match.matchday}` : null)}</p>
          <MatchupHeader className="mt-3" home={home} away={away} />
          <p className="mt-2 text-sm font-semibold">{when} · {formatTime(event.starts_at)}</p>
          {where ? <p className="mt-0.5 text-xs text-muted-foreground">{where}</p> : null}
          {callup ? (
            <p className={cn("mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", callup === "Convocado" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{callup}</p>
          ) : null}
        </button>
      ) : kind === "viaje" && trip ? (
        <button type="button" onClick={() => onOpenTrip(trip.id)} className="block w-full text-left">
          <p className="text-[11px] font-bold tracking-[0.12em] text-primary">{heroTag(trip.departure_at, "Viaje")}</p>
          <p className="mt-2 text-lg font-bold leading-snug">{trip.destination || trip.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Salida {trip.meeting_at ? formatTime(trip.meeting_at) : cap(longFmt.format(new Date(trip.departure_at)))}
            {trip.meeting_point ? ` · ${trip.meeting_point}` : ""}
          </p>
        </button>
      ) : (
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <p className="text-[11px] font-bold tracking-[0.12em] text-primary">{heroTag(event.starts_at, EVENT_TYPE_MAP[event.event_type]?.label)}</p>
          <p className="mt-2 text-lg font-bold leading-snug">{event.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{when} · {formatTime(event.starts_at)}</p>
          {event.location ? <p className="mt-0.5 text-xs text-muted-foreground">{event.location}</p> : null}
        </button>
      )}

      {kind === "partido" && (myTrip || where) ? (
        <div className="mt-3 flex justify-center gap-2">
          {myTrip ? (
            <Button size="sm" variant="secondary" className="h-8" onClick={() => onOpenTrip(myTrip.id)}><Plane className="mr-1.5 h-3.5 w-3.5" /> Mi viaje</Button>
          ) : null}
          {where ? (
            <Button size="sm" variant="secondary" className="h-8" asChild>
              <a href={mapsUrl(where)} target="_blank" rel="noreferrer"><Navigation className="mr-1.5 h-3.5 w-3.5" /> Cómo llegar</a>
            </Button>
          ) : null}
        </div>
      ) : kind === "viaje" && trip ? (
        <div className="mt-3"><Button size="sm" variant="secondary" className="h-8" onClick={() => onOpenTrip(trip.id)}>Ver mi viaje</Button></div>
      ) : null}
    </section>
  );
}

export function AgendaRow({
  event, context, match, rsvp, onClick,
}: {
  event: CalendarEventRow;
  context: string | null;
  match?: OurMatch | null;
  rsvp?: { status: string; onRespond: (s: "confirmado" | "rechazado") => void } | null;
  onClick: () => void;
}) {
  const t = rowTime(event, getClubTimeZone());
  const Icon = EVENT_TYPE_MAP[agendaKind(event) === "viaje" ? "viaje" : event.event_type]?.icon ?? MapPin;
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-muted/50">
        <div className="w-12 shrink-0 text-left">
          {t ? (
            <>
              <p className="text-base font-bold leading-none">{t.time}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t.ampm}</p>
            </>
          ) : (
            <p className="text-xs font-semibold leading-tight text-muted-foreground">Todo el día</p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{event.title}</p>
            {match ? <MatchCrests match={match} /> : <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          </div>
          {context ? <p className="mt-0.5 text-xs text-muted-foreground">{context}</p> : null}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {rsvp ? (
        <div className="flex gap-2 px-3.5 pb-3 pl-[4.375rem]">
          {(["confirmado", "rechazado"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => rsvp.onRespond(s)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold",
                rsvp.status === s ? (s === "confirmado" ? "bg-primary text-primary-foreground" : "bg-destructive/20 text-destructive") : "bg-muted text-muted-foreground",
              )}
            >
              {s === "confirmado" ? "Asistiré" : "No asistiré"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
