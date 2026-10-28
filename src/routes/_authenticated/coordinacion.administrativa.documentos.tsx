import { createFileRoute } from "@tanstack/react-router";
import { DocumentosPage } from "@/components/pages/DocumentosPage";

export const Route = createFileRoute("/_authenticated/coordinacion/administrativa/documentos")({
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
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  return <DocumentosPage />;
}
