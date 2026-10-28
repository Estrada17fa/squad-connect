import { createFileRoute } from "@tanstack/react-router";
import { PlantelPage } from "@/components/pages/PlantelPage";

export const Route = createFileRoute("/_authenticated/coordinacion/tecnica/plantel")({
  head: () => ({
    meta: [
      { title: "Squad — Plantel" },
      { name: "description", content: "Consulta el plantel y el cuerpo técnico de cada categoría." },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  return <PlantelPage />;
}
