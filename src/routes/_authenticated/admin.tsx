import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Shield, Building2 } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Squad — Admin" },
      { name: "description", content: "Panel de administración: usuarios, documentos y clubes." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { visiblePages, isSuperAdmin, activeBaseRole } = useApp();
  const adminPage = visiblePages.find((p) => p.page.key === "admin");
  const modules = adminPage?.modules ?? [];

  if (activeBaseRole !== "admin" && !isSuperAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Acceso restringido"
        message="Esta sección está disponible solo para administradores del club."
      />
    );
  }

  // Redirige al primer módulo del hub para que las pestañas de módulos tomen el control.
  if (modules[0]) {
    return <Navigate to="/m/$module" params={{ module: modules[0] }} replace />;
  }

  // Sin módulos accesibles: si es super admin, mostrar acceso a "Administrar clubes".
  return (
    <div className="space-y-6">
      <PageHeader title="Admin" subtitle="Gestión del club" />
      {isSuperAdmin ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StandardCard
            interactive
            onClick={() => navigate({ to: "/admin/clubs" })}
            icon={Building2}
            title="Administrar clubes"
            subtitle="Panel de super admin"
          />
        </div>
      ) : (
        <EmptyState
          icon={Shield}
          title="Sin módulos disponibles"
          message="No tienes acceso a los módulos de administración."
        />
      )}
    </div>
  );
}
