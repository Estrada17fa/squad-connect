import { createFileRoute } from "@tanstack/react-router";
import { PlantelPage } from "@/components/pages/PlantelPage";

export const Route = createFileRoute("/_authenticated/m/plantel")({
  head: () => ({
    meta: [
      { title: "Squad — Plantel" },
      { name: "description", content: "Consulta el plantel y el cuerpo técnico de cada categoría." },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  return <PlantelPage />;
}
