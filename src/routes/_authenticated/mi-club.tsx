import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { StandardCard } from "@/components/squad/StandardCard";
import { Users } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";

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
  const navigate = useNavigate();
  const { visiblePages, activeTeam } = useApp();
  const club = visiblePages.find((p) => p.page.key === "club");
  const modules = club?.modules ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Club"
        subtitle={activeTeam ? `${activeTeam.name} · ${activeTeam.roleName}` : "Módulos del club y del equipo"}
      />
      {modules.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin módulos disponibles"
          message="Tu rol actual no tiene acceso a los módulos del club."
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
