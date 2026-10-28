import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InventarioPage } from "@/components/pages/InventarioPage";
import { openSearch } from "@/lib/searchSchemas";

export const Route = createFileRoute("/_authenticated/coordinacion/operacional/inventario")({
  validateSearch: openSearch,
  head: () => ({
    meta: [
      { title: "Squad — Inventario" },
      { name: "description", content: "Catálogo de material deportivo y préstamos del club." },
      { property: "og:title", content: "Squad — Inventario" },
      { property: "og:description", content: "Material deportivo, disponibilidad y préstamos activos del club." },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <InventarioPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
