import { createFileRoute, Link } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP, COMING_SOON_MODULES } from "@/lib/modules";
import { coordAreasForUser } from "@/lib/rolePages";

export const Route = createFileRoute("/_authenticated/coordinacion")({
  head: () => ({
    meta: [
      { title: "Squad — Coordinación" },
      { name: "description", content: "Coordinación general, administrativa, operacional, técnica y médica del club." },
      { property: "og:title", content: "Squad — Coordinación" },
      { property: "og:description", content: "Todas las áreas de coordinación del club en un solo lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoordinacionHub,
});

function CoordinacionHub() {
  const { visiblePages } = useApp();
  const coord = visiblePages.find((p) => p.page.key === "coordinacion");
  const areas = coordAreasForUser(coord?.modules ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Coordinación" subtitle="Aquí se carga toda la información del club" />
      {areas.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Sin acceso"
          message="No tienes acceso a ningún módulo de coordinación."
        />
      ) : (
        areas.map((area) => (
          <section key={area.key} className="space-y-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {area.label}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {area.modules.map((key) => {
                const m = MODULE_MAP[key];
                const Icon = m.icon;
                const soon = COMING_SOON_MODULES.includes(key);
                return (
                  <Link
                    key={key}
                    to="/m/$module"
                    params={{ module: key }}
                    className="glass flex min-w-0 flex-col gap-2 rounded-xl p-4 transition-colors hover:border-primary/40"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="truncate text-sm font-semibold">{m.label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {soon ? "En desarrollo" : m.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
