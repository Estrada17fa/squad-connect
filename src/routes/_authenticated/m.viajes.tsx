import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { ViajesPage } from "@/components/pages/ViajesPage";
import { openSearch } from "@/lib/searchSchemas";
import { useCoordModuleVisible } from "@/components/squad/CoordShell";

export const Route = createFileRoute("/_authenticated/m/viajes")({
  validateSearch: openSearch,
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
  component: ModuleRoute,
});

function ModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Enlaces viejos: quien gestiona el módulo en Coordinación va ahí (con los mismos parámetros).
  const coordTo = useCoordModuleVisible("viajes");
  if (coordTo) return <Navigate to={coordTo} search={search} replace />;
  return <ViajesPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
