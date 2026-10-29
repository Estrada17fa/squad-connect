import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";

export const Route = createFileRoute("/_authenticated/mi-club")({
  head: () => ({
    meta: [
      { title: "Squad — Mi Club" },
      { name: "description", content: "Resumen de solo lectura de tu club." },
      { property: "og:title", content: "Squad — Mi Club" },
      { property: "og:description", content: "Resumen de solo lectura de tu club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MiClubPage,
});

function MiClubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mi Club" subtitle="Resumen del club (solo lectura)" />
      <EmptyState
        icon={Shield}
        title="Próximamente"
        message="Aquí verás la información del club que se carga desde Coordinación."
      />
    </div>
  );
}
