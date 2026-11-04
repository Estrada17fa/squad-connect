import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { EmptyState } from "@/components/squad/EmptyState";
import { canSeeUsers } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/administracion/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios — Squad" },
      { name: "description", content: "Miembros, roles y permisos del club." },
      { property: "og:title", content: "Usuarios — Squad" },
      { property: "og:description", content: "Miembros, roles y permisos del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsuariosLayout,
});

function UsuariosLayout() {
  const { isSuperAdmin, permissions } = useApp();
  if (!(isSuperAdmin || canSeeUsers(permissions["usuarios"]))) {
    return <EmptyState icon={ShieldCheck} title="Sin acceso" message="No tienes permiso para ver los usuarios del club." />;
  }
  return <Outlet />;
}
