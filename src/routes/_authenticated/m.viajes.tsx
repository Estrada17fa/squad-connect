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
import { formatDateTime } from "@/lib/calendar-utils";
import {
  useTrips,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_VARIANT,
  type TripRow,
} from "@/hooks/useTrips";
import { TripFormDialog } from "@/components/viajes/TripFormDialog";
import { TripDetailSheet } from "@/components/viajes/TripDetailSheet";

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
  const { permissions, isSuperAdmin, accessibleModules, profile, user, activeTeam } = useApp();
  const clubId = profile?.club_id ?? null;
  const teamId = activeTeam?.teamId ?? null;
  const canAccess = isSuperAdmin || accessibleModules.includes("viajes");
  const level = permissions.viajes;
  const canEdit = isSuperAdmin || level === "editor" || level === "approver";

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TripRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [pickerSignal, setPickerSignal] = React.useState(0);

  const tripsQ = useTrips(canAccess ? clubId : null, canAccess ? teamId : null);
  const trips = tripsQ.data ?? [];
  const detail = trips.find((t) => t.id === detailId) ?? null;

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
    if (!trips.some((t) => t.id === openParam)) return;
    setDetailId(openParam);
    navigate({ to: "/m/viajes", search: () => ({ open: undefined }), replace: true });
  }, [openParam, trips, navigate]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Viajes" subtitle="Logística de traslados y hospedajes" />
        <ModuleTabs activeKey="viajes" />
        <EmptyState icon={Plane} title="Sin acceso" message="Tu rol actual no tiene permisos para este módulo." />
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Viajes" subtitle="Logística de traslados y hospedajes" />
        <ModuleTabs activeKey="viajes" />
        <EmptyState
          icon={Plane}
          title="Selecciona un equipo"
          message="Los viajes pertenecen a un equipo. Elige una categoría en el encabezado para verlos."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Viajes" subtitle={`Viajes de ${activeTeam?.name ?? "tu equipo"}`} />
      <ModuleTabs activeKey="viajes" />

      {canEdit ? (
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
          message="Aún no hay viajes planeados para este equipo."
        />
      ) : (
        <>
          <TripSection title={`Próximos (${upcoming.length})`} trips={upcoming} onOpen={setDetailId} />
          <TripSection title={`Pasados (${past.length})`} trips={past} onOpen={setDetailId} />
        </>
      )}

      {clubId && teamId ? (
        <TripFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          clubId={clubId}
          teamId={teamId}
          userId={user.id}
          trip={editing}
        />
      ) : null}

      <TripDetailSheet
        open={!!detail}
        onOpenChange={(v) => !v && setDetailId(null)}
        trip={detail}
        canEdit={canEdit}
        openPickerSignal={pickerSignal}
        onEdit={(t) => {
          setDetailId(null);
          setEditing(t);
          setFormOpen(true);
        }}
      />

      {/* FAB: crea viaje en la lista, agrega viajero en el detalle */}
      {canEdit ? (
        <button
          type="button"
          aria-label={detail ? "Agregar viajero" : "Crear viaje"}
          onClick={() => {
            if (detail) setPickerSignal((n) => n + 1);
            else {
              setEditing(null);
              setFormOpen(true);
            }
          }}
          className="glow-primary fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}

function TripSection({
  title,
  trips,
  onOpen,
}: {
  title: string;
  trips: TripRow[];
  onOpen: (id: string) => void;
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
              subtitle={`${formatDateTime(t.departure_at)}${t.return_at ? ` → ${formatDateTime(t.return_at)}` : ""}`}
              status={{ label: TRIP_STATUS_LABEL[t.status], variant: TRIP_STATUS_VARIANT[t.status] }}
            >
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
