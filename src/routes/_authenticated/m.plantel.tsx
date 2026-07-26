import * as React from "react";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/components/squad/AppLayout";
import { useRoster, type RosterMember } from "@/hooks/useRoster";
import type { AvailabilityStatus } from "@/hooks/usePlayers";
import { PlayerFormDialog } from "@/components/plantel/PlayerFormDialog";
import { supabase } from "@/integrations/supabase/client";
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

const ROLE_FILTERS: { value: BaseRole | "all"; label: string }[] = [
  { value: "all", label: "Todos los roles" },
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
  const { activeTeam, getModuleAccess, user, isSuperAdmin, profile } = useApp();
  const canEdit = isSuperAdmin || getModuleAccess("plantel") === "editor" || getModuleAccess("plantel") === "approver";

  const clubId = profile?.club_id ?? null;
  const { data: members, isLoading } = useRoster(clubId, activeTeam?.id ?? null);
  const initialRole = useRouterState({
    select: (s) => (s.location.search as { role?: string } | undefined)?.role,
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState<BaseRole | "all">(
    (initialRole as BaseRole | undefined) ?? "all",
  );
  const [search, setSearch] = React.useState("");

  const [playerClubId, setPlayerClubId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!activeTeam?.id) return;
    supabase.from("teams").select("club_id").eq("id", activeTeam.id).maybeSingle()
      .then(({ data }) => setPlayerClubId(data?.club_id ?? null));
  }, [activeTeam?.id]);

  const filtered = (members ?? []).filter((m) => {
    if (roleFilter !== "all" && m.baseRole !== roleFilter) return false;
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
      <PageHeader
        title="Plantel"
        subtitle={activeTeam.name}
        action={
          canEdit ? (
            <Button onClick={() => setDialogOpen(true)} className="glow-primary">
              <Plus className="mr-2 h-4 w-4" /> Agregar jugador
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Buscar miembro…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as BaseRole | "all")}>
          <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
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
                className={cn(
                  "glass animate-card-in flex items-center gap-3 p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]",
                )}
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
                  <div className="mt-0.5 text-xs text-muted-foreground">
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

      {playerClubId && activeTeam?.id ? (
        <PlayerFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clubId={playerClubId}
          teamId={activeTeam.id}
        />
      ) : null}
    </div>
  );
}
