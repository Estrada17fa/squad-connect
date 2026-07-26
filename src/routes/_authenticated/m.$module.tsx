import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { useApp } from "@/components/squad/AppLayout";

export const Route = createFileRoute("/_authenticated/m/$module")({
  head: ({ params }) => {
    const m = MODULE_MAP[params.module as ModuleKey];
    const title = m ? `Squad — ${m.label}` : "Squad";
    return {
      meta: [
        { title },
        { name: "description", content: m?.description ?? "Módulo de Squad" },
      ],
    };
  },
  component: ModulePage,
  notFoundComponent: () => (
    <EmptyState title="Módulo no encontrado" message="La ruta solicitada no existe." />
  ),
});

function ModulePage() {
  const { module } = Route.useParams();
  const { accessibleModules } = useApp();
  const def = MODULE_MAP[module as ModuleKey];

  if (!def) throw notFound();

  const canAccess = accessibleModules.includes(def.key);

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title={def.label} subtitle={def.description} />
      <ModuleTabs activeKey={def.key} />
      {!canAccess ? (
        <EmptyState
          icon={def.icon}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para este módulo."
        />
      ) : (
        <EmptyState
          icon={def.icon}
          title={`${def.label} — próximamente`}
          message="Este módulo aún no tiene contenido. Se construirá en los próximos pasos."
        />
      )}
    </div>
  );
}
