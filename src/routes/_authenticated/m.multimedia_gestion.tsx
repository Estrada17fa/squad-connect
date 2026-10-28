import { createFileRoute, Navigate } from "@tanstack/react-router";
import { MultimediaGestionPage } from "@/components/pages/MultimediaGestionPage";
import { useCoordModuleVisible } from "@/components/squad/CoordShell";

export const Route = createFileRoute("/_authenticated/m/multimedia_gestion")({
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
  component: ModuleRoute,
});

function ModuleRoute() {
  // Enlaces viejos: quien gestiona el módulo en Coordinación va ahí (con los mismos parámetros).
  const coordTo = useCoordModuleVisible("multimedia_gestion");
  if (coordTo) return <Navigate to={coordTo} replace />;
  return <MultimediaGestionPage />;
}
