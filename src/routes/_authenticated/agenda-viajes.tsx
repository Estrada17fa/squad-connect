import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plane, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { useApp } from "@/components/squad/AppLayout";
import { formatDateOnly } from "@/lib/calendar-utils";
import { useTrips, TRIP_STATUS_LABEL, TRIP_STATUS_VARIANT } from "@/hooks/useTrips";
import { TripDetailSheet } from "@/components/viajes/TripDetailSheet";
import { MyTripView } from "@/components/viajes/MyTripView";
import { DetailSheet, DetailBadge } from "@/components/squad/DetailSheet";
import { useTeamAccess } from "@/hooks/useTeamAccess";

import { TeamFilter, TeamBadge } from "@/components/squad/TeamFilter";

export const Route = createFileRoute("/_authenticated/agenda-viajes")({
  head: () => ({
    meta: [
      { title: "Squad — Viajes en agenda" },
      { name: "description", content: "Consulta los viajes del club desde la agenda: itinerario y convocatoria." },
      { property: "og:title", content: "Squad — Viajes en agenda" },
      {
        property: "og:description",
        content: "Todos los viajes programados, con tu itinerario personal y el completo del equipo.",
      },
    ],
  }),
  component: AgendaViajesPage,
});

/** Pestaña "Viajes" dentro de Agenda: solo consulta (readOnly). */
function AgendaViajesPage() {
  const { user, profile, isSuperAdmin, canViewModule, teamOptions } = useApp();
  const { canEditTeam } = useTeamAccess("viajes");
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || canViewModule("viajes");

  const [teamFilter, setTeamFilter] = React.useState<string | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const teamNames = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teamOptions) if (t.id) m[t.id] = t.name;
    return m;
  }, [teamOptions]);

  const tripsQ = useTrips(canAccess ? clubId : null, teamFilter);
  const trips = tripsQ.data ?? [];
  const detail = trips.find((t) => t.id === detailId) ?? null;

  const nowIso = new Date().toISOString();
  const upcoming = trips
    .filter((t) => (t.return_at ?? t.departure_at) >= nowIso)
    .sort((a, b) => a.departure_at.localeCompare(b.departure_at));

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader hideTitle title="Viajes" subtitle="Consulta de viajes" />
        <ModuleTabs hubKey="agenda" extraActiveKey="agenda-viajes" />
        <EmptyState icon={Plane} title="Sin acceso" message="Tu rol actual no tiene permisos para ver viajes." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Viajes" subtitle="Consulta de viajes" />
      <ModuleTabs hubKey="agenda" extraActiveKey="agenda-viajes" />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />

      {tripsQ.isLoading ? (
        <CardGridSkeleton />
      ) : upcoming.length === 0 ? (
        <EmptyState icon={Plane} title="Sin viajes próximos" message="No hay viajes programados por ahora." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {upcoming.map((t) => (
            <StandardCard
              key={t.id}
              interactive
              onClick={() => setDetailId(t.id)}
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

      {/* Staff de viajes ve el viaje completo; el resto ve solo SU itinerario y SU pase. */}
      {detail && canEditTeam(detail.team_id) ? (
        <TripDetailSheet open onOpenChange={(v) => !v && setDetailId(null)} trip={detail} readOnly />
      ) : (
        <DetailSheet
          open={!!detail}
          onOpenChange={(v) => !v && setDetailId(null)}
          title={detail?.title ?? ""}
          icon={Plane}
          accent="var(--event-viaje)"
          description={
            detail
              ? `${formatDateOnly(detail.departure_at)}${detail.return_at ? ` → ${formatDateOnly(detail.return_at)}` : ""}`
              : undefined
          }
          badges={
            detail ? (
              <>
                <DetailBadge color="var(--event-viaje)" icon={Plane}>
                  {TRIP_STATUS_LABEL[detail.status]}
                </DetailBadge>
                {teamNames[detail.team_id] ? <DetailBadge>{teamNames[detail.team_id]}</DetailBadge> : null}
                {detail.destination ? <DetailBadge>{detail.destination}</DetailBadge> : null}
              </>
            ) : null
          }
        >
          {detail ? <MyTripView trip={detail} userId={user.id} /> : null}
        </DetailSheet>
      )}


    </div>
  );
}
