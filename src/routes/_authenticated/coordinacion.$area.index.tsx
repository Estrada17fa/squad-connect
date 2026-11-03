import * as React from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { COORD_AREAS, getArea, LAST_AREA_KEY } from "@/lib/coordAreas";
import { AREA_HERO, AREA_PENDING, MODULE_MOCK, MOCK_CATEGORY, QUICK_ACTIONS } from "@/lib/coordMockData";
import { AreaSwitcher } from "@/components/coord/AreaSwitcher";
import { CoordHeader } from "@/components/coord/CoordHeader";
import { HeroCard } from "@/components/coord/HeroCard";
import { PendingList, SectionTitle } from "@/components/coord/PendingList";
import { ModuleTile } from "@/components/coord/ModuleTile";

export const Route = createFileRoute("/_authenticated/coordinacion/$area/")({
  head: ({ params }) => {
    const name = getArea(params.area)?.name ?? "Coordinación";
    return {
      meta: [
        { title: `Coordinación ${name} — Squad` },
        { name: "description", content: `Módulos y resumen del área ${name}.` },
        { property: "og:title", content: `Coordinación ${name} — Squad` },
        { property: "og:description", content: `Módulos y resumen del área ${name}.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: AreaHome,
});

function AreaHome() {
  const { area: areaKey } = Route.useParams();
  const navigate = useNavigate();
  const area = getArea(areaKey);

  React.useEffect(() => {
    if (area) window.localStorage.setItem(LAST_AREA_KEY, area.key);
  }, [area]);

  if (!area) return <Navigate to="/coordinacion/$area" params={{ area: "general" }} replace />;

  return (
    <div className="mx-auto -mt-2 max-w-4xl space-y-2">
      <CoordHeader area={area} category={MOCK_CATEGORY} actions={QUICK_ACTIONS[area.key]} />

      <AreaSwitcher
        items={COORD_AREAS.map((a) => ({ key: a.key, label: a.name, icon: a.icon }))}
        active={area.key}
        onChange={(k) => navigate({ to: "/coordinacion/$area", params: { area: k } })}
        indicatorClass={area.bg}
        activeTextClass={area.text}
      />

      <div key={area.key} className="coord-enter space-y-4 pt-2">
        <div className="grid gap-3 md:grid-cols-2 md:items-start md:gap-6">
          <HeroCard area={area} hero={AREA_HERO[area.key]} />
          <PendingList area={area} items={AREA_PENDING[area.key]} />
        </div>
        <section>
          <SectionTitle>Módulos</SectionTitle>
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 md:grid-cols-6">
            {area.modules.map((m) => (
              <ModuleTile key={m.key} area={area} module={m} badge={MODULE_MOCK[m.key]?.badge} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
