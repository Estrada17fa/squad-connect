import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { InventarioPage } from "@/components/pages/InventarioPage";
import { openSearch } from "@/lib/searchSchemas";
import { useCoordModuleVisible } from "@/components/squad/CoordShell";

export const Route = createFileRoute("/_authenticated/m/inventario")({
  validateSearch: openSearch,
  head: () => ({
    meta: [
      { title: "Squad — Inventario" },
      { name: "description", content: "Catálogo de material deportivo y préstamos del club." },
      { property: "og:title", content: "Squad — Inventario" },
      { property: "og:description", content: "Material deportivo, disponibilidad y préstamos activos del club." },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Enlaces viejos: quien gestiona el módulo en Coordinación va ahí (con los mismos parámetros).
  const coordTo = useCoordModuleVisible("inventario");
  if (coordTo) return <Navigate to={coordTo} search={search} replace />;
  return <InventarioPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
