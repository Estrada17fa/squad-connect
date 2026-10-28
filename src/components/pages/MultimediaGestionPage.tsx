
import { Images } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { MediaManagerPanel } from "@/components/multimedia/MediaManagerPanel";



export function MultimediaGestionPage() {
  const { isSuperAdmin, accessibleModules } = useApp();
  const { isPlayerScoped } = useTeamAccess("multimedia");
  // Vista Jugador no gestiona: su acceso es el feed de Mi Club.
  const canAccess =
    isSuperAdmin || (accessibleModules.includes("multimedia") && !isPlayerScoped(null));

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="multimedia_gestion" />
        <PageHeader hideTitle title="Multimedia" subtitle="Gestión de fotos y videos" />
        <EmptyState
          icon={Images}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para gestionar multimedia."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="multimedia_gestion" />
      <PageHeader
        hideTitle
        title="Multimedia"
        subtitle="Sube y administra fotos y videos del club"
      />
      <MediaManagerPanel />
    </div>
  );
}
