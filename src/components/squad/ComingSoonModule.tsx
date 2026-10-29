import { Hammer } from "lucide-react";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { PageHeader } from "./PageHeader";
import { EmptyState } from "./EmptyState";
import { ModuleTabs } from "./ModuleTabs";

/** Pantalla para módulos de Coordinación que aún no se desarrollan. */
export function ComingSoonModule({ moduleKey }: { moduleKey: ModuleKey }) {
  const m = MODULE_MAP[moduleKey];
  return (
    <div className="space-y-6">
      <ModuleTabs activeKey={moduleKey} />
      <PageHeader title={m?.label ?? "Módulo"} subtitle={m?.description} />
      <EmptyState
        icon={Hammer}
        title="En desarrollo"
        message="Este módulo estará disponible pronto."
      />
    </div>
  );
}
