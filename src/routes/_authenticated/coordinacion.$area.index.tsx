import * as React from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { COORD_AREAS, getArea, LAST_AREA_KEY } from "@/lib/coordAreas";
import { AREA_HERO, areaHasUrgent, MODULE_MOCK, MOCK_CATEGORY, QUICK_ACTIONS } from "@/lib/coordMockData";
import { AreaSwitcher } from "@/components/coord/AreaSwitcher";
import { CoordHeader } from "@/components/coord/CoordHeader";
import { HeroCard } from "@/components/coord/HeroCard";
import { PendingList, SectionTitle } from "@/components/coord/PendingList";
import { ModuleTile } from "@/components/coord/ModuleTile";
import { useAreaPending } from "@/components/coord/tareas/useGeneralPending";
import { useNextTrip, useTripsAccess } from "@/components/coord/viajes/useTripsModule";
import { TripHeroCard } from "@/components/coord/viajes/parts";
import { gapCount, inDaysShort } from "@/lib/viajes";
import { Plane } from "lucide-react";
import type { MockPending } from "@/lib/coordMockData";

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
  const pending = useAreaPending(area?.key ?? "general");
  const { canManage: canTrips } = useTripsAccess();
  const isGeneral = area?.key === "general";
  const trip = useNextTrip(isGeneral && canTrips);
  const tripGaps = gapCount(trip.readiness);
  const pendingItems = React.useMemo(() => {
    if (!isGeneral) return pending.items;
    const rest = pending.items.filter((p) => !p.text.startsWith("Viaje"));
    if (!trip.next || !canTrips || tripGaps === 0) return rest;
    const row: MockPending = {
      icon: Plane, text: `Viaje ${trip.next.destination || trip.next.title}`,
      context: `${trip.readiness.gaps[0]?.label ?? ""} · ${inDaysShort(trip.next.departure_at)}`,
      value: String(tripGaps), urgency: inDaysShort(trip.next.departure_at) === "Hoy" || inDaysShort(trip.next.departure_at) === "Mañana" ? "red" : "amber", moduleKey: "viajes",
    };
    return [...rest.slice(0, 1), row, ...rest.slice(1)];
  }, [isGeneral, pending.items, trip.next, trip.readiness, tripGaps, canTrips]);

  React.useEffect(() => {
    if (area) window.localStorage.setItem(LAST_AREA_KEY, area.key);
  }, [area]);

  if (!area) return <Navigate to="/coordinacion/$area" params={{ area: "general" }} replace />;

  return (
    <div className="mx-auto -mt-2 max-w-4xl space-y-2">
      <CoordHeader area={area} category={MOCK_CATEGORY} actions={QUICK_ACTIONS[area.key]} />

      <AreaSwitcher
        items={COORD_AREAS.map((a) => ({ key: a.key, label: a.name, icon: a.icon, dot: a.key !== area.key && areaHasUrgent(a.key) }))}
        active={area.key}
        onChange={(k) => navigate({ to: "/coordinacion/$area", params: { area: k } })}
        indicatorClass={area.bg}
        activeTextClass={area.text}
      />

      <div key={area.key} className="coord-enter space-y-4 pt-2">
        <div className="grid gap-3 md:grid-cols-2 md:items-start md:gap-6">
          {isGeneral ? (
            trip.next ? (
              <TripHeroCard trip={trip.next} match={trip.match} readiness={trip.readiness} />
            ) : (
              <div className={`rounded-2xl p-3.5 ${area.bgSoft}`}>
                <div className={`text-[11px] font-bold tracking-wider ${area.text}`}>PRÓXIMO VIAJE</div>
                <div className="mt-1 text-lg font-bold leading-snug">{trip.loading && canTrips ? "Cargando…" : "Sin viajes próximos"}</div>
              </div>
            )
          ) : (
            <HeroCard area={area} hero={AREA_HERO[area.key]} />
          )}
          <PendingList area={area} items={pendingItems} />
        </div>
        <section>
          <SectionTitle>Módulos</SectionTitle>
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 md:grid-cols-6">
            {area.modules.map((m) => (
              <ModuleTile key={m.key} area={area} module={m} badge={m.key === "tareas" && isGeneral ? pending.tasksBadge : m.key === "viajes" && isGeneral ? tripGaps || undefined : MODULE_MOCK[m.key]?.badge} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
