import { createFileRoute, Navigate } from "@tanstack/react-router";
import { DocumentosPage } from "@/components/pages/DocumentosPage";
import { useCoordModuleVisible } from "@/components/squad/CoordShell";

export const Route = createFileRoute("/_authenticated/m/documentos")({
  head: () => ({
    meta: [
      { title: "Squad — Documentos" },
      {
        name: "description",
        content: "Biblioteca de documentos del club: reglamentos, oficios, formatos y más.",
      },
      { property: "og:title", content: "Squad — Documentos" },
      {
        property: "og:description",
        content: "Consulta y administra los documentos generales del club por categoría.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  // Enlaces viejos: quien gestiona el módulo en Coordinación va ahí (con los mismos parámetros).
  const coordTo = useCoordModuleVisible("documentos");
  if (coordTo) return <Navigate to={coordTo} replace />;
  return <DocumentosPage />;
}
