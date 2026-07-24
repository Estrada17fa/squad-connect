import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Squad — Inicio" },
      { name: "description", content: "Panel de bienvenida de Squad para tu club." },
      { property: "og:title", content: "Squad" },
      { property: "og:description", content: "Plataforma de gestión para clubes deportivos profesionales." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { accessibleModules, clubName, activeTeam } = useApp();

  return (
    <div className="space-y-6">
      <PageHeader
        title={clubName ? `Hola, ${clubName}` : "Bienvenido"}
        subtitle={activeTeam ? `${activeTeam.name} · ${activeTeam.roleName}` : "Selecciona un módulo para comenzar"}
      />

      {accessibleModules.length === 0 ? (
        <EmptyState
          title="Sin módulos disponibles"
          message="Tu rol actual no tiene acceso a ningún módulo. Contacta al administrador de tu club."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accessibleModules.map((key, i) => {
            const m = MODULE_MAP[key];
            return (
              <div key={key} className="animate-card-in" style={{ animationDelay: `${i * 40}ms` }}>
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
