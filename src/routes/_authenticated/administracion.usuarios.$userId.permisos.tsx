import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { EmptyState } from "@/components/squad/EmptyState";
import { canManageUsers } from "@/lib/permissions";
import { UserAdvancedSettings, type MembershipCtx } from "@/components/usuarios/UserAdvancedSettings";
import { useAdminUsers, shortName } from "@/hooks/useAdminUsers";
import { UsersHeader, BackLabel } from "@/components/admin/users/ui";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/$userId/permisos")({
  component: PermisosMiembro,
});

function PermisosMiembro() {
  const { userId } = Route.useParams();
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);
  const member = (data.members.data ?? []).find((m) => m.id === userId);
  const mems = data.byUser.get(userId) ?? [];

  if (!canEdit) return <EmptyState title="Sin acceso" message="Solo quien edita Usuarios puede ajustar permisos." />;
  if (data.members.isLoading || data.memberships.isLoading) return <LoadingState />;
  if (!member || !clubId) return <EmptyState title="No encontrado" message="Esta persona no pertenece a tu club." />;

  return (
    <div className="coord-enter mx-auto max-w-4xl space-y-4 pb-28">
      <UsersHeader back={<Link to="/administracion/usuarios/$userId" params={{ userId }}><BackLabel>{shortName(member)}</BackLabel></Link>} title="Permisos" />
      <p className="text-sm text-muted-foreground">Por categoría: Sin acceso · Ver · Editar. Lo que cambies aquí aplica solo a esta persona.</p>
      <div className="adm-reskin">
        <UserAdvancedSettings
          clubId={clubId}
          userId={userId}
          canEdit
          memberships={mems.map<MembershipCtx>((m) => ({
            id: m.id,
            teamId: m.team_id,
            roleId: m.role_id,
            label: `${m.teamName ?? "Todo el club"} · ${m.roleName ?? ""}`,
          }))}
        />
      </div>
    </div>
  );
}
