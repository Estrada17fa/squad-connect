import { createFileRoute } from "@tanstack/react-router";
import { NutricionPage } from "@/components/pages/NutricionPage";

export const Route = createFileRoute("/_authenticated/coordinacion/medica/nutricion")({
  head: () => ({
    meta: [
      { title: "Squad — Nutrición" },
      {
        name: "description",
        content: "Menús semanales por jugador y estudios antropométricos ISAK del club.",
      },
      { property: "og:title", content: "Squad — Nutrición" },
      {
        property: "og:description",
        content: "Plan de alimentación individual, porciones por comida y evolución antropométrica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  return <NutricionPage />;
}
