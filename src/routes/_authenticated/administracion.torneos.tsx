import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { EmptyState } from "@/components/squad/EmptyState";

export const Route = createFileRoute("/_authenticated/administracion/torneos")({
  head: () => ({
    meta: [
      { title: "Torneos — Squad" },
      { name: "description", content: "Arma los torneos del club: formato, puntos, desempate y equipos." },
      { property: "og:title", content: "Torneos — Squad" },
      { property: "og:description", content: "Arma los torneos del club: formato, puntos, desempate y equipos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TorneosLayout,
});

function TorneosLayout() {
  const { isSuperAdmin, accessibleModules } = useApp();
  if (!(isSuperAdmin || accessibleModules.includes("torneo"))) {
    return <EmptyState icon={Trophy} title="Sin acceso" message="Tu rol no tiene permiso para ver los torneos." />;
  }
  return <Outlet />;
}
