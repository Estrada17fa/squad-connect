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
                className="glass card-hover animate-card-in relative flex flex-col items-center gap-2 overflow-hidden p-4 text-center hover:-translate-y-0.5 hover:[background:linear-gradient(hsl(0_0%_100%/0.055),hsl(0_0%_100%/0.055))_padding-box,linear-gradient(180deg,hsl(150_100%_50%/0.45),hsl(150_100%_50%/0.06))_border-box]"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span
                  className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-60"
                  style={{ background: `linear-gradient(90deg,transparent,${m.accent},transparent)` }}
                />
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: `color-mix(in oklab, ${m.accent} 14%, transparent)`,
                    color: m.accent,
                    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${m.accent} 22%, transparent)`,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-display text-xs font-semibold text-foreground">{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
