import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PartidosPage } from "@/components/pages/PartidosPage";
import { openSearch } from "@/lib/searchSchemas";

export const Route = createFileRoute("/_authenticated/coordinacion/tecnica/partidos")({
  validateSearch: openSearch,
  head: () => ({
    meta: [
      { title: "Squad — Partidos" },
      {
        name: "description",
        content: "Convocatoria, citación y logística de los partidos de nuestros equipos.",
      },
      { property: "og:title", content: "Squad — Partidos" },
      {
        property: "og:description",
        content: "Gestiona convocados, hora de citación, punto de reunión y notas de cada partido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <PartidosPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
