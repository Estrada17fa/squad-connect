import { createFileRoute } from "@tanstack/react-router";
import { DesarrolloPage } from "@/components/pages/DesarrolloPage";

export const Route = createFileRoute("/_authenticated/m/desarrollo")({
  head: () => ({
    meta: [
      { title: "Squad — Desarrollo" },
      {
        name: "description",
        content: "Seguimiento del progreso del jugador: evaluaciones, objetivos, rutinas y métricas.",
      },
      { property: "og:title", content: "Squad — Desarrollo" },
      {
        property: "og:description",
        content: "Evaluaciones por habilidades, objetivos, notas, rutinas y estadísticas del jugador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  return <DesarrolloPage />;
}
