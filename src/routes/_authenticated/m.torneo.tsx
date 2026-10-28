import { createFileRoute } from "@tanstack/react-router";
import { TorneoPage } from "@/components/pages/TorneoPage";

export const Route = createFileRoute("/_authenticated/m/torneo")({
  head: () => ({
    meta: [
      { title: "Squad — Torneo" },
      {
        name: "description",
        content: "Calendario, tabla de posiciones y goleo del torneo de tu categoría.",
      },
      { property: "og:title", content: "Squad — Torneo" },
      {
        property: "og:description",
        content: "Calendario, tabla de posiciones y goleo del torneo de tu categoría.",
      },
    ],
  }),
  component: ModuleRoute,
});

function ModuleRoute() {
  return <TorneoPage />;
}
