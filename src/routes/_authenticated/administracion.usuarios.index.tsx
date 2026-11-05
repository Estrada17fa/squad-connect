import * as React from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Search, Plus, MoreHorizontal, X, CheckCircle2 } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canManageUsers } from "@/lib/permissions";
import { inferBaseRole } from "@/lib/rolePages";
import { displayName } from "@/components/usuarios/memberUtils";
import { useAdminUsers, neverSignedIn, type AdminMember } from "@/hooks/useAdminUsers";
import { UsersHeader, BackLabel, IconBtn } from "@/components/admin/users/ui";
import { UserTabs, AlertLines, PersonGrid, PersonTile, roleCategoryLine, type UsersTab, type Alerta } from "@/components/admin/users/PeopleGrid";

type Search = { tab?: string; alerta?: string; cat?: string };

export const Route = createFileRoute("/_authenticated/administracion/usuarios/")({
  validateSearch: (s: Record<string, unknown>): Search & { filtro?: string } => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    alerta: typeof s.alerta === "string" ? s.alerta : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    filtro: typeof s.filtro === "string" ? s.filtro : undefined,
  }),
  beforeLoad: ({ search }) => {
    // Enlaces del diseño anterior: se redirigen al formato nuevo.
    if (search.tab === "roles") throw redirect({ to: "/administracion/usuarios/roles", replace: true });
    if (search.tab === "actividad") throw redirect({ to: "/administracion/usuarios/actividad", replace: true });
    if (search.filtro) {
      const alerta = search.filtro === "sin-categoria" ? "sin_categoria" : search.filtro === "sin-entrar" ? "sin_entrar" : undefined;
      throw redirect({ to: "/administracion/usuarios", search: { alerta }, replace: true });
    }
  },
  component: UsuariosIndex,
});

function UsuariosIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/administracion/usuarios/" });
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const alerta: Alerta | null = search.alerta === "sin_categoria" || search.alerta === "sin_entrar" || search.alerta === "sin_ficha" ? search.alerta : null;
  const tabParam: UsersTab = search.tab === "jugadores" || search.tab === "bajas" ? search.tab : "staff";
  const cat = search.cat ?? "";

  const members = data.members.data ?? [];
  const teams = data.teams.data ?? [];
  const allCats = data.allCats.data ?? new Set<string>();
  const mems = (id: string) => data.byUser.get(id) ?? [];
  const isPlayer = (id: string) => {
    const b = mems(id).map((m) => inferBaseRole(m.roleName));
    return b.length > 0 && b.every((x) => x === "jugador");
  };
  const active = members.filter((m) => (m.status ?? "activo") !== "baja");
  const bucket = (m: AdminMember): UsersTab => ((m.status ?? "activo") === "baja" ? "bajas" : isPlayer(m.id) ? "jugadores" : "staff");
  const sinCat = active.filter((m) => mems(m.id).length === 0);
  const sinEntrar = active.filter((m) => mems(m.id).length > 0 && neverSignedIn(m, data.signInMap, data.signInAvailable));
  const matchAlerta = (m: AdminMember) =>
    alerta === "sin_categoria" ? mems(m.id).length === 0 : alerta === "sin_entrar" ? sinEntrar.includes(m) : alerta === "sin_ficha" ? data.sinFicha.has(m.id) : true;

  // Al activar una alerta: si todas sus personas caen en una pestaña, se usa esa; si no, se muestran todas.
  const alertaTabs = alerta ? new Set(active.filter(matchAlerta).map(bucket)) : null;
  const showAll = !!alertaTabs && alertaTabs.size > 1;
  const tab: UsersTab = alertaTabs && alertaTabs.size === 1 ? [...alertaTabs][0]! : tabParam;

  const counts = { staff: 0, jugadores: 0, bajas: 0 } as Record<UsersTab, number>;
  for (const m of members) counts[bucket(m)]++;

  const s = q.trim().toLowerCase();
  const list = members.filter((m) => {
    if (!showAll && bucket(m) !== tab) return false;
    if (alerta && ((m.status ?? "activo") === "baja" || !matchAlerta(m))) return false;
    if (cat && !mems(m.id).some((x) => x.team_id === cat)) return false;
    if (s && !`${displayName(m)} ${m.email ?? ""}`.toLowerCase().includes(s)) return false;
    return true;
  });

  const dotOf = (m: AdminMember) =>
    mems(m.id).length === 0 ? "red" as const : neverSignedIn(m, data.signInMap, data.signInAvailable) ? "amber" as const : null;
  const tile = (m: AdminMember, withNumber?: boolean) => (
    <PersonTile
      key={m.id}
      member={m}
      subtitle={roleCategoryLine(mems(m.id), allCats.has(m.id))}
      dot={dotOf(m)}
      number={withNumber ? m.jersey_number : null}
      onClick={() => navigate({ to: "/administracion/usuarios/$userId", params: { userId: m.id } })}
    />
  );

  function playerGroups() {
    const groups: { title: string; people: AdminMember[] }[] = [];
    for (const t of teams) {
      if (cat && t.id !== cat) continue;
      const people = list.filter((m) => mems(m.id).some((x) => x.team_id === t.id));
      if (people.length) groups.push({ title: t.name, people });
    }
    const none = list.filter((m) => !mems(m.id).some((x) => x.team_id));
    if (none.length) groups.push({ title: "Sin categoría", people: none });
    return groups;
  }

  const catName = teams.find((t) => t.id === cat)?.name;
  const emptyText = alerta === "sin_categoria" ? "Nadie sin categoría. Todo en orden"
    : alerta === "sin_entrar" ? "Todos ya entraron a la app. Todo en orden"
    : alerta === "sin_ficha" ? "Todos los jugadores tienen ficha. Todo en orden"
      : s ? "Nadie coincide con la búsqueda" : tab === "bajas" ? "No hay bajas" : "Nadie por aquí";

  return (
    <div className="coord-enter mx-auto max-w-5xl space-y-3 pb-28">
      <UsersHeader
        back={<Link to="/administracion"><BackLabel>Administración</BackLabel></Link>}
        title="Usuarios"
        actions={
          <>
            <IconBtn label="Buscar" onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setQ(""); }}>
              <Search className="h-5 w-5 text-muted-foreground" />
            </IconBtn>
            {canEdit ? (
              <Link to="/administracion/usuarios/nuevo" aria-label="Nuevo miembro" className="coord-press flex h-10 w-10 items-center justify-center rounded-xl">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </Link>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Más opciones" className="coord-press flex h-10 w-10 items-center justify-center rounded-xl outline-none">
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild><Link to="/administracion/usuarios/roles">Roles y permisos</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/administracion/usuarios/actividad">Actividad</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/m/usuarios">Ver versión actual</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Filtrar por categoría</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={cat} onValueChange={(v) => navigate({ search: (p) => ({ ...p, cat: v || undefined }), replace: true })}>
                  <DropdownMenuRadioItem value="">Todas</DropdownMenuRadioItem>
                  {teams.map((t) => <DropdownMenuRadioItem key={t.id} value={t.id}>{t.name}</DropdownMenuRadioItem>)}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {searchOpen ? <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o correo" className="h-11 rounded-xl" /> : null}

      <UserTabs
        value={showAll ? null : tab}
        counts={counts}
        onChange={(t) => navigate({ search: (p) => ({ ...p, tab: t === "staff" ? undefined : t, alerta: undefined }), replace: true })}
      />

      <AlertLines
        sinCategoria={sinCat.length}
        sinEntrar={sinEntrar.length}
        sinFicha={data.sinFicha.size}
        active={alerta}
        onToggle={(a) => navigate({ search: (p) => ({ ...p, alerta: a ?? undefined }), replace: true })}
      />

      {catName ? (
        <button onClick={() => navigate({ search: (p) => ({ ...p, cat: undefined }), replace: true })} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          Categoría: <span className="font-semibold text-foreground">{catName}</span> <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {data.members.isLoading ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : tab === "jugadores" && !showAll ? (
        <div className="space-y-5">
          {playerGroups().map((g) => (
            <section key={g.title}>
              <h2 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title} · {g.people.length}</h2>
              <PersonGrid>{g.people.map((m) => tile(m, true))}</PersonGrid>
            </section>
          ))}
        </div>
      ) : (
        <PersonGrid>{list.map((m) => tile(m, bucket(m) === "jugadores"))}</PersonGrid>
      )}
    </div>
  );
}
