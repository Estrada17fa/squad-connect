import { createFileRoute } from "@tanstack/react-router";
import { SaludPage } from "@/components/pages/SaludPage";

export const Route = createFileRoute("/_authenticated/m/salud")({
  head: () => ({
    meta: [
      { title: "Squad — Salud" },
      { name: "description", content: "Estado de salud, lesiones, revisiones y citas médicas del equipo." },
      { property: "og:title", content: "Squad — Salud" },
      {
        property: "og:description",
        content: "Expediente médico por jugador: estado, lesiones, tratamiento y citas.",
      },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  return <SaludPage />;
}
