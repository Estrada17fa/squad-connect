import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { StandardCard } from "@/components/squad/StandardCard";
import { MessagesSquare, ClipboardList } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";

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
  const navigate = useNavigate();
  const { visiblePages, activeBaseRole } = useApp();
  const coord = visiblePages.find((p) => p.page.key === "coordinacion");

  // Caso Jugador: página se convierte en "Mis Solicitudes".
  if (coord?.variant === "jugador-solicitudes" || activeBaseRole === "jugador") {
    return <PlayerRequestsPage />;
  }

  const modules = coord?.modules ?? [];

  // Si solo hay un módulo, saltar directo a él.
  if (modules.length === 1) {
    return <Navigate to="/m/$module" params={{ module: modules[0] }} replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coordinación"
        subtitle="Trabajo interno del staff: tareas, juntas y gestión operativa"
      />
      {modules.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Sin acceso"
          message="Tu rol actual no tiene acceso a los módulos de coordinación."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((key, i) => {
            const m = MODULE_MAP[key];
            return (
              <div key={key} className="animate-card-in" style={{ animationDelay: `${i * 30}ms` }}>
                <StandardCard
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: key } })}
                  icon={m.icon}
                  title={m.label}
                  subtitle={m.description}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerRequestsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Solicitudes"
        subtitle="Pide material, permisos o cualquier trámite al staff"
      />
      <EmptyState
        icon={ClipboardList}
        title="Módulo de solicitudes en construcción"
        message="Pronto podrás crear y dar seguimiento a tus solicitudes desde aquí."
      />
    </div>
  );
}
