import * as React from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { COORD_AREAS, getArea, LAST_AREA_KEY } from "@/lib/coordAreas";
import { AREA_SUMMARY, MODULE_MOCK, MOCK_CATEGORY, QUICK_ACTIONS } from "@/lib/coordMockData";
import { AreaSwitcher } from "@/components/coord/AreaSwitcher";
import { AreaSummary } from "@/components/coord/StatChip";
import { QuickActions } from "@/components/coord/QuickActions";
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
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Coordinación</h1>
        <button
          onClick={() => toast("Próximamente")}
          className="coord-press coord-card inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-semibold"
        >
          {MOCK_CATEGORY} <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <AreaSwitcher
        items={COORD_AREAS.map((a) => ({ key: a.key, label: a.name, icon: a.icon }))}
        active={area.key}
        onChange={(k) => navigate({ to: "/coordinacion/$area", params: { area: k } })}
        indicatorClass={area.bg}
        activeTextClass={area.text}
      />

      <div key={area.key} className="coord-enter space-y-5">
        <AreaSummary stats={AREA_SUMMARY[area.key]} area={area} />
        <QuickActions actions={QUICK_ACTIONS[area.key]} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {area.modules.map((m) => (
            <ModuleTile
              key={m.key}
              area={area}
              module={m}
              hint={MODULE_MOCK[m.key]?.hint}
              badge={MODULE_MOCK[m.key]?.badge}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
