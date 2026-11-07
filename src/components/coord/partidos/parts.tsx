import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import { TeamCrest } from "@/components/match/TeamCrest";
import { useCrestTeam } from "@/components/agenda/AgendaCards";
import type { OurMatch } from "@/hooks/useMatchOps";
import { canManageTripsModule } from "@/lib/permissions";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { getClubTimeZone } from "@/lib/calendar-utils";
import { formationSlots, posGroup } from "@/lib/partidos";
import { cn } from "@/lib/utils";

/** Staff de Partidos = Ver o Editar en Partidos (en alguna categoría). */
export function usePartidosAccess() {
  const { isSuperAdmin, getModuleAccess } = useApp();
  const { canEditTeam, levelForTeam } = useTeamAccess("partidos");
  const canManage = isSuperAdmin || canManageTripsModule(getModuleAccess("partidos"));
  const canEdit = React.useCallback((teamId: string | null | undefined) => isSuperAdmin || canEditTeam(teamId), [isSuperAdmin, canEditTeam]);
  const canView = React.useCallback((teamId: string | null | undefined) => isSuperAdmin || canManageTripsModule(levelForTeam(teamId)), [isSuperAdmin, levelForTeam]);
  return { canManage, canEdit, canView };
}

const tz = () => getClubTimeZone();
export const fmtTime = (iso: string) => new Intl.DateTimeFormat("es-MX", { timeZone: tz(), hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).replace(/\s?([ap])\.?\s?m\.?/i, " $1m");
export const fmtDay = (iso: string) => new Intl.DateTimeFormat("es-MX", { timeZone: tz(), weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "").replace(" de ", " ").replace(/^./, (c) => c.toUpperCase());
export const fmtStamp = (iso: string) => `${new Intl.DateTimeFormat("es-MX", { timeZone: tz(), weekday: "short", day: "numeric" }).format(new Date(iso)).replace(/\./g, "")} · ${fmtTime(iso)}`;

export function matchTag(m: OurMatch) {
  return [m.tournament_name, m.matchday ? `Jornada ${m.matchday}` : null, m.isHome ? "Local" : "Visita"].filter(Boolean).join(" · ");
}

/** Escudos + hora o marcador. */
export function Scoreline({ match, big }: { match: OurMatch; big?: boolean }) {
  const home = useCrestTeam(match.home);
  const away = useCrestTeam(match.away);
  const played = match.status === "jugado" && match.home_goals != null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <TeamCrest team={home} size="lg" className={big ? "h-16 w-16" : "h-14 w-14"} />
        <span className="line-clamp-1 text-xs font-semibold">{home.shortName}</span>
      </div>
      <div className="text-center">
        {played ? (
          <span className="text-3xl font-bold tabular-nums">{match.home_goals} – {match.away_goals}</span>
        ) : match.kickoff_at ? (
          <>
            <div className="text-2xl font-bold leading-none">{fmtTime(match.kickoff_at)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{fmtDay(match.kickoff_at)}</div>
          </>
        ) : <span className="text-sm text-muted-foreground">Por definir</span>}
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <TeamCrest team={away} size="lg" className={big ? "h-16 w-16" : "h-14 w-14"} />
        <span className="line-clamp-1 text-xs font-semibold">{away.shortName}</span>
      </div>
    </div>
  );
}

export function StateTag({ published, at }: { published: boolean; at?: string | null }) {
  return (
    <div className={cn("rounded-xl px-3 py-2 text-xs font-semibold", published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
      {published && at ? `Publicada el ${fmtStamp(at)}` : "Borrador · solo lo ve el staff"}
    </div>
  );
}

export function Avatar({ name, url, number, className }: { name: string | null; url: string | null; number?: number | null; className?: string }) {
  const ini = (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className={cn("relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-full bg-muted text-xs font-bold", className)}>
      {url ? <img src={url} alt="" className="h-full w-full rounded-full object-cover" /> : ini}
      {number != null ? <span className="absolute -bottom-1 -right-1 rounded-full bg-background px-1 text-[10px] font-bold tabular-nums">{number}</span> : null}
    </span>
  );
}

export const shortName = (n: string | null | undefined) => {
  const w = (n ?? "").trim().split(/\s+/).filter(Boolean);
  return w.length > 1 ? `${w[0]} ${w[1]}` : w[0] ?? "Jugador";
};

export function PosTag({ position }: { position: string | null }) {
  const g = posGroup(position);
  return g ? <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{g}</span> : null;
}

export interface PitchPlayer { user_id: string; name: string | null; avatar_url: string | null; number: number | null }

/** Cancha vertical con los puestos de la formación. */
export function Pitch({ formation, assigned, players, onSlot, selected }: {
  formation: string | null; assigned: Record<string, string>; players: Map<string, PitchPlayer>;
  onSlot?: (slot: string) => void; selected?: string | null;
}) {
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-primary/25" />
      <div className="pointer-events-none absolute left-3 right-3 top-1/2 border-t border-primary/25" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-14 w-36 -translate-x-1/2 border border-b-0 border-primary/25" />
      <div className="pointer-events-none absolute left-1/2 top-3 h-14 w-36 -translate-x-1/2 border border-t-0 border-primary/25" />
      {formationSlots(formation).map((s) => {
        const p = assigned[s.key] ? players.get(assigned[s.key]) : null;
        const Comp = onSlot ? "button" : "div";
        return (
          <Comp key={s.key} {...(onSlot ? { type: "button", onClick: () => onSlot(s.key) } : {})}
            aria-label={p ? `${s.label}: ${p.name}` : `Puesto ${s.label}`}
            className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            {p ? (
              <Avatar name={p.name} url={p.avatar_url} number={p.number} className={cn("h-11 w-11 ring-2", selected === s.key ? "ring-primary" : "ring-background")} />
            ) : (
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed text-[10px] font-bold", selected === s.key ? "border-primary text-primary" : "border-muted-foreground/40 text-muted-foreground")}>{s.label}</span>
            )}
            <span className="max-w-full truncate rounded bg-background/80 px-1 text-[10px] font-semibold">{p ? shortName(p.name).split(" ")[0] : s.label}</span>
          </Comp>
        );
      })}
    </div>
  );
}

export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border/50 bg-background/95 px-4 py-2 backdrop-blur md:bottom-0">
      <div className="mx-auto flex max-w-4xl items-center gap-3">{children}</div>
    </div>
  );
}
