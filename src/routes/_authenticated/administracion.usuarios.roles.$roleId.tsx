import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { EmptyState } from "@/components/squad/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { canManageUsers } from "@/lib/permissions";
import { useRoleApprovals } from "@/hooks/useRequestApprovers";
import { RolePermissionsMatrix, type RolePermRow } from "@/components/usuarios/RolePermissionsMatrix";
import { useAdminUsers, useRefreshAdminUsers } from "@/hooks/useAdminUsers";
import { UsersHeader, BackLabel } from "@/components/admin/users/ui";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/roles/$roleId")({
  head: () => ({
    meta: [
      { title: "Rol — Squad" },
      { name: "description", content: "Permisos por módulo y aprobaciones de un rol del club." },
      { property: "og:title", content: "Rol — Squad" },
      { property: "og:description", content: "Permisos por módulo y aprobaciones de un rol del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RolDetalle,
});

function RolDetalle() {
  const { roleId } = Route.useParams();
  const qc = useQueryClient();
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);
  const refresh = useRefreshAdminUsers(clubId);
  const approvalsQ = useRoleApprovals(clubId);
  const permsQ = useQuery({
    queryKey: ["club-role-permissions-one", roleId],
    queryFn: async (): Promise<RolePermRow[]> => {
      const { data: rows, error } = await supabase.from("role_permissions").select("role_id, module_key, level").eq("role_id", roleId);
      if (error) throw error;
      return (rows ?? []) as RolePermRow[];
    },
  });
  const role = (data.roles.data ?? []).find((r) => r.id === roleId);

  if (data.roles.isLoading || permsQ.isLoading) return <LoadingState />;
  if (!role || !clubId) return <EmptyState title="No encontrado" message="Este rol no existe en tu club." />;

  return (
    <div className="coord-enter mx-auto max-w-3xl space-y-4 pb-28">
      <UsersHeader back={<Link to="/administracion/usuarios/roles"><BackLabel>Roles</BackLabel></Link>} title={role.name} />
      <RolePermissionsMatrix
        key={role.id}
        clubId={clubId}
        role={role}
        perms={permsQ.data ?? []}
        approvalTypes={(approvalsQ.data ?? []).filter((a) => a.role_id === role.id).map((a) => a.request_type)}
        canEdit={canEdit}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["club-role-permissions-one", roleId] });
          refresh();
        }}
      />
    </div>
  );
}
