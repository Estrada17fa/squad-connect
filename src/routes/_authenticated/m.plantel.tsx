import * as React from "react";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { useApp } from "@/components/squad/AppLayout";
import { useRoster, type RosterMember } from "@/hooks/useRoster";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { canManageUsers } from "@/lib/permissions";
import { POSITION_GROUP_LABEL, POSITION_GROUP_ORDER, positionGroup } from "@/lib/plantel";
import { PlayerCard, StaffCard } from "@/components/plantel/PersonCards";
import { PersonDetailSheet } from "@/components/plantel/PersonDetailSheet";
import {
  PlantelFilters,
  EMPTY_PLANTEL_FILTERS,
  type PlantelFilterState,
} from "@/components/plantel/PlantelFilters";

export const Route = createFileRoute("/_authenticated/m/plantel")({
  head: () => ({
    meta: [
      { title: "Squad — Plantel" },
      { name: "description", content: "Consulta el plantel y el cuerpo técnico de cada categoría." },
    ],
  }),
  component: PlantelPage,
});

const CLUB_WIDE = "__club__";

function PlantelPage() {
  const { profile, teamOptions, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const { canReadTeam } = useTeamAccess("plantel");
  const canEditUsers = isSuperAdmin || canManageUsers(permissions["usuarios"]);

  const { data: members, isLoading } = useRoster(clubId, null);
  const [selected, setSelected] = React.useState<RosterMember | null>(null);

  const initialTeam = useRouterState({
    select: (s) => (s.location.search as { team?: string } | undefined)?.team,
  });
  const [filters, setFilters] = React.useState<PlantelFilterState>(() => ({
    ...EMPTY_PLANTEL_FILTERS,
    teamId: initialTeam ?? null,
  }));

  // Alcance: cada quien ve solo las categorías donde su nivel de 'plantel' lee.
  const visible = React.useMemo(
    () => (members ?? []).filter((m) => canReadTeam(m.teamId)),
    [members, canReadTeam],
  );

  const filtered = React.useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return visible.filter((m) => {
      const isPlayer = m.baseRole === "jugador";
      if (filters.kind === "jugador" && !isPlayer) return false;
      if (filters.kind === "staff" && isPlayer) return false;
      if (filters.teamId && (m.teamId ?? CLUB_WIDE) !== filters.teamId) return false;
      if (filters.position && (!isPlayer || positionGroup(m.position) !== filters.position)) return false;
      if (q) {
        const hay = `${m.fullName ?? ""} ${m.position ?? ""} ${m.jobTitle ?? ""} ${m.roleName ?? ""}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [visible, filters]);

  // Orden explícito del club (principal primero) tomado de teamOptions.
  const teamRank = React.useMemo(() => {
    const m = new Map<string, number>();
    teamOptions.forEach((t, i) => {
      if (t.id) m.set(t.id, i);
    });
    return m;
  }, [teamOptions]);
  const rankOf = React.useCallback((id: string) => teamRank.get(id) ?? 999, [teamRank]);

  const teamFilterOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of visible) {
      if (m.teamId) map.set(m.teamId, m.teamName ?? "Categoría");
      else map.set(CLUB_WIDE, "Todo el club");
    }
    for (const t of teamOptions) if (t.id && map.has(t.id)) map.set(t.id, t.name);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => (a.id === CLUB_WIDE ? 1 : b.id === CLUB_WIDE ? -1 : rankOf(a.id) - rankOf(b.id)));
  }, [visible, teamOptions, rankOf]);

  // Agrupación: una sección por categoría (+ "Todo el club" al final).
  const groups = React.useMemo(() => {
    const map = new Map<string, { key: string; name: string; players: RosterMember[]; staff: RosterMember[] }>();
    for (const m of filtered) {
      const key = m.teamId ?? CLUB_WIDE;
      const g =
        map.get(key) ??
        { key, name: m.teamId ? m.teamName ?? "Categoría" : "Todo el club", players: [], staff: [] };
      if (m.baseRole === "jugador") g.players.push(m);
      else g.staff.push(m);
      map.set(key, g);
    }
    for (const g of map.values()) {
      g.players.sort(
        (a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) || (a.fullName ?? "").localeCompare(b.fullName ?? ""),
      );
      g.staff.sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""));
    }
    return [...map.values()].sort((a, b) =>
      a.key === CLUB_WIDE ? 1 : b.key === CLUB_WIDE ? -1 : rankOf(a.key) - rankOf(b.key),
    );
  }, [filtered, rankOf]);

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="plantel" />
      <PageHeader hideTitle title="Plantel" subtitle="Equipo de trabajo por categoría" />

      <PlantelFilters
        value={filters}
        onChange={setFilters}
        teams={teamFilterOptions}
        count={filtered.length}
      />

      {isLoading && !members ? (
        <CardGridSkeleton count={6} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title={visible.length ? "Sin resultados" : "Plantel vacío"}
          message={
            visible.length
              ? "Ajusta los filtros para ver más personas."
              : "Aún no hay personas registradas en tus categorías."
          }
        />
      ) : (
        <div className="min-w-0 space-y-8">
          {groups.map((g) => (
            <section key={g.key} className="min-w-0 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">{g.name}</h2>

              {g.players.length > 0 ? (
                <div className="space-y-4">
                  {POSITION_GROUP_ORDER.map((pos) => {
                    const list = g.players.filter((p) => positionGroup(p.position) === pos);
                    if (list.length === 0) return null;
                    return (
                      <div key={pos} className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {POSITION_GROUP_LABEL[pos]}
                          <span className="ml-2 text-muted-foreground/70">{list.length}</span>
                        </h3>
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {list.map((m, i) => (
                            <PlayerCard key={m.key} member={m} index={i} onClick={() => setSelected(m)} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {g.staff.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cuerpo técnico y staff
                    <span className="ml-2 text-muted-foreground/70">{g.staff.length}</span>
                  </h3>
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {g.staff.map((m, i) => (
                      <StaffCard key={m.key} member={m} index={i} onClick={() => setSelected(m)} />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {selected ? (
        <PersonDetailSheet
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          member={selected}
          canEditUsers={canEditUsers}
        />
      ) : null}
    </div>
  );
}
