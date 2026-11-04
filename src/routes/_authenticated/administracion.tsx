import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { EmptyState } from "@/components/squad/EmptyState";

export const Route = createFileRoute("/_authenticated/administracion")({
  component: AdministracionLayout,
});

function AdministracionLayout() {
  const { visiblePages, isSuperAdmin } = useApp();
  const allowed = isSuperAdmin || visiblePages.some((p) => p.page.key === "admin");
  if (!allowed) {
    return <EmptyState icon={Shield} title="Acceso restringido" message="Esta sección está disponible solo para administradores del club." />;
  }
  return <Outlet />;
}
