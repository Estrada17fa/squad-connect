import * as React from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { deleteTrip } from "@/hooks/useTrips";
import { supabase } from "@/integrations/supabase/client";
import { TRIP_DOCS_BUCKET } from "@/lib/tripLogistics";
import { departureLabel, isTripSection, TRIP_SECTIONS, type TripSection } from "@/lib/viajes";
import { ScrollTabs, TripMatchup, tripDates } from "@/components/coord/viajes/parts";
import { useClubTrips, useTripLogistics, useTripsAccess } from "@/components/coord/viajes/useTripsModule";
import { ComidasTab, DocumentosTab, EquipajeTab, HotelTab, MatchLink, ResumenTab, TransporteTab, ViajerosTab, VuelosTab } from "@/components/coord/viajes/TripDetailTabs";

export const Route = createFileRoute("/_authenticated/coordinacion/general/viajes/$tripId")({
  validateSearch: (s: Record<string, unknown>): { tab?: TripSection } => (isTripSection(s.tab) ? { tab: s.tab } : {}),
  head: () => ({
    meta: [
      { title: "Viaje — Coordinación Squad" },
      { name: "description", content: "Itinerario, viajeros, vuelos, pases, hotel y transporte del viaje." },
      { property: "og:title", content: "Viaje — Coordinación Squad" },
      { property: "og:description", content: "Toda la logística del viaje del equipo en un solo lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ViajeDetailPage,
});

function ViajeDetailPage() {
  const { tripId } = Route.useParams();
  const { tab = "resumen" } = Route.useSearch();
  const navigate = useNavigate();
  const { user, teamOptions } = useApp();
  const { canManage, canEditTeam } = useTripsAccess();
  const { trips, tripsQ, matchFor } = useClubTrips(canManage);
  const trip = trips.find((t) => t.id === tripId) ?? null;
  const lg = useTripLogistics(trip);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (!canManage) return <Navigate to="/agenda-viajes" search={{ open: tripId }} replace />;
  if (tripsQ.isLoading) return <div className="mx-auto max-w-2xl space-y-3"><div className="h-40 animate-pulse rounded-2xl bg-card" /><div className="h-64 animate-pulse rounded-2xl bg-card" /></div>;
  if (!trip) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">Este viaje no existe o no tienes acceso.</p>
        <Link to="/coordinacion/general/viajes" className="text-sm font-semibold text-primary">Volver a Viajes</Link>
      </div>
    );
  }

  const match = matchFor(trip);
  const editable = canEditTeam(trip.team_id);
  const team = teamOptions.find((t) => t.id === trip.team_id)?.name;
  const go = (s: TripSection) => navigate({ to: "/coordinacion/general/viajes/$tripId", params: { tripId }, search: s === "resumen" ? {} : { tab: s }, replace: true });
  const props = { trip, match, lg, editable, userId: user.id, go };

  const remove = async () => {
    setDeleting(true);
    try {
      // Los pases viven en almacenamiento: se borran antes que el viaje.
      const paths = lg.flights.flatMap((f) => f.boarding_passes.map((bp) => bp.file_path)).filter(Boolean);
      if (paths.length) await supabase.storage.from(TRIP_DOCS_BUCKET).remove(paths);
      await deleteTrip(trip.id);
      toast.success("Viaje eliminado");
      navigate({ to: "/coordinacion/general/viajes", replace: true });
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar");
      setDeleting(false);
    }
  };

  return (
    <div className="coord-enter mx-auto max-w-2xl space-y-4 pb-24">
      <header className="flex items-center justify-between">
        <Link to="/coordinacion/general/viajes" className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
          <ChevronLeft className="h-5 w-5" /> Viajes
        </Link>
        {editable ? (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Más acciones" className="coord-press flex h-10 w-10 items-center justify-center rounded-xl"><MoreHorizontal className="h-5 w-5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigate({ to: "/coordinacion/general/viajes/$tripId/editar", params: { tripId } })}>Editar viaje</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmDelete(true)}>Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <section className="space-y-2 text-center">
        <TripMatchup trip={trip} match={match} />
        <h1 className="text-xl font-bold leading-tight">{trip.title}</h1>
        <p className="text-sm text-muted-foreground">{tripDates(trip)}{team ? ` · ${team}` : ""}</p>
        <div className="flex justify-center"><span className="rounded-full bg-area-general-soft px-3 py-1 text-xs font-semibold text-area-general">{departureLabel(trip.departure_at, trip.return_at)}</span></div>
        <MatchLink trip={trip} match={match} />
      </section>

      <ScrollTabs items={TRIP_SECTIONS} active={tab} onChange={go} />

      <div key={tab} className="coord-enter">
        {tab === "resumen" ? <ResumenTab {...props} /> : null}
        {tab === "viajeros" ? <ViajerosTab {...props} /> : null}
        {tab === "vuelos" ? <VuelosTab {...props} /> : null}
        {tab === "hotel" ? <HotelTab {...props} /> : null}
        {tab === "transporte" ? <TransporteTab {...props} /> : null}
        {tab === "comidas" ? <ComidasTab {...props} /> : null}
        {tab === "equipaje" ? <EquipajeTab {...props} /> : null}
        {tab === "documentos" ? <DocumentosTab {...props} /> : null}
      </div>

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Eliminar viaje" description="Se borran el viaje, su logística y los pases cargados. No se puede deshacer." loading={deleting} onConfirm={remove} />
    </div>
  );
}
