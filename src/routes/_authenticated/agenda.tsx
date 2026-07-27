import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { Calendar } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Squad — Agenda" },
      { name: "description", content: "Entrenamientos, partidos, juntas, viajes y eventos." },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const { accessibleModules } = useApp();
  const target = accessibleModules.includes("agenda")
    ? "agenda"
    : accessibleModules.includes("mes")
      ? "mes"
      : null;
  if (target) {
    return <Navigate to="/m/$module" params={{ module: target }} replace />;
  }
  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Agenda" subtitle="Entrenamientos, partidos, juntas y viajes" />
      <EmptyState
        icon={Calendar}
        title="Sin acceso a la agenda"
        message="Tu rol actual no tiene acceso a los módulos de la agenda."
      />
    </div>
  );
}
