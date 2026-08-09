import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationsTab } from "@/components/admin/LocationsTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { ClubIdentityTab } from "@/components/admin/ClubIdentityTab";
import { ClubLeagueTab } from "@/components/admin/ClubLeagueTab";
import { ClubPreferencesTab } from "@/components/admin/ClubPreferencesTab";
import { useApp } from "@/components/squad/AppLayout";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  head: () => ({
    meta: [
      { title: "Squad — Configuración del club" },
      {
        name: "description",
        content: "Ajustes del club: identidad, ubicaciones, categorías, liga y preferencias.",
      },
    ],
  }),
  component: ClubSettingsPage,
});

function ClubSettingsPage() {
  const { user, profile, isSuperAdmin, permissions } = useApp();
  // Configuración del club: solo Editor global (o super admin).
  const isEditorGlobal = isSuperAdmin || permissions["usuarios"] === "editor_global";
  const canEdit = isEditorGlobal;

  if (!isEditorGlobal) {
    return (
      <EmptyState
        icon={Shield}
        title="Acceso restringido"
        message="Esta sección está disponible solo para editores globales del club."
      />
    );
  }

  const clubId = profile?.club_id ?? null;

  return (
    <div className="space-y-6">
      <ModuleTabs hubKey="admin" extraActiveKey="admin-config" />


      {!clubId ? (
        <EmptyState title="Sin club" message="Tu perfil aún no está asociado a un club." />
      ) : (
        <Tabs defaultValue="identidad" className="space-y-4">
          <TabsList className="glass w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="identidad">Identidad</TabsTrigger>
            <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
            <TabsTrigger value="liga">Torneo / Liga</TabsTrigger>
            <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
          </TabsList>

          <TabsContent value="identidad">
            <ClubIdentityTab clubId={clubId} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="ubicaciones">
            <LocationsTab clubId={clubId} userId={user.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="categorias">
            <CategoriesTab clubId={clubId} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="liga">
            <ClubLeagueTab clubId={clubId} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="preferencias">
            <ClubPreferencesTab clubId={clubId} canEdit={canEdit} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

