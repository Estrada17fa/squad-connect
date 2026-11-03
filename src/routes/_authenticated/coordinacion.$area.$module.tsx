import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getArea } from "@/lib/coordAreas";
import { MODULE_MOCK } from "@/lib/coordMockData";
import { ModulePageShell } from "@/components/coord/ModulePageShell";
import { CoordEmptyState } from "@/components/coord/EmptyState";

export const Route = createFileRoute("/_authenticated/coordinacion/$area/$module")({
  head: ({ params }) => {
    const mod = getArea(params.area)?.modules.find((m) => m.key === params.module);
    const title = `${mod?.name ?? "Módulo"} — Coordinación Squad`;
    return {
      meta: [
        { title },
        { name: "description", content: `${mod?.name ?? "Módulo"} en Coordinación.` },
        { property: "og:title", content: title },
        { property: "og:description", content: `${mod?.name ?? "Módulo"} en Coordinación.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ModulePage,
});

function ModulePage() {
  const params = Route.useParams();
  const area = getArea(params.area);
  if (!area) return <Navigate to="/coordinacion/$area" params={{ area: "general" }} replace />;
  const mod = area.modules.find((m) => m.key === params.module && !m.comingSoon);
  if (!mod) return <Navigate to="/coordinacion/$area" params={{ area: area.key }} replace />;
  const mock = MODULE_MOCK[mod.key];

  return (
    <ModulePageShell area={area} module={mod} stats={mock?.stats ?? []} tabs={mock?.tabs} action={mock?.action ?? "Agregar"}>
      <CoordEmptyState icon={mod.icon} text={mock?.empty ?? ""} action={mock?.action ?? "Agregar"} area={area} />
    </ModulePageShell>
  );
}
