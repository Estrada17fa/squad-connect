import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shield, Building2 } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";

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

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" subtitle="Gestión del club" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((key) => {
          const m = MODULE_MAP[key];
          return (
            <StandardCard
              key={key}
              interactive
              onClick={() => navigate({ to: "/m/$module", params: { module: key } })}
              icon={m.icon}
              title={m.label}
              subtitle={m.description}
            />
          );
        })}
        {isSuperAdmin ? (
          <StandardCard
            interactive
            onClick={() => navigate({ to: "/admin/clubs" })}
            icon={Building2}
            title="Administrar clubes"
            subtitle="Panel de super admin"
          />
        ) : null}
      </div>
    </div>
  );
}
