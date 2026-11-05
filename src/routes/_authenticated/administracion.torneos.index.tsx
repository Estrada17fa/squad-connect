import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, Plus, Search, Trophy, X } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UsersHeader, BackLabel, IconBtn, UsersTabs } from "@/components/admin/users/ui";
import { useTournaments } from "@/hooks/useTournaments";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { usePlayedMatchCounts } from "@/hooks/useTournamentAdmin";
import { TournamentLogo } from "@/components/torneo/TournamentLogo";
import { displayStatus, summaryLine, type DisplayStatus } from "@/lib/torneoAdmin";

type Tab = DisplayStatus;
export const Route = createFileRoute("/_authenticated/administracion/torneos/")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: s.tab === "proximo" || s.tab === "finalizado" || s.tab === "en_curso" ? (s.tab as Tab) : undefined,
  }),
  head: () => ({ meta: [{ title: "Torneos · Administración · Squad" }, { name: "description", content: "Torneos del club en curso, próximos y finalizados." }] }),
  component: TorneosList,
});

function TorneosList() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { profile } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = useEditableTeams("torneo").length > 0;
  const listQ = useTournaments(clubId);
  const playedQ = usePlayedMatchCounts(clubId);
  const [q, setQ] = React.useState("");
  const [searching, setSearching] = React.useState(false);

  const rows = (listQ.data ?? []).map((t) => ({ t, st: displayStatus(t.status, playedQ.data?.[t.id] ?? 0) }));
  const count = (k: Tab) => rows.filter((r) => r.st === k).length;
  const tab: Tab = search.tab ?? (count("en_curso") ? "en_curso" : count("proximo") ? "proximo" : "en_curso");
  const term = q.trim().toLowerCase();
  const shown = rows.filter((r) => (term ? `${r.t.name} ${r.t.season ?? ""}`.toLowerCase().includes(term) : r.st === tab));

  return (
    <div className="coord-enter mx-auto max-w-3xl space-y-4 pb-28">
      <UsersHeader
        back={<Link to="/administracion"><BackLabel>Administración</BackLabel></Link>}
        title="Torneos"
        actions={<>
          <IconBtn label="Buscar" active={searching} onClick={() => { setSearching(!searching); setQ(""); }}><Search className="h-5 w-5" /></IconBtn>
          {canEdit ? <IconBtn label="Nuevo torneo" onClick={() => navigate({ to: "/administracion/torneos/nuevo" })}><Plus className="h-5 w-5" /></IconBtn> : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button aria-label="Más opciones" className="coord-press flex h-10 w-10 items-center justify-center rounded-xl"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link to="/admin/torneo">Ver versión actual</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>}
      />
      {searching ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar torneo" className="h-11 border-0 bg-card pl-9" />
          {q ? <button aria-label="Borrar" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1"><X className="h-4 w-4" /></button> : null}
        </div>
      ) : (
        <UsersTabs<Tab>
          value={tab}
          onChange={(v) => navigate({ to: "/administracion/torneos", search: { tab: v }, replace: true })}
          tabs={[
            { key: "en_curso", label: `En curso ${count("en_curso")}` },
            { key: "proximo", label: `Próximos ${count("proximo")}` },
            { key: "finalizado", label: `Finalizados ${count("finalizado")}` },
          ]}
        />
      )}
      {listQ.isLoading ? <LoadingState /> : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-card"><Trophy className="h-7 w-7 text-muted-foreground" /></span>
          <p className="text-sm text-muted-foreground">{term ? "Ningún torneo coincide." : (listQ.data ?? []).length ? "No hay torneos aquí." : "Aún no hay torneos. Crea el primero y arma su formato y equipos."}</p>
          {canEdit && !term ? <Link to="/administracion/torneos/nuevo" className="coord-press inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Crear torneo</Link> : null}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map(({ t }) => (
            <li key={t.id}>
              <Link to="/administracion/torneos/$id" params={{ id: t.id }} className="coord-press flex items-center gap-4 rounded-[18px] bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <TournamentLogo path={t.logo_path} name={t.name} className="h-20 w-20" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[17px] font-bold leading-tight">{t.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{[t.season, t.team_name].filter(Boolean).join(" · ")}</span>
                  <span className="mt-1.5 block truncate text-xs font-medium">{summaryLine(t.type, t.teams_count, t.has_playoffs)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
