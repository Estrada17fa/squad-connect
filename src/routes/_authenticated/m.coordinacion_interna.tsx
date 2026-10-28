import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { CoordinacionPage } from "@/components/pages/CoordinacionPage";
import { coordInternaSearch } from "@/lib/searchSchemas";
import { useCoordModuleVisible } from "@/components/squad/CoordShell";

export const Route = createFileRoute("/_authenticated/m/coordinacion_interna")({
  validateSearch: coordInternaSearch,
  head: () => ({
    meta: [
      { title: "Squad — Coordinación" },
      { name: "description", content: "Tareas y juntas del staff a nivel club." },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Enlaces viejos: quien gestiona el módulo en Coordinación va ahí (con los mismos parámetros).
  const coordTo = useCoordModuleVisible("coordinacion_interna");
  if (coordTo) return <Navigate to={coordTo} search={search} replace />;
  return <CoordinacionPage search={search} onClearSearch={() => navigate({ search: { open: undefined, kind: undefined }, replace: true })} />;
}
