import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, SlidersHorizontal, UserPlus, X, ShieldCheck, Plus, CheckCircle2 } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { Input } from "@/components/ui/input";
import { canManageUsers } from "@/lib/permissions";
import { inferBaseRole } from "@/lib/rolePages";
import { displayName } from "@/components/usuarios/memberUtils";
import {
  useAdminUsers, neverSignedIn, shortName, categoriesLine,
} from "@/hooks/useAdminUsers";
import {
  UsersHeader, BackLabel, IconBtn, SectionLabel, GroupCard, RowButton, PersonAvatar, Pill, UsersTabs, Fab,
} from "@/components/admin/users/ui";
import { ActivityTimeline, useAudit } from "@/components/admin/users/ActivityTimeline";
import { CreateRoleDialog } from "@/components/admin/users/CreateRoleDialog";

type Tab = "miembros" | "roles" | "actividad";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/")({
  validateSearch: (s: Record<string, unknown>): { tab?: string; filtro?: string } => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    filtro: typeof s.filtro === "string" ? s.filtro : undefined,
  }),
  component: UsuariosIndex,
});

const ROLE_PILLS = [
  { key: "jugador", label: "Jugadores" },
  { key: "tecnico", label: "Técnicos" },
  { key: "medico", label: "Médicos" },
  { key: "staff", label: "Staff" },
  { key: "admin", label: "Admin" },
] as const;

function UsuariosIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/administracion/usuarios/" });
  const tab: Tab = search.tab === "roles" || search.tab === "actividad" ? search.tab : "miembros";
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);

  return (
    <div className="coord-enter mx-auto max-w-3xl space-y-4 pb-28">
      <UsersHeader
        back={<Link to="/administracion"><BackLabel>Administración</BackLabel></Link>}
        title="Usuarios"
      />
      <UsersTabs<Tab>
        tabs={[{ key: "miembros", label: "Miembros" }, { key: "roles", label: "Roles" }, { key: "actividad", label: "Actividad" }]}
        value={tab}
        onChange={(t) => navigate({ search: { tab: t === "miembros" ? undefined : t }, replace: true })}
      />
      {data.members.isLoading ? (
        <LoadingState />
      ) : tab === "miembros" ? (
        <MembersList data={data} canEdit={canEdit} filtro={search.filtro} />
      ) : tab === "roles" ? (
        <RolesList data={data} canEdit={canEdit} clubId={clubId} />
      ) : (
        <ActivityTab data={data} clubId={clubId} canEdit={canEdit} />
      )}
      <div className="pt-6 text-center text-xs text-muted-foreground">
        <Link to="/m/usuarios" className="underline-offset-2 hover:underline">Ver versión actual</Link>
      </div>
    </div>
  );
}

type Data = ReturnType<typeof useAdminUsers>;

function MembersList({ data, canEdit, filtro }: { data: Data; canEdit: boolean; filtro?: string }) {
  const navigate = useNavigate({ from: "/administracion/usuarios/" });
  const [rolePill, setRolePill] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<null | "search" | "filter">(null);
  const [q, setQ] = React.useState("");
  const [teamId, setTeamId] = React.useState<string>("");
  const [status, setStatus] = React.useState<"activo" | "baja">("activo");

  const members = data.members.data ?? [];
  const allCats = data.allCats.data ?? new Set<string>();
  const baseOf = (id: string) => new Set((data.byUser.get(id) ?? []).map((m) => inferBaseRole(m.roleName)));

  const statusList = members.filter((m) => (m.status ?? "activo") === status);
  const counts: Record<string, number> = {};
  for (const m of statusList) for (const b of baseOf(m.id)) if (b) counts[b] = (counts[b] ?? 0) + 1;

  const filtered = statusList.filter((m) => {
    const mems = data.byUser.get(m.id) ?? [];
    if (filtro === "sin-categoria" && mems.length > 0) return false;
    if (filtro === "sin-entrar" && !neverSignedIn(m, data.signInMap, data.signInAvailable)) return false;
    if (rolePill && !baseOf(m.id).has(rolePill as any)) return false;
    if (teamId && !mems.some((x) => x.team_id === teamId)) return false;
    const s = q.trim().toLowerCase();
    if (s && !`${displayName(m)} ${m.email ?? ""}`.toLowerCase().includes(s)) return false;
    return true;
  });
  const isPlayerOnly = (id: string) => {
    const b = baseOf(id);
    return b.size > 0 && [...b].every((x) => x === "jugador");
  };
  const staff = filtered.filter((m) => !isPlayerOnly(m.id));
  const players = filtered.filter((m) => isPlayerOnly(m.id));

  const filtroLabel = filtro === "sin-categoria" ? "Sin categoría" : filtro === "sin-entrar" ? "Sin entrar a la app" : null;
  const emptyText =
    filtro === "sin-categoria" ? "Nadie sin categoría. Todo en orden"
      : filtro === "sin-entrar" ? "Todos ya entraron a la app. Todo en orden"
        : status === "baja" ? "No hay bajas" : "Nadie coincide con la búsqueda";

  function renderGroup(title: string, list: typeof filtered) {
    if (list.length === 0) return null;
    return (
      <section>
        <SectionLabel>{title} · {list.length}</SectionLabel>
        <GroupCard>
          {list.map((m) => {
            const mems = data.byUser.get(m.id) ?? [];
            const dot = mems.length === 0 ? "red" : neverSignedIn(m, data.signInMap, data.signInAvailable) ? "amber" : null;
            const name = shortName(m);
            return (
              <RowButton key={m.id} onClick={() => navigate({ to: "/administracion/usuarios/$userId", params: { userId: m.id } })}>
                <span className="flex items-center gap-3">
                  <PersonAvatar name={name} src={m.avatar_url} dot={dot as any} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{categoriesLine(mems, allCats.has(m.id))}</span>
                  </span>
                </span>
              </RowButton>
            );
          })}
        </GroupCard>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <Pill active={!rolePill} onClick={() => setRolePill(null)}>Todos {statusList.length}</Pill>
          {ROLE_PILLS.filter((p) => counts[p.key]).map((p) => (
            <Pill key={p.key} active={rolePill === p.key} onClick={() => setRolePill(rolePill === p.key ? null : p.key)}>
              {p.label} {counts[p.key]}
            </Pill>
          ))}
        </div>
        <IconBtn label="Buscar" active={open === "search"} onClick={() => setOpen(open === "search" ? null : "search")}><Search className="h-5 w-5" /></IconBtn>
        <IconBtn label="Filtrar" active={open === "filter" || !!teamId || status === "baja"} onClick={() => setOpen(open === "filter" ? null : "filter")}><SlidersHorizontal className="h-5 w-5" /></IconBtn>
      </div>

      {open === "search" ? (
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o correo" className="h-11 rounded-xl" />
      ) : null}
      {open === "filter" ? (
        <div className="space-y-2 rounded-[14px] bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground">Estado</p>
          <div className="flex gap-1.5">
            <Pill active={status === "activo"} onClick={() => setStatus("activo")}>Activos</Pill>
            <Pill active={status === "baja"} onClick={() => setStatus("baja")}>Bajas</Pill>
          </div>
          <p className="pt-1 text-xs font-semibold text-muted-foreground">Categoría</p>
          <div className="flex flex-wrap gap-1.5">
            <Pill active={!teamId} onClick={() => setTeamId("")}>Todas</Pill>
            {(data.teams.data ?? []).map((t) => (
              <Pill key={t.id} active={teamId === t.id} onClick={() => setTeamId(t.id)}>{t.name}</Pill>
            ))}
          </div>
        </div>
      ) : null}

      {filtroLabel ? (
        <div className="flex items-center gap-2">
          <Pill tone={filtro === "sin-categoria" ? "red" : "amber"}>
            {filtroLabel}
            <button aria-label="Quitar filtro" onClick={() => navigate({ search: {}, replace: true })} className="-mr-1 ml-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </Pill>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <>
          {renderGroup("Staff y cuerpo técnico", staff)}
          {renderGroup("Jugadores", players)}
        </>
      )}

      {canEdit ? (
        <Fab label="Nuevo miembro" to="/administracion/usuarios/nuevo"><UserPlus className="h-6 w-6" /></Fab>
      ) : null}
    </div>
  );
}

function RolesList({ data, canEdit, clubId }: { data: Data; canEdit: boolean; clubId: string | null }) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = React.useState(false);
  const roles = data.roles.data ?? [];
  const people = (roleId: string) => new Set((data.memberships.data ?? []).filter((m) => m.role_id === roleId).map((m) => m.user_id)).size;
  return (
    <div className="space-y-3">
      <GroupCard>
        {roles.map((r) => (
          <RowButton key={r.id} onClick={() => navigate({ to: "/administracion/usuarios/roles/$roleId", params: { roleId: r.id } })}>
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-[18px] w-[18px] text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                <span className="block text-xs text-muted-foreground">{people(r.id)} {people(r.id) === 1 ? "persona" : "personas"}</span>
              </span>
              {r.default_all_categories ? <Pill tone="gray">Todas las categorías</Pill> : null}
            </span>
          </RowButton>
        ))}
      </GroupCard>
      {canEdit && clubId ? (
        <>
          <button onClick={() => setCreateOpen(true)} className="coord-press inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-muted text-sm font-semibold">
            <Plus className="h-4 w-4" /> Crear rol
          </button>
          <CreateRoleDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            clubId={clubId}
            onCreated={(id) => {
              data.roles.refetch();
              navigate({ to: "/administracion/usuarios/roles/$roleId", params: { roleId: id } });
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function ActivityTab({ data, clubId, canEdit }: { data: Data; clubId: string | null; canEdit: boolean }) {
  const audit = useAudit(clubId);
  if (!canEdit) {
    return <p className="py-10 text-center text-sm text-muted-foreground">La actividad solo la ve quien puede editar Usuarios.</p>;
  }
  if (audit.isLoading) return <LoadingState />;
  if (audit.isError) return <p className="py-10 text-center text-sm text-muted-foreground">Próximamente</p>;
  return (
    <ActivityTimeline
      rows={audit.data ?? []}
      members={data.members.data ?? []}
      roles={data.roles.data ?? []}
      teams={data.teams.data ?? []}
    />
  );
}
