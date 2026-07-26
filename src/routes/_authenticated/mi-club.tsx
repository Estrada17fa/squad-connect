import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";

export const Route = createFileRoute("/_authenticated/mi-club")({
  head: () => ({
    meta: [
      { title: "Squad — Mi Club" },
      { name: "description", content: "Plantel, salud, tácticas, torneo, comunicados y más." },
    ],
  }),
  component: MiClubPage,
});

function MiClubPage() {
  const { visiblePages } = useApp();
  const club = visiblePages.find((p) => p.page.key === "club");
  const first = club?.modules[0];

  if (first) {
    return <Navigate to="/m/$module" params={{ module: first }} replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mi Club" subtitle="Módulos del club y del equipo" />
      <EmptyState
        icon={Users}
        title="Sin módulos disponibles"
        message="Tu rol actual no tiene acceso a los módulos del club."
      />
    </div>
  );
}
