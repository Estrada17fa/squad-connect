import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Plane, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { formatDateOnly } from "@/lib/calendar-utils";
import {
  useTrips,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_VARIANT,
  type TripRow,
} from "@/hooks/useTrips";
import { TripFormDialog } from "@/components/viajes/TripFormDialog";
import { TripDetailSheet } from "@/components/viajes/TripDetailSheet";
import { TeamFilter, TeamBadge } from "@/components/squad/TeamFilter";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { canManageTripsModule } from "@/lib/permissions";

import {
  TripFilters,
  applyTripFilters,
  EMPTY_TRIP_FILTERS,
  type TripFilterState,
} from "@/components/viajes/TripFilters";

export const Route = createFileRoute("/_authenticated/m/viajes")({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === "string" ? search.open : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Squad — Viajes" },
      { name: "description", content: "Planeación de viajes del equipo: citatorio, convocatoria y logística." },
      { property: "og:title", content: "Squad — Viajes" },
      {
        property: "og:description",
        content: "Organiza salidas, citatorios y convocatoria del equipo en un solo lugar.",
      },
    ],
  }),
  component: ViajesPage,
});

function ViajesPage() {
  const { isSuperAdmin, getModuleAccess, profile, user, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const editableTeams = useEditableTeams("viajes");
  const [teamFilter, setTeamFilter] = useTeamFilter();
  const [filters, setFilters] = React.useState<TripFilterState>(EMPTY_TRIP_FILTERS);
  const teamNameById = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teamOptions) if (t.id) m[t.id] = t.name;
    return m;
  }, [teamOptions]);
  // Gestión de viajes: nivel global o superior (la consulta personal vive en Agenda).
  const canAccess = isSuperAdmin || canManageTripsModule(getModuleAccess("viajes"));

  const { canEditTeam } = useTeamAccess("viajes");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TripRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const tripsQ = useTrips(canAccess ? clubId : null, teamFilter);
  const allTrips = tripsQ.data ?? [];
  const trips = applyTripFilters(allTrips, filters);
  const detail = allTrips.find((t) => t.id === detailId) ?? null;

  const nowIso = new Date().toISOString();
  const upcoming = trips
    .filter((t) => (t.return_at ?? t.departure_at) >= nowIso)
    .sort((a, b) => a.departure_at.localeCompare(b.departure_at));
  const past = trips.filter((t) => (t.return_at ?? t.departure_at) < nowIso);

  // Deep-link desde notificaciones: /m/viajes?open=<tripId>
  const { open: openParam } = Route.useSearch();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!openParam) return;
    if (!allTrips.some((t) => t.id === openParam)) return;
    setDetailId(openParam);
    navigate({ to: "/m/viajes", search: () => ({ open: undefined }), replace: true });
  }, [openParam, allTrips, navigate]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Viajes" subtitle="Logística de traslados y hospedajes" />
        <ModuleTabs activeKey="viajes" />
        <EmptyState icon={Plane} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Viajes" subtitle="Todos tus equipos" />
      <ModuleTabs activeKey="viajes" />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />
      <TripFilters value={filters} onChange={setFilters} count={trips.length} />

      {editableTeams.length > 0 ? (
        <Button
          className="w-full glow-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar viaje
        </Button>
      ) : null}

      {tripsQ.isLoading ? (
        <CardGridSkeleton />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="Sin viajes"
          message={
            allTrips.length === 0
              ? "Aún no hay viajes planeados para este equipo."
              : "Ningún viaje coincide con los filtros."
          }
        />
      ) : (
        <>
          <TripSection title={`Próximos (${upcoming.length})`} trips={upcoming} onOpen={setDetailId} teamNames={teamNameById} />
          <TripSection title={`Pasados (${past.length})`} trips={past} onOpen={setDetailId} teamNames={teamNameById} />
        </>
      )}

      {clubId ? (
        <TripFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          clubId={clubId}
          teams={editableTeams}
          defaultTeamId={editing?.team_id ?? teamFilter ?? null}
          userId={user.id}
          trip={editing}
          onCreated={(id) => setDetailId(id)}
        />
      ) : null}

      <TripDetailSheet
        open={!!detail}
        onOpenChange={(v) => !v && setDetailId(null)}
        trip={detail}
        canEdit={canEditTeam(detail?.team_id)}
        onEdit={(t) => {
          setDetailId(null);
          setEditing(t);
          setFormOpen(true);
        }}
      />

    </div>
  );
}

function TripSection({
  title,
  trips,
  onOpen,
  teamNames,
}: {
  title: string;
  trips: TripRow[];
  onOpen: (id: string) => void;
  teamNames: Record<string, string>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {trips.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada por aquí.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {trips.map((t) => (
            <StandardCard
              key={t.id}
              interactive
              onClick={() => onOpen(t.id)}
              icon={Plane}
              title={t.title}
              subtitle={`${formatDateOnly(t.departure_at)}${t.return_at ? ` → ${formatDateOnly(t.return_at)}` : ""}`}
              status={{ label: TRIP_STATUS_LABEL[t.status], variant: TRIP_STATUS_VARIANT[t.status] }}
            >
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <TeamBadge name={teamNames[t.team_id]} />
                {t.destination ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {t.destination}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {t.travelers.length} convocado
                  {t.travelers.length === 1 ? "" : "s"}
                </span>
              </span>
            </StandardCard>
          ))}
        </div>
      )}
    </section>
  );
}
