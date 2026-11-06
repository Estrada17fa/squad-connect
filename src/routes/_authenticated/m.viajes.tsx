import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useTripsAccess } from "@/components/coord/viajes/useTripsModule";
import { tripLinkFor } from "@/lib/viajes";

/**
 * Dirección vieja de Viajes (y de sus avisos `?open=`). Quien gestiona viajes
 * va a Coordinación › General › Viajes; los demás, a Agenda › Viajes.
 */
export const Route = createFileRoute("/_authenticated/m/viajes")({
  validateSearch: (search: Record<string, unknown>): { open?: string } =>
    typeof search.open === "string" ? { open: search.open } : {},
  head: () => ({
    meta: [
      { title: "Squad — Viajes" },
      { name: "description", content: "Viajes del equipo: itinerario, vuelos, hotel y transporte." },
      { property: "og:title", content: "Squad — Viajes" },
      { property: "og:description", content: "Viajes del equipo: itinerario, vuelos, hotel y transporte." },
    ],
  }),
  component: ViajesRedirect,
});

function ViajesRedirect() {
  const { open } = Route.useSearch();
  const { canManage } = useTripsAccess();
  const link = tripLinkFor(canManage, open);
  if (link.kind === "coord") return <Navigate to="/coordinacion/general/viajes/$tripId" params={{ tripId: link.tripId }} replace />;
  if (link.kind === "coord-list") return <Navigate to="/coordinacion/general/viajes" replace />;
  return <Navigate to="/agenda-viajes" search={link.open ? { open: link.open } : {}} replace />;
}
