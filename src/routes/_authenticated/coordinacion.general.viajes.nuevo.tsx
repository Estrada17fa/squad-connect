import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { TripWizard } from "@/components/coord/viajes/TripWizard";
import { useTripsAccess } from "@/components/coord/viajes/useTripsModule";

export const Route = createFileRoute("/_authenticated/coordinacion/general/viajes/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo viaje — Coordinación Squad" },
      { name: "description", content: "Crea un viaje: partido, fechas, punto de reunión y viajeros." },
      { property: "og:title", content: "Nuevo viaje — Coordinación Squad" },
      { property: "og:description", content: "Crea un viaje del equipo desde un partido o a mano." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NuevoViajePage,
});

function NuevoViajePage() {
  const { profile, user } = useApp();
  const { canCreate, editableTeams } = useTripsAccess();
  const clubId = profile?.club_id ?? null;
  if (!canCreate || !clubId) return <Navigate to="/coordinacion/general/viajes" replace />;
  return (
    <div className="space-y-2">
      <Link to="/coordinacion/general/viajes" className="coord-press -ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold">
        <ChevronLeft className="h-5 w-5" /> Viajes
      </Link>
      <TripWizard clubId={clubId} userId={user.id} teams={editableTeams} />
    </div>
  );
}
