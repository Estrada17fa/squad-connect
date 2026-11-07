import * as React from "react";
import { MapPin, Navigation, Plane, Ticket, Users } from "lucide-react";
import { TeamCrest } from "@/components/match/TeamCrest";
import { useCrestUrl } from "@/hooks/useTournaments";
import type { OurMatch, OurMatchTeam } from "@/hooks/useMatchOps";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { agendaKind, rowTime, type TripMoment } from "@/lib/agenda";
import { getClubTimeZone } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const short = (t: OurMatchTeam | null) => t?.short_name || t?.name || "Por definir";
export function useCrestTeam(t: OurMatchTeam | null) {
  const { data: url } = useCrestUrl(t?.crest_path);
  return { shortName: short(t), src: url ?? null, own: !!t?.is_our_team && !t?.crest_path };
}
const timeOf = (iso: string) => rowTime({ starts_at: iso, event_type: "evento" }, getClubTimeZone())!;

/* ---------- Base ---------- */

function Card({ tag, side, children, footer, action, onOpen }: {
  tag: string; side?: string | null; children: React.ReactNode; footer?: React.ReactNode; action?: React.ReactNode; onOpen: () => void;
}) {
  return (
    <article className="rounded-[18px] bg-card p-4">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <span className="truncate">{tag}</span>
          {side ? <span className="shrink-0 normal-case tracking-normal">{side}</span> : null}
        </div>
        <div className="mt-3">{children}</div>
      </button>
      {footer || action ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{footer}</div>
          {action}
        </div>
      ) : null}
    </article>
  );
}

const pill = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-semibold text-foreground active:bg-muted/70";

function BigTime({ iso }: { iso: string }) {
  const t = timeOf(iso);
  return (
    <span className="whitespace-nowrap">
      <span className="text-2xl font-bold leading-none">{t.time}</span>
      <span className="ml-0.5 text-xs font-semibold text-muted-foreground">{t.ampm}</span>
    </span>
  );
}

/* ---------- Partido ---------- */

export function MatchCard({ event, match, callup, onOpen }: {
  event: CalendarEventRow; match: OurMatch | null; callup?: string | null; onOpen: () => void;
}) {
  const home = useCrestTeam(match?.home ?? null);
  const away = useCrestTeam(match?.away ?? null);
  const where = match?.venue || event.location;
  return (
    <Card
      tag={["Partido", match?.matchday ? `Jornada ${match.matchday}` : match?.tournament_name].filter(Boolean).join(" · ")}
      side={match ? (match.isHome ? "Local" : "Visita") : null}
      onOpen={onOpen}
      footer={
        <span className="flex items-center gap-1.5">
          {callup ? <span className={cn("font-semibold", callup === "Convocado" ? "text-primary" : "text-foreground")}>{callup}</span> : null}
          {callup && where ? <span>·</span> : null}
          {where ? <span className="truncate">{where}</span> : null}
        </span>
      }
      action={where ? <a href={mapsUrl(where)} target="_blank" rel="noreferrer" className={pill}><Navigation className="h-3.5 w-3.5" /> Cómo llegar</a> : null}
    >
      {match ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <TeamCrest team={home} size="lg" className="h-14 w-14" />
            <span className="line-clamp-1 text-xs font-semibold">{home.shortName}</span>
          </div>
          <BigTime iso={event.starts_at} />
          <div className="flex flex-col items-center gap-1.5 text-center">
            <TeamCrest team={away} size="lg" className="h-14 w-14" />
            <span className="line-clamp-1 text-xs font-semibold">{away.shortName}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">{event.title}</p>
          <BigTime iso={event.starts_at} />
        </div>
      )}
    </Card>
  );
}

/* ---------- Entrenamiento / junta / evento ---------- */

export function SimpleCard({ event, context, rsvp, onOpen }: {
  event: CalendarEventRow; context: string | null;
  rsvp?: { status: string; onRespond: (s: "confirmado" | "rechazado") => void } | null;
  onOpen: () => void;
}) {
  const kind = agendaKind(event);
  const Icon = kind === "junta" ? Users : EVENT_TYPE_MAP[event.event_type]?.icon ?? MapPin;
  const label = kind === "entrenamiento" ? "Entrenamiento" : kind === "junta" ? "Junta" : EVENT_TYPE_MAP[event.event_type]?.label ?? "Evento";
  const allDay = (event as { all_day?: boolean }).all_day;
  return (
    <Card
      tag={label}
      onOpen={onOpen}
      footer={rsvp ? (rsvp.status === "confirmado" ? "Confirmaste tu asistencia" : rsvp.status === "rechazado" ? "Avisaste que no asistirás" : "¿Asistirás?") : null}
      action={rsvp ? (
        <span className="flex gap-1.5">
          {(["confirmado", "rechazado"] as const).map((s) => (
            <button key={s} type="button" onClick={() => rsvp.onRespond(s)}
              className={cn(pill, rsvp.status === s && (s === "confirmado" ? "bg-primary text-primary-foreground" : "bg-destructive/20 text-destructive"))}>
              {s === "confirmado" ? "Asistiré" : "No asistiré"}
            </button>
          ))}
        </span>
      ) : null}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted"><Icon className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold leading-snug">{event.title}</p>
          {context ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{context}</p> : null}
        </div>
        {allDay ? <span className="text-xs font-semibold text-muted-foreground">Todo el día</span> : <BigTime iso={event.starts_at} />}
      </div>
    </Card>
  );
}

/* ---------- Viaje (pase de abordar) ---------- */

export function TripCard({ trip, moment, hasPass, onOpen }: {
  trip: { title: string; destination: string | null; meeting_point: string | null; meeting_at: string | null };
  moment: TripMoment; hasPass: boolean; onOpen: () => void;
}) {
  const f = moment.flight;
  const ida = moment.leg === "ida";
  const meet = ida && trip.meeting_at ? `Reunión ${timeOf(trip.meeting_at).time} ${timeOf(trip.meeting_at).ampm}${trip.meeting_point ? ` · ${trip.meeting_point}` : ""}` : ida ? trip.meeting_point : `Regreso de ${trip.destination ?? "viaje"}`;
  const from = f?.origin ?? (ida ? "Salida" : trip.destination ?? "Destino");
  const to = f?.destination ?? (ida ? trip.destination ?? "Destino" : "Regreso");
  return (
    <Card
      tag={`Viaje · ${ida ? "Ida" : "Regreso"}`}
      side={f?.flight_code ?? null}
      onOpen={onOpen}
      footer={meet}
      action={<button type="button" onClick={onOpen} className={pill}><Ticket className="h-3.5 w-3.5" /> {hasPass ? "Mi pase" : "Mi viaje"}</button>}
    >
      {f ? (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div>
            <p className="text-2xl font-bold leading-none tracking-wide">{from.toUpperCase()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{timeOf(f.departs_at).time} {timeOf(f.departs_at).ampm}</p>
          </div>
          <div className="relative flex items-center justify-center">
            <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-muted-foreground/50" />
            <span className="relative bg-card px-1.5"><Plane className="h-4 w-4 text-muted-foreground" /></span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold leading-none tracking-wide">{to.toUpperCase()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{f.arrives_at ? `${timeOf(f.arrives_at).time} ${timeOf(f.arrives_at).ampm}` : "—"}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-semibold">{from} → {to}</p>
          <BigTime iso={moment.at} />
        </div>
      )}
    </Card>
  );
}
