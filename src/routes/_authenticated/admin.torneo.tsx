import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Shield, Trophy } from "lucide-react";

import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/components/squad/AppLayout";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useTournaments, type TournamentRow } from "@/hooks/useTournaments";
import {
  TOURNAMENT_STATUS_LABEL,
  TOURNAMENT_TYPE_LABEL,
  pointsSummary,
} from "@/lib/torneo";
import { TournamentFormDialog } from "@/components/admin/TournamentFormDialog";
import { TournamentDetailSheet } from "@/components/admin/TournamentDetailSheet";

const ALL = "__all__";

export const Route = createFileRoute("/_authenticated/admin/torneo")({
  head: () => ({
    meta: [
      { title: "Squad — Gestión de torneos" },
      {
        name: "description",
        content:
          "Alta de torneos por categoría, equipos participantes y sistema de puntos configurable.",
      },
      { property: "og:title", content: "Squad — Gestión de torneos" },
      {
        property: "og:description",
        content: "Torneos, equipos participantes y reglas de puntuación del club.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminTorneoPage,
});

function AdminTorneoPage() {
  const { profile, user, isSuperAdmin, accessibleModules } = useApp();
  const clubId = profile?.club_id ?? null;
  const userId = user?.id ?? "";
  const canAccess = isSuperAdmin || accessibleModules.includes("torneo");
  const editableTeams = useEditableTeams("torneo");
  const canEdit = editableTeams.length > 0;

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>(ALL);
  const [teamFilter, setTeamFilter] = React.useState<string>(ALL);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TournamentRow | null>(null);
  const [detail, setDetail] = React.useState<TournamentRow | null>(null);

  const listQ = useTournaments(canAccess ? clubId : null);

  // Mantiene la ficha sincronizada con los datos frescos.
  const detailRow = React.useMemo(
    () => (detail ? (listQ.data ?? []).find((t) => t.id === detail.id) ?? detail : null),
    [detail, listQ.data],
  );

  const q = search.trim().toLowerCase();
  const rows = React.useMemo(() => {
    return (listQ.data ?? []).filter((t) => {
      if (statusFilter !== ALL && t.status !== statusFilter) return false;
      if (teamFilter !== ALL && t.team_id !== teamFilter) return false;
      if (q && !`${t.name} ${t.season ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [listQ.data, statusFilter, teamFilter, q]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs hubKey="admin" extraActiveKey="admin-torneo" />
        <EmptyState
          icon={Shield}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para gestionar torneos."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs hubKey="admin" extraActiveKey="admin-torneo" />

      <PageHeader
        title="Torneos"
        subtitle="Competencias por categoría, equipos participantes y sistema de puntos."
        action={
          canEdit ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nuevo torneo
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar torneo"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            <SelectItem value="en_curso">En curso</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {editableTeams
              .flatMap((t) => (t.id ? [t] : []))
              .map((t) => (
                <SelectItem key={t.id} value={t.id as string}>
                  {t.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {listQ.isLoading ? (
        <CardGridSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sin torneos"
          message={
            canEdit
              ? "Crea el primer torneo de una categoría para empezar a capturar la competencia."
              : "Todavía no hay torneos registrados."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDetail(t)}
              className="glass rounded-2xl p-4 text-left ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <TournamentLogo path={t.logo_path} name={t.name} className="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[TOURNAMENT_TYPE_LABEL[t.type], t.season, t.team_name]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <StatusBadge variant={t.status === "en_curso" ? "approved" : "neutral"}>
                  {TOURNAMENT_STATUS_LABEL[t.status]}
                </StatusBadge>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">{pointsSummary(t)[0]}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.teams_count} {t.teams_count === 1 ? "equipo" : "equipos"}
              </p>
            </button>
          ))}
        </div>
      )}

      {clubId ? (
        <>
          <TournamentFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            clubId={clubId}
            userId={userId}
            teams={editableTeams}
            tournament={editing}
          />
          <TournamentDetailSheet
            open={!!detailRow}
            onOpenChange={(v) => {
              if (!v) setDetail(null);
            }}
            tournament={detailRow}
            canEdit={canEdit}
            clubId={clubId}
            userId={userId}
            onEdit={() => {
              setEditing(detailRow);
              setDetail(null);
              setFormOpen(true);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
