import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { canManageUsers } from "@/lib/permissions";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { UsersHeader, BackLabel } from "@/components/admin/users/ui";
import { ActivityTimeline, useAudit } from "@/components/admin/users/ActivityTimeline";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/actividad")({
  head: () => ({ meta: [{ title: "Actividad de usuarios · Squad" }, { name: "description", content: "Cambios recientes en miembros y categorías." }] }),
  component: ActividadPage,
});

function ActividadPage() {
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);
  const audit = useAudit(clubId);
  return (
    <div className="coord-enter mx-auto max-w-3xl space-y-4 pb-28">
      <UsersHeader back={<Link to="/administracion/usuarios"><BackLabel>Usuarios</BackLabel></Link>} title="Actividad" />
      {!canEdit ? (
        <p className="py-10 text-center text-sm text-muted-foreground">La actividad solo la ve quien puede editar Usuarios.</p>
      ) : audit.isLoading ? <LoadingState /> : audit.isError ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Próximamente</p>
      ) : (
        <ActivityTimeline rows={audit.data ?? []} members={data.members.data ?? []} roles={data.roles.data ?? []} teams={data.teams.data ?? []} />
      )}
    </div>
  );
}
