import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ViajesPage } from "@/components/pages/ViajesPage";
import { openSearch } from "@/lib/searchSchemas";

export const Route = createFileRoute("/_authenticated/coordinacion/operacional/viajes")({
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
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <ViajesPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
