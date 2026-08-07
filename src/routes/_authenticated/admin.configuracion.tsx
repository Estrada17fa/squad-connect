import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationsTab } from "@/components/admin/LocationsTab";
import { useApp } from "@/components/squad/AppLayout";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  head: () => ({
    meta: [
      { title: "Squad — Configuración del club" },
      { name: "description", content: "Ajustes administrativos del club: catálogo de ubicaciones y más." },
    ],
  }),
  component: ClubSettingsPage,
});

function ClubSettingsPage() {
  const { user, profile, isSuperAdmin, activeBaseRole, permissions } = useApp();
  const isAdmin = isSuperAdmin || activeBaseRole === "admin";
  const canEdit =
    isSuperAdmin || permissions["usuarios"] === "editor" || permissions["usuarios"] === "approver";

  if (!isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Acceso restringido"
        message="Esta sección está disponible solo para administradores del club."
      />
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs hubKey="admin" extraActiveKey="admin-config" />
      <PageHeader title="Configuración del club" subtitle="Ajustes administrativos del club" />

      <Tabs defaultValue="ubicaciones" className="space-y-4">
        <TabsList className="glass w-full sm:w-auto">
          <TabsTrigger value="ubicaciones" className="flex-1 sm:flex-none">
            Ubicaciones
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ubicaciones">
          {profile?.club_id ? (
            <LocationsTab clubId={profile.club_id} userId={user.id} canEdit={canEdit} />
          ) : (
            <EmptyState title="Sin club" message="Tu perfil aún no está asociado a un club." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
