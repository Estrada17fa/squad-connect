import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getArea, LAST_AREA_KEY } from "@/lib/coordAreas";

export const Route = createFileRoute("/_authenticated/coordinacion/")({
  head: () => ({
    meta: [
      { title: "Coordinación — Squad" },
      { name: "description", content: "Coordinación del club por áreas: general, técnica y médica." },
      { property: "og:title", content: "Coordinación — Squad" },
      { property: "og:description", content: "Coordinación del club por áreas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoordRedirect,
});

function CoordRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const last = window.localStorage.getItem(LAST_AREA_KEY) ?? "";
    const area = getArea(last)?.key ?? "general";
    navigate({ to: "/coordinacion/$area", params: { area }, replace: true });
  }, [navigate]);
  return null;
}
