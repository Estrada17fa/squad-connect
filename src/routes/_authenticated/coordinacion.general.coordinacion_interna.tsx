import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CoordinacionPage } from "@/components/pages/CoordinacionPage";
import { coordInternaSearch } from "@/lib/searchSchemas";

export const Route = createFileRoute("/_authenticated/coordinacion/general/coordinacion_interna")({
  validateSearch: coordInternaSearch,
  head: () => ({
    meta: [
      { title: "Squad — Coordinación" },
      { name: "description", content: "Tareas y juntas del staff a nivel club." },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <CoordinacionPage search={search} onClearSearch={() => navigate({ search: { open: undefined, kind: undefined }, replace: true })} />;
}
