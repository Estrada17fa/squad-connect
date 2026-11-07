import * as React from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MapPin } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { useMatchLogistics, useOurMatches } from "@/hooks/useMatchOps";
import { Scoreline, matchTag, usePartidosAccess } from "@/components/coord/partidos/parts";
import { CallupTab } from "@/components/coord/partidos/CallupTab";
import { LineupTab } from "@/components/coord/partidos/LineupTab";
import { CitacionTab } from "@/components/coord/partidos/CitacionTab";
import { ResultTab } from "@/components/coord/partidos/ResultTab";
import { cn } from "@/lib/utils";

const SECTIONS = ["convocatoria", "alineacion", "citacion", "resultado"] as const;
type Section = (typeof SECTIONS)[number];
const LABEL: Record<Section, string> = { convocatoria: "Convocatoria", alineacion: "Alineación", citacion: "Citación", resultado: "Resultado" };

export const Route = createFileRoute("/_authenticated/coordinacion/tecnica/partidos/$matchId")({
  validateSearch: (s: Record<string, unknown>) => ({ seccion: (SECTIONS as readonly string[]).includes(s.seccion as string) ? (s.seccion as Section) : undefined }),
  head: () => ({
    meta: [
      { title: "Partido — Coordinación Squad" },
      { name: "description", content: "Convocatoria, alineación, citación y resultado del partido." },
      { property: "og:title", content: "Partido — Coordinación Squad" },
      { property: "og:description", content: "Prepara el partido y registra su resultado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartidoPage,
});

function PartidoPage() {
  const { matchId } = Route.useParams();
  const { seccion } = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user } = useApp();
  const { canManage, canEdit, canView } = usePartidosAccess();
  const matchesQ = useOurMatches(canManage ? profile?.club_id : null);
  const all = matchesQ.data ?? [];
  const match = all.find((m) => m.id === matchId) ?? null;
  const logistics = (useMatchLogistics(match ? [match.id] : []).data ?? [])[0] ?? null;

  if (!canManage) return <Navigate to="/m/agenda" replace />;
  if (matchesQ.isLoading) return <div className="h-60 animate-pulse rounded-2xl bg-card" />;
  if (!match || !canView(match.tournament_team_id)) return <Navigate to="/coordinacion/tecnica/partidos" replace />;

  const played = match.status === "jugado";
  const section: Section = seccion ?? (played ? "resultado" : "convocatoria");
  const editable = canEdit(match.tournament_team_id);
  const prev = all.filter((m) => m.tournament_team_id === match.tournament_team_id && m.id !== match.id && (m.kickoff_at ?? "") < (match.kickoff_at ?? "")).at(-1) ?? null;
  const props = { match, logistics, canEdit: editable, userId: user.id, prevMatchId: prev?.id ?? null };

  return (
    <div className="coord-enter mx-auto max-w-4xl space-y-4">
      <Link to="/coordinacion/tecnica/partidos" className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
        <ChevronLeft className="h-5 w-5" /> Partidos
      </Link>
      <section className="rounded-[18px] bg-card p-4">
        <div className="truncate text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{matchTag(match)}</div>
        <div className="mt-3"><Scoreline match={match} big /></div>
        {match.venue ? <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{match.venue}</div> : null}
      </section>
      <div role="tablist" className="sticky top-0 z-20 -mx-4 flex gap-1 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur">
        {SECTIONS.map((s) => (
          <button key={s} role="tab" aria-selected={s === section} type="button" onClick={() => navigate({ to: ".", search: { seccion: s }, replace: true })}
            className={cn("min-h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold", s === section ? "bg-foreground text-background" : "text-muted-foreground")}>
            {LABEL[s]}
          </button>
        ))}
      </div>
      {section === "convocatoria" ? <CallupTab {...props} /> : section === "alineacion" ? <LineupTab {...props} /> : section === "citacion" ? <CitacionTab {...props} /> : <ResultTab {...props} />}
    </div>
  );
}
