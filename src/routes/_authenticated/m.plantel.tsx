import * as React from "react";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { ViewToggle } from "@/components/squad/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/components/squad/AppLayout";
import { useRoster, type RosterMember } from "@/hooks/useRoster";
import type { AvailabilityStatus } from "@/hooks/usePlayers";
import { cn } from "@/lib/utils";
import type { BaseRole } from "@/lib/rolePages";

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
  const { activeTeam, user, profile } = useApp();

  const clubId = profile?.club_id ?? null;
  const { data: members, isLoading } = useRoster(clubId, activeTeam?.id ?? null);
  const initialRole = useRouterState({
    select: (s) => (s.location.search as { role?: string } | undefined)?.role,
  });
  const [roleFilter, setRoleFilter] = React.useState<Set<BaseRole>>(() => {
    const r = initialRole as BaseRole | undefined;
    return r ? new Set([r]) : new Set();
  });
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = useViewMode("plantel", "grid");

  const toggleRole = (r: BaseRole) => {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  };

  const filtered = (members ?? []).filter((m) => {
    if (roleFilter.size > 0 && (!m.baseRole || !roleFilter.has(m.baseRole as BaseRole))) return false;
    if (search && !(m.fullName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!activeTeam) {
    return <EmptyState title="Sin equipo activo" message="Selecciona un equipo desde el encabezado." />;
  }

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
        subtitle={activeTeam.name}
        action={<ViewToggle value={viewMode} onChange={setViewMode} />}
      />

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
        <CardGridSkeleton variant={viewMode === "list" ? "list" : "grid"} count={6} />
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
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50",
          )}
        >
          {filtered.map((m, i) => {
            const meta = m.availability ? AVAILABILITY_META[m.availability] : null;
            const birthday = formatBirthday(m.birthdate);
            const isJugador = m.baseRole === "jugador";
            const isList = viewMode === "list";
            return (
              <button
                type="button"
                key={m.userId}
                onClick={() => onCardClick(m)}
                className={cn(
                  "animate-card-in flex items-center gap-3 text-left transition-all",
                  isList
                    ? "bg-white/[0.02] p-3 hover:bg-white/[0.05] active:scale-[0.995]"
                    : "glass p-4 hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]",
                )}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <Avatar className={cn("shrink-0", isList ? "h-10 w-10" : "h-12 w-12")}>
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
                  {!isList ? (
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {birthday ? <span>🎂 {birthday}</span> : null}
                      {isJugador && meta ? (
                        <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {isList ? (
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {birthday ? <span className="hidden sm:inline">🎂 {birthday}</span> : null}
                    {isJugador && meta ? (
                      <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                    ) : null}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

