import { createFileRoute } from "@tanstack/react-router";
import { MultimediaGestionPage } from "@/components/pages/MultimediaGestionPage";

export const Route = createFileRoute("/_authenticated/coordinacion/general/multimedia_gestion")({
  head: () => ({
    meta: [
      { title: "Squad — Gestión de Multimedia" },
      {
        name: "description",
        content: "Sube y administra las fotos y videos del club por categoría.",
      },
      { property: "og:title", content: "Squad — Gestión de Multimedia" },
      {
        property: "og:description",
        content: "Publicaciones de fotos y videos: subir, editar, eliminar y dirigir por categoría.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  return <MultimediaGestionPage />;
}
