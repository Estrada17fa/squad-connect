import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { TripFormDialog } from "@/components/viajes/TripFormDialog";
import { useClubTrips, useTripsAccess } from "@/components/coord/viajes/useTripsModule";

export const Route = createFileRoute("/_authenticated/coordinacion/general/viajes/$tripId_/editar")({
  head: () => ({
    meta: [
      { title: "Editar viaje — Coordinación Squad" },
      { name: "description", content: "Edita fechas, destino, punto de reunión y viajeros del viaje." },
      { property: "og:title", content: "Editar viaje — Coordinación Squad" },
      { property: "og:description", content: "Edita los datos del viaje del equipo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditarViajePage,
});

function EditarViajePage() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const { profile, user } = useApp();
  const { canManage, canEditTeam, editableTeams } = useTripsAccess();
  const { trips, tripsQ } = useClubTrips(canManage);
  const trip = trips.find((t) => t.id === tripId) ?? null;
  const back = () => navigate({ to: "/coordinacion/general/viajes/$tripId", params: { tripId } });
  if (tripsQ.isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  if (!trip || !profile?.club_id || !canEditTeam(trip.team_id)) return <Navigate to="/coordinacion/general/viajes/$tripId" params={{ tripId }} replace />;
  return (
    <div className="space-y-2">
      <Link to="/coordinacion/general/viajes/$tripId" params={{ tripId }} className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
        <ChevronLeft className="h-5 w-5" /> Viaje
      </Link>
      <TripFormDialog variant="page" open onOpenChange={(v) => !v && back()} clubId={profile.club_id} teams={editableTeams} userId={user.id} trip={trip} />
    </div>
  );
}
