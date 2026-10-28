import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SolicitudesPage } from "@/components/pages/SolicitudesPage";
import { openSearch } from "@/lib/searchSchemas";

export const Route = createFileRoute("/_authenticated/coordinacion/general/solicitudes")({
  validateSearch: openSearch,
  head: () => ({
    meta: [
      { title: "Squad — Solicitudes" },
      { name: "description", content: "Peticiones del club y su flujo de aprobación." },
      { property: "og:title", content: "Squad — Solicitudes" },
      { property: "og:description", content: "Peticiones del club y su flujo de aprobación." },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <SolicitudesPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
