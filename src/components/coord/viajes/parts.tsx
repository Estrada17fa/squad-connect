import * as React from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plane, Users } from "lucide-react";
import { TeamCrest } from "@/components/torneo/TeamCrest";
import { cn } from "@/lib/utils";
import { departureLabel, type Readiness } from "@/lib/viajes";
import type { TripRow } from "@/hooks/useTrips";
import type { OurMatch } from "@/hooks/useMatchOps";
import { initialsOf } from "@/lib/coordinacion";
import { useTripLogistics } from "./useTripsModule";

export function shortDate(iso: string | null | undefined) {
  if (!iso) return "";
  const s = format(new Date(iso), "EEE d MMM", { locale: es }).replace(/\./g, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function timeLabel(iso: string | null | undefined) {
  if (!iso) return "";
  return format(new Date(iso), "h:mm aaa", { locale: es }).replace(/\./g, "").replace("a m", "am").replace("p m", "pm");
}
export function tripDates(t: Pick<TripRow, "departure_at" | "return_at">) {
  return `${shortDate(t.departure_at)}${t.return_at ? ` → ${shortDate(t.return_at)}` : ""}`;
}

/** Anillo de preparación. */
export function ReadinessRing({ percent, size = 36, className }: { percent: number; size?: number; className?: string }) {
  const stroke = size <= 40 ? 3.5 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} aria-label={`Preparación ${percent}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} className={percent === 100 ? "stroke-primary" : "stroke-area-general"} />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">{percent}</span>
    </span>
  );
}

/** Escudo del rival o ícono de avión. */
export function TripCrest({ match, size = "md" }: { match: OurMatch | null; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14" : size === "md" ? "h-10 w-10" : "h-8 w-8";
  if (match?.rival) return <TeamCrest path={match.rival.crest_path} name={match.rival.name} className={cls} />;
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-area-general-soft", cls)}>
      <Plane className={cn("text-area-general", size === "lg" ? "h-6 w-6" : "h-5 w-5")} />
    </span>
  );
}

/** Escudos del partido (nuestro vs rival) o el destino con un avión. */
export function TripMatchup({ trip, match }: { trip: TripRow; match: OurMatch | null }) {
  if (match?.rival && match.ours) {
    const home = match.isHome ? match.ours : match.rival;
    const away = match.isHome ? match.rival : match.ours;
    return (
      <div className="flex items-center justify-center gap-4">
        <TeamCrest path={home.crest_path} name={home.name} className="h-16 w-16" />
        <span className="text-sm font-bold text-muted-foreground">vs</span>
        <TeamCrest path={away.crest_path} name={away.name} className="h-16 w-16" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-3">
      <TripCrest match={null} size="lg" />
      {trip.destination ? <span className="text-lg font-bold">{trip.destination}</span> : null}
    </div>
  );
}

export function PersonAvatar({ p, size = 8, className }: { p: { full_name: string | null; email?: string | null; avatar_url: string | null } | null | undefined; size?: 6 | 8 | 10; className?: string }) {
  const s = size === 10 ? "h-10 w-10 text-xs" : size === 8 ? "h-8 w-8 text-[11px]" : "h-6 w-6 text-[9px]";
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold", s, className)}>
      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initialsOf(p?.full_name ?? null, p?.email ?? null)}
    </span>
  );
}

/** Fila de la lista. Calcula su propia preparación. */
export function TripListRow({ trip, match, teamName }: { trip: TripRow; match: OurMatch | null; teamName?: string }) {
  const { readiness } = useTripLogistics(trip);
  return (
    <Link to="/coordinacion/general/viajes/$tripId" params={{ tripId: trip.id }} className="coord-press flex items-center gap-3 px-3 py-3">
      <TripCrest match={match} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{trip.title}{trip.destination ? ` · ${trip.destination}` : ""}</span>
        <span className="block truncate text-xs text-muted-foreground">{tripDates(trip)}</span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {teamName ? <span className="truncate">{teamName}</span> : null}
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{trip.travelers.length}</span>
        </span>
      </span>
      <ReadinessRing percent={readiness.percent} />
    </Link>
  );
}

/** Tarjeta protagonista del próximo viaje. */
export function TripHeroCard({ trip, match, readiness }: { trip: TripRow; match: OurMatch | null; readiness: Readiness }) {
  return (
    <div className="rounded-2xl bg-area-general-soft p-4">
      <div className="text-[11px] font-bold tracking-wider text-area-general">PRÓXIMO VIAJE</div>
      <div className="mt-2 flex items-center gap-3">
        <TripCrest match={match} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold leading-snug">{trip.title}</div>
          <div className="text-[13px] text-muted-foreground">{departureLabel(trip.departure_at, trip.return_at)} · {shortDate(trip.departure_at)}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px]">
          <ReadinessRing percent={readiness.percent} size={32} />
          {readiness.ready ? "Todo listo para viajar" : `Preparación ${readiness.percent}%`}
        </span>
        <Link to="/coordinacion/general/viajes/$tripId" params={{ tripId: trip.id }} className="coord-press inline-flex h-8 shrink-0 items-center rounded-full bg-area-general px-4 text-[13px] font-semibold text-background">
          Abrir
        </Link>
      </div>
    </div>
  );
}

/** Pestañas deslizables con subrayado. */
export function ScrollTabs<K extends string>({ items, active, onChange }: { items: { key: K; label: string }[]; active: K; onChange: (k: K) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>(`[data-k="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);
  return (
    <div ref={ref} role="tablist" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border/60 px-4 [scrollbar-width:none]">
      {items.map((t) => (
        <button key={t.key} data-k={t.key} role="tab" aria-selected={active === t.key} onClick={() => onChange(t.key)} className={cn("relative shrink-0 px-3 py-2.5 text-sm font-semibold transition-colors", active === t.key ? "text-foreground" : "text-muted-foreground")}>
          {t.label}
          {active === t.key ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-area-general" /> : null}
        </button>
      ))}
    </div>
  );
}

export function SectionHead({ title, onAdd, addLabel, extra }: { title: string; onAdd?: () => void; addLabel?: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="flex items-center gap-1">
        {extra}
        {onAdd ? (
          <button onClick={onAdd} aria-label={addLabel ?? "Agregar"} className="coord-press flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-lg font-semibold">+</button>
        ) : null}
      </div>
    </div>
  );
}
