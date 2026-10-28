import { createFileRoute } from "@tanstack/react-router";
import { ComunicadosPage } from "@/components/pages/ComunicadosPage";

export const Route = createFileRoute("/_authenticated/m/comunicados")({
  head: () => ({
    meta: [
      { title: "Squad — Comunicados" },
      {
        name: "description",
        content: "Tablón de avisos oficiales del club por categoría, con confirmación de lectura.",
      },
      { property: "og:title", content: "Squad — Comunicados" },
      {
        property: "og:description",
        content: "Avisos del club y de tu categoría, con prioridad y confirmación de lectura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  return <ComunicadosPage />;
}
