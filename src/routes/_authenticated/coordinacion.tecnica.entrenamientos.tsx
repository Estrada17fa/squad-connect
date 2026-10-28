import { createFileRoute } from "@tanstack/react-router";
import { EntrenamientosPage } from "@/components/pages/EntrenamientosPage";

export const Route = createFileRoute("/_authenticated/coordinacion/tecnica/entrenamientos")({
  head: () => ({
    meta: [
      { title: "Squad — Entrenamientos" },
      {
        name: "description",
        content: "Sesiones colectivas del equipo y biblioteca de ejercicios reutilizables.",
      },
      { property: "og:title", content: "Squad — Entrenamientos" },
      {
        property: "og:description",
        content: "Planea sesiones por fases y consulta qué se va a entrenar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  return <EntrenamientosPage />;
}
