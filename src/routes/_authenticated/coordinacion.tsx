import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { CoordHeader, InCoordContext, useCoordAreas } from "@/components/squad/CoordShell";
import type { ModuleKey } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/coordinacion")({
  head: () => ({
    meta: [
      { title: "Squad — Coordinación" },
      { name: "description", content: "La oficina del club: áreas Técnica, Médica, Operacional, Administrativa y General." },
      { property: "og:title", content: "Squad — Coordinación" },
      { property: "og:description", content: "Captura y gestión del club organizada en 5 áreas." },
    ],
  }),
  component: CoordinacionLayout,
});

function CoordinacionLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const areas = useCoordAreas();
  const [, , areaKey, moduleKey] = pathname.replace(/\/+$/, "").split("/");

  if (areas.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Coordinación" />
        <EmptyState
          icon={MessagesSquare}
          title="Sin acceso a Coordinación"
          message="Tus permisos actuales no incluyen módulos de gestión."
        />
      </div>
    );
  }

  const active = areas.find((a) => a.area.key === areaKey);
  // Área inválida o sin acceso → primera opción válida.
  if (!active) return <Navigate to={areas[0].modules[0].to} replace />;
  // /coordinacion/$area → primer módulo con acceso.
  if (!moduleKey) return <Navigate to={active.modules[0].to} replace />;
  // Módulo sin acceso → primera opción válida del área.
  if (!active.modules.some((m) => m.key === moduleKey)) {
    return <Navigate to={active.modules[0].to} replace />;
  }

  return (
    <div className="space-y-4">
      <CoordHeader areas={areas} active={active} activeModule={moduleKey as ModuleKey} />
      <InCoordContext.Provider value={true}>
        <Outlet />
      </InCoordContext.Provider>
    </div>
  );
}
