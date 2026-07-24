import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/mas")({
  head: () => ({ meta: [{ title: "Squad — Más" }] }),
  component: MorePage,
});

function MorePage() {
  const navigate = useNavigate();
  const { accessibleModules } = useApp();

  return (
    <div className="space-y-6">
      <PageHeader title="Más" subtitle="Todos los módulos disponibles" />
      {accessibleModules.length === 0 ? (
        <EmptyState title="Sin módulos" message="No tienes acceso a ningún módulo." />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {accessibleModules.map((key, i) => {
            const m = MODULE_MAP[key];
            const Icon = m.icon;
            return (
              <button
                key={key}
                onClick={() => navigate({ to: "/m/$module", params: { module: key } })}
                className="glass animate-card-in flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-white/[0.06]"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Icon className="h-6 w-6 text-foreground" />
                <span className="font-display text-xs font-medium text-foreground">{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
