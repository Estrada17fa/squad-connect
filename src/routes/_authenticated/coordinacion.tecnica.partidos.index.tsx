import * as React from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft, Trophy } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { Segmented } from "@/components/coord/tareas/parts";
import { CoordEmptyState } from "@/components/coord/EmptyState";
import { useMatchCallups, useMatchLogistics, useOurMatches, type OurMatch } from "@/hooks/useMatchOps";
import { Scoreline, matchTag, usePartidosAccess } from "@/components/coord/partidos/parts";
import { callupStatus } from "@/lib/partidos";
import { getArea } from "@/lib/coordAreas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coordinacion/tecnica/partidos/")({
  head: () => ({
    meta: [
      { title: "Partidos — Coordinación Squad" },
      { name: "description", content: "Nuestros partidos: convocatoria, alineación, citación y resultado." },
      { property: "og:title", content: "Partidos — Coordinación Squad" },
      { property: "og:description", content: "Prepara cada partido y registra su resultado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartidosListPage,
});

function PartidosListPage() {
  const { profile } = useApp();
  const { canManage, canView } = usePartidosAccess();
  const matchesQ = useOurMatches(canManage ? profile?.club_id : null);
  const [when, setWhen] = React.useState<"proximos" | "jugados">("proximos");
  const [tour, setTour] = React.useState<string>("all");
  const [side, setSide] = React.useState<"all" | "local" | "visita">("all");

  const all = (matchesQ.data ?? []).filter((m) => canView(m.tournament_team_id));
  const ids = React.useMemo(() => all.map((m) => m.id), [all.map((m) => m.id).join(",")]);
  const callups = useMatchCallups(ids).data ?? [];
  const logs = useMatchLogistics(ids).data ?? [];
  if (!canManage) return <Navigate to="/m/agenda" replace />;

  const tours = [...new Map(all.map((m) => [m.tournament_id, m.tournament_name])).entries()];
  const filtered = all.filter((m) => (tour === "all" || m.tournament_id === tour) && (side === "all" || (side === "local") === m.isHome));
  const played = filtered.filter((m) => m.status === "jugado").reverse();
  const upcoming = filtered.filter((m) => m.status !== "jugado");
  const list = when === "proximos" ? upcoming : played;

  return (
    <div className="coord-enter mx-auto max-w-4xl space-y-4 pb-24">
      <header className="space-y-2">
        <Link to="/coordinacion/$area" params={{ area: "tecnica" }} className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
          <ChevronLeft className="h-5 w-5" /> Técnica
        </Link>
        <h1 className="flex items-center gap-3 text-xl font-bold"><Trophy className="h-5 w-5 text-area-tecnica" />Partidos</h1>
        <div className="flex gap-2 overflow-x-auto">
          {tours.length > 1 ? (
            <select aria-label="Torneo" value={tour} onChange={(e) => setTour(e.target.value)} className="min-h-9 rounded-full bg-muted px-3 text-xs font-semibold">
              <option value="all">Todos los torneos</option>
              {tours.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          ) : null}
          {(["all", "local", "visita"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setSide(k)} className={cn("min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold", side === k ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
              {k === "all" ? "Todos" : k === "local" ? "Local" : "Visita"}
            </button>
          ))}
        </div>
      </header>

      <Segmented value={when} onChange={setWhen} items={[{ key: "proximos" as const, label: `Próximos · ${upcoming.length}` }, { key: "jugados" as const, label: `Jugados · ${played.length}` }]} />

      {matchesQ.isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-44 animate-pulse rounded-[18px] bg-card" />)}</div>
      ) : list.length === 0 ? (
        <CoordEmptyState area={getArea("tecnica")!} icon={Trophy} text={when === "proximos" ? "Sin partidos próximos" : "Sin partidos jugados"} />
      ) : (
        <div className="space-y-3">
          {list.map((m) => {
            const n = callups.filter((c) => c.match_id === m.id).length;
            const l = logs.find((x) => x.match_id === m.id) ?? null;
            return <MatchListCard key={m.id} match={m} count={n} callupPublishedAt={l?.callup_published_at ?? null} lineupPublished={!!l?.lineup_published_at} hasLineup={!!l?.formation} />;
          })}
        </div>
      )}
    </div>
  );
}

function MatchListCard({ match, count, callupPublishedAt, lineupPublished, hasLineup }: { match: OurMatch; count: number; callupPublishedAt: string | null; lineupPublished: boolean; hasLineup: boolean }) {
  const st = callupStatus(count, callupPublishedAt);
  return (
    <Link to="/coordinacion/tecnica/partidos/$matchId" params={{ matchId: match.id }} search={{ seccion: undefined }} className="coord-press block rounded-[18px] bg-card p-4">
      <div className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{matchTag(match)}</div>
      <div className="mt-3"><Scoreline match={match} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-3 text-xs">
        <span>Convocatoria: <b className={st === "Publicada" ? "text-primary" : ""}>{st}{count ? ` · ${count}` : ""}</b></span>
        {count >= 11 ? <span>Alineación: <b className={lineupPublished ? "text-primary" : ""}>{lineupPublished ? "Publicada" : hasLineup ? "Borrador" : "Sin alineación"}</b></span> : null}
      </div>
    </Link>
  );
}
