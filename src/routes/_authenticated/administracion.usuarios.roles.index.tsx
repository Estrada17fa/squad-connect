import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { canManageUsers } from "@/lib/permissions";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { UsersHeader, BackLabel, GroupCard, RowButton } from "@/components/admin/users/ui";
import { FaceStack } from "@/components/admin/users/PeopleGrid";
import { CreateRoleDialog } from "@/components/admin/users/CreateRoleDialog";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/roles/")({
  head: () => ({ meta: [{ title: "Roles y permisos · Squad" }, { name: "description", content: "Roles del club y sus permisos." }] }),
  component: RolesPage,
});

function RolesPage() {
  const navigate = useNavigate();
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);
  const [createOpen, setCreateOpen] = React.useState(false);
  const roles = data.roles.data ?? [];
  const members = data.members.data ?? [];
  const peopleOf = (roleId: string) => {
    const ids = new Set((data.memberships.data ?? []).filter((m) => m.role_id === roleId).map((m) => m.user_id));
    return members.filter((m) => ids.has(m.id));
  };
  const system = roles.filter((r) => r.is_system_default);
  const custom = roles.filter((r) => !r.is_system_default);

  const group = (title: string, list: typeof roles) =>
    list.length ? (
      <section>
        <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <GroupCard>
          {list.map((r) => {
            const people = peopleOf(r.id);
            return (
              <RowButton key={r.id} onClick={() => navigate({ to: "/administracion/usuarios/roles/$roleId", params: { roleId: r.id } })}>
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.default_all_categories ? "Todas las categorías" : "Por categoría"} · {people.length} {people.length === 1 ? "persona" : "personas"}
                    </span>
                  </span>
                  <FaceStack people={people} />
                </span>
              </RowButton>
            );
          })}
        </GroupCard>
      </section>
    ) : null;

  return (
    <div className="coord-enter mx-auto max-w-3xl space-y-4 pb-28">
      <UsersHeader back={<Link to="/administracion/usuarios"><BackLabel>Usuarios</BackLabel></Link>} title="Roles y permisos" />
      {data.roles.isLoading ? <LoadingState /> : (
        <>
          {group("Roles base", system)}
          {group("Roles del club", custom)}
          {canEdit && clubId ? (
            <>
              <button onClick={() => setCreateOpen(true)} className="coord-press min-h-11 px-1 text-sm font-semibold text-primary">+ Crear rol</button>
              <CreateRoleDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                clubId={clubId}
                onCreated={(id) => { data.roles.refetch(); navigate({ to: "/administracion/usuarios/roles/$roleId", params: { roleId: id } }); }}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
