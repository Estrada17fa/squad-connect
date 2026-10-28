import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { SolicitudesPage } from "@/components/pages/SolicitudesPage";
import { openSearch } from "@/lib/searchSchemas";
import { useCoordModuleVisible } from "@/components/squad/CoordShell";

export const Route = createFileRoute("/_authenticated/m/solicitudes")({
  validateSearch: openSearch,
  head: () => ({
    meta: [
      { title: "Squad — Solicitudes" },
      { name: "description", content: "Peticiones del club y su flujo de aprobación." },
      { property: "og:title", content: "Squad — Solicitudes" },
      { property: "og:description", content: "Peticiones del club y su flujo de aprobación." },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Enlaces viejos: quien gestiona el módulo en Coordinación va ahí (con los mismos parámetros).
  const coordTo = useCoordModuleVisible("solicitudes");
  if (coordTo) return <Navigate to={coordTo} search={search} replace />;
  return <SolicitudesPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
