import * as React from "react";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/components/squad/AppLayout";
import { useRoster, type RosterMember } from "@/hooks/useRoster";
import type { AvailabilityStatus } from "@/hooks/usePlayers";
import { cn } from "@/lib/utils";
import type { BaseRole } from "@/lib/rolePages";
import { TeamFilter, TeamBadge } from "@/components/squad/TeamFilter";
import { Button } from "@/components/ui/button";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { PlayerFormDialog } from "@/components/plantel/PlayerFormDialog";

export const Route = createFileRoute("/_authenticated/m/plantel")({
  head: () => ({
    meta: [
      { title: "Squad — Plantel" },
      { name: "description", content: "Roster completo del equipo activo, con filtros por rol." },
    ],
  }),
  component: PlantelPage,
});

export const AVAILABILITY_META: Record<AvailabilityStatus, { label: string; variant: StatusVariant }> = {
  apto: { label: "Apto", variant: "info" },
  lesionado: { label: "Lesionado", variant: "rejected" },
  en_duda: { label: "En duda", variant: "pending" },
};

const ROLE_FILTERS: { value: BaseRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "tecnico", label: "Técnico" },
  { value: "medico", label: "Médico" },
  { value: "staff", label: "Staff" },
  { value: "jugador", label: "Jugador" },
];


function formatBirthday(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function PlantelPage() {
  const navigate = useNavigate();
  const { user, profile, teamOptions } = useApp();

  const clubId = profile?.club_id ?? null;
  // Sin equipo activo global: se carga todo lo accesible y se filtra localmente.
  const { data: members, isLoading } = useRoster(clubId, null);
  const [teamFilter, setTeamFilter] = React.useState<string | null>(null);
  const teamNameById = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teamOptions) if (t.id) m[t.id] = t.name;
    return m;
  }, [teamOptions]);
  const initialRole = useRouterState({
    select: (s) => (s.location.search as { role?: string } | undefined)?.role,
  });
  const [roleFilter, setRoleFilter] = React.useState<Set<BaseRole>>(() => {
    const r = initialRole as BaseRole | undefined;
    return r ? new Set([r]) : new Set();
  });
  const [search, setSearch] = React.useState("");
  // Alta de jugador: solo equipos donde el nivel de 'plantel' llega a editor.
  const editableTeams = useEditableTeams("plantel");
  const [createOpen, setCreateOpen] = React.useState(false);
  

  const toggleRole = (r: BaseRole) => {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  };

  const filterTeamName = teamFilter ? teamNameById[teamFilter] : null;
  const filtered = (members ?? []).filter((m) => {
    if (filterTeamName && m.teamName !== filterTeamName) return false;
    if (roleFilter.size > 0 && (!m.baseRole || !roleFilter.has(m.baseRole as BaseRole))) return false;
    if (search && !(m.fullName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const onCardClick = (m: RosterMember) => {
    if (m.baseRole === "jugador" && m.playerId) {
      navigate({ to: "/m/plantel/$playerId", params: { playerId: m.playerId } });
      return;
    }
    if (m.userId === user.id) navigate({ to: "/mi-perfil" });
  };

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="plantel" />
      <PageHeader
        hideTitle
        title="Plantel"
        subtitle="Todos tus equipos"
      />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />

      {clubId && editableTeams.length > 0 ? (
        <Button onClick={() => setCreateOpen(true)} className="w-full glow-primary">
          <Plus className="mr-2 h-4 w-4" /> Agregar jugador
        </Button>
      ) : null}

      <div className="space-y-2">
        <Input placeholder="Buscar miembro…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setRoleFilter(new Set())}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              roleFilter.size === 0
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/50 text-muted-foreground hover:border-white/20 hover:text-foreground",
            )}
          >
            Todos
          </button>
          {ROLE_FILTERS.map((r) => {
            const active = roleFilter.has(r.value);
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => toggleRole(r.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-white/20 hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && !members ? (
        <CardGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={members?.length ? "Sin resultados" : "Plantel vacío"}
          message={
            members?.length
              ? "Ajusta los filtros para ver más miembros."
              : "Aún no hay miembros en este contexto."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, i) => {
            const meta = m.availability ? AVAILABILITY_META[m.availability] : null;
            const birthday = formatBirthday(m.birthdate);
            const isJugador = m.baseRole === "jugador";
            return (
              <button
                type="button"
                key={m.userId}
                onClick={() => onCardClick(m)}
                className="animate-card-in glass flex items-center gap-3 p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={m.avatarUrl ?? undefined} />
                  <AvatarFallback>{(m.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isJugador && m.jerseyNumber != null ? (
                      <span className="font-display text-lg font-bold text-primary">#{m.jerseyNumber}</span>
                    ) : null}
                    <span className="truncate font-display font-semibold text-foreground">
                      {m.fullName ?? "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {m.teamName ?? "Todo el club"}
                    {isJugador
                      ? m.position ? ` · ${m.position}` : ""
                      : m.jobTitle ? ` · ${m.jobTitle}` : m.roleName ? ` · ${m.roleName}` : ""}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {birthday ? <span>🎂 {birthday}</span> : null}
                    {isJugador && meta ? (
                      <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {clubId && editableTeams.length > 0 ? (
        <PlayerFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          clubId={clubId}
          teamId={(teamFilter && editableTeams.some((t) => t.id === teamFilter)
            ? teamFilter
            : editableTeams[0].id) ?? ""}
          teams={editableTeams}
        />
      ) : null}
    </div>
  );
}

