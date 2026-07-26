import { createFileRoute, Navigate } from "@tanstack/react-router";
import { MessagesSquare, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";

export const Route = createFileRoute("/_authenticated/coordinacion")({
  head: () => ({
    meta: [
      { title: "Squad — Coordinación" },
      { name: "description", content: "Tareas, juntas, solicitudes, inventario y viajes." },
    ],
  }),
  component: CoordinacionHub,
});

function CoordinacionHub() {
  const { visiblePages, activeBaseRole } = useApp();
  const coord = visiblePages.find((p) => p.page.key === "coordinacion");

  if (coord?.variant === "jugador-solicitudes" || activeBaseRole === "jugador") {
    const first = coord?.modules[0];
    if (first) return <Navigate to="/m/$module" params={{ module: first }} replace />;
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mis Solicitudes"
          subtitle="Pide material, permisos o cualquier trámite al staff"
        />
        <EmptyState
          icon={ClipboardList}
          title="Sin solicitudes disponibles"
          message="Aún no tienes módulos de solicitudes habilitados."
        />
      </div>
    );
  }

  const first = coord?.modules[0];
  if (first) return <Navigate to="/m/$module" params={{ module: first }} replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coordinación"
        subtitle="Trabajo interno del staff: tareas, juntas y gestión operativa"
      />
      <EmptyState
        icon={MessagesSquare}
        title="Sin acceso"
        message="Tu rol actual no tiene acceso a los módulos de coordinación."
      />
    </div>
  );
}
