import * as React from "react";
import { useClubPrefs } from "@/hooks/useClubSettings";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchModule } from "@/lib/prefetch";
import { ChevronDown, ClipboardList, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess, hasAccess, type TeamOption } from "@/hooks/useAccess";
import {
  canEdit as levelCanEdit,
  canRead as levelCanRead,
  canSeeUsers,
  maxLevel,
  type PermissionLevel,
} from "@/lib/permissions";


import { MODULES, MODULE_MAP, moduleFromPath, permissionKeyFor, type ModuleKey } from "@/lib/modules";
import {
  resolvePagesForUser,
  inferBaseRole,
  needsSolicitudesShortcut,
  type BaseRole,
  type ResolvedPage,
} from "@/lib/rolePages";
import { LoadingState } from "./LoadingState";
import { ClubCrest } from "./ClubCrest";

import { NotificationBell } from "@/components/notificaciones/NotificationBell";
import { cn } from "@/lib/utils";
import squadLogo from "@/assets/squad-logo.png.asset.json";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/components/usuarios/memberUtils";

interface AppCtx {
  user: { id: string };
  accessibleModules: ModuleKey[];
  /** Unión (mejor nivel) — úsalo solo para navegación global. */
  permissions: Record<string, PermissionLevel>;
  /** Permisos efectivos (unión de membresías). */
  activePermissions: Record<string, PermissionLevel>;
  /** Devuelve el nivel efectivo para un módulo específico según su scope. */
  getModuleAccess: (key: ModuleKey) => PermissionLevel;
  /** ¿Puede ver el módulo en cualquier contexto? */
  canViewModule: (key: ModuleKey) => boolean;
  /** ¿Puede editar el módulo en algún contexto? */
  canEditModule: (key: ModuleKey) => boolean;
  /** Equipos a los que el usuario tiene acceso (para filtros y selectores). */
  teamOptions: TeamOption[];
  /** Permisos efectivos por equipo (clave 'club' = ámbito club). */
  permissionsByTeam: Record<string, Record<string, PermissionLevel>>;
  /** Niveles globales (aplican a cualquier equipo del club). */
  globalPermissions: Record<string, PermissionLevel>;

  clubName: string | null;
  isSuperAdmin: boolean;
  /** true si el usuario ve todo el club (no-jugadores + super admin). */
  viewsAllClub: boolean;
  /** true si el usuario es exclusivamente jugador. */
  isPlayerOnly: boolean;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    club_id: string | null;
  } | null;
  /** Rol base derivado del equipo activo (para el mapping de páginas). */
  activeBaseRole: BaseRole;
  /** Páginas visibles con los módulos que caen dentro de cada una. */
  visiblePages: ResolvedPage[];
}



const AppContext = React.createContext<AppCtx | null>(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppLayout");
  return ctx;
}

const LEGACY_ACTIVE_TEAM_KEY = "squad.activeTeamId";

export function AppLayout({ user }: { user: { id: string; email?: string | null } }) {
  const navigate = useNavigate();
  const { data, isLoading } = useAccess(user.id);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Cambio de contraseña obligatorio en el primer acceso (cuenta creada por un admin).
  const mustChange = useQuery({
    queryKey: ["must-change-password", user.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: row } = await (supabase as any)
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .maybeSingle();
      return !!row?.must_change_password;
    },
  });

  const forcePassword = mustChange.data === true;
  const onPasswordRoute = pathname.startsWith("/cambiar-contrasena");

  React.useEffect(() => {
    if (forcePassword && !onPasswordRoute) {
      navigate({ to: "/cambiar-contrasena", replace: true });
    }
  }, [forcePassword, onPasswordRoute, navigate]);

  // Ya no existe el concepto de "equipo activo global".
  React.useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(LEGACY_ACTIVE_TEAM_KEY);
  }, []);

  const teamOptions = React.useMemo<TeamOption[]>(() => data?.teamOptions ?? [], [data?.teamOptions]);

  const accessibleModules = React.useMemo<ModuleKey[]>(() => {
    if (!data) return [];
    return MODULES.filter((m) => hasAccess(data.permissions, m.key)).map((m) => m.key);
  }, [data]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const clubPerms = data?.permissionsByTeam?.["club"] ?? {};
  const viewsAllClub = !!(data?.isSuperAdmin || (data && !data.isPlayerOnly));
  // Sin equipo activo: los permisos efectivos son la unión de todas las membresías.
  const activePermissions = React.useMemo<Record<string, PermissionLevel>>(
    () => data?.permissions ?? {},
    [data?.permissions],
  );

  // Equivalente cliente de max_permission_any_team: el mejor nivel del usuario
  // en cualquier equipo (los módulos de ámbito club usan el contexto 'club').
  const getModuleAccess = React.useCallback(
    (navKey: ModuleKey): PermissionLevel => {
      if (data?.isSuperAdmin) return "editor_global";
      // Las entradas de navegación alias (p. ej. gestión de Multimedia)
      // resuelven contra el module_key real de permisos.
      const key = permissionKeyFor(navKey);
      const scope = MODULE_MAP[key].scope;
      const globalLvl = data?.globalPermissions?.[key];
      if (scope === "club" && !viewsAllClub) return maxLevel(clubPerms[key], globalLvl);
      return maxLevel(data?.permissions?.[key], globalLvl);
    },
    [data?.isSuperAdmin, viewsAllClub, data?.permissions, data?.globalPermissions, clubPerms],
  );

  const canViewModule = React.useCallback(
    (key: ModuleKey) => levelCanRead(getModuleAccess(key)),
    [getModuleAccess],
  );
  const canEditModule = React.useCallback(
    (key: ModuleKey) => levelCanEdit(getModuleAccess(key)),
    [getModuleAccess],
  );


  // Rol base efectivo. Para no-jugadores tomamos el "mejor" rol entre todas sus
  // membresías (Admin > Técnico > Médico > Staff) para elegir el mapa de páginas.
  const BASE_ROLE_RANK: Record<BaseRole, number> = { admin: 4, tecnico: 3, medico: 2, staff: 1, jugador: 0 };
  const dominantBaseRole: BaseRole = React.useMemo(() => {
    const roles = (data?.teams ?? [])
      .map((t) => (t.baseRole as BaseRole | null) ?? inferBaseRole(t.roleName ?? null))
      .filter((r): r is BaseRole => !!r);
    if (roles.length === 0) return "staff";
    return roles.reduce((best, r) => (BASE_ROLE_RANK[r] > BASE_ROLE_RANK[best] ? r : best), roles[0]);
  }, [data?.teams]);

  const activeBaseRole: BaseRole = data?.isSuperAdmin ? "admin" : dominantBaseRole;

  const effectiveBaseRole: BaseRole = data?.isSuperAdmin ? "admin" : activeBaseRole;

  // Fuente de verdad única: predicado de accesibilidad basado en el nivel efectivo
  // del módulo según el contexto activo (respeta scope, overrides y team activo).
  // Se reutiliza tal cual para construir la navbar Y los chips de módulos, de
  // modo que la navegación nunca oculta elementos con display:none — los que no
  // pasan el predicado simplemente no se incluyen en el array renderizado.
  const isModuleAccessible = React.useCallback(
    (key: ModuleKey) => {
      if (key === "usuarios") return canSeeUsers(getModuleAccess("usuarios"));
      // La gestión de Multimedia (Coordinación) no es para Vista Jugador:
      // ese nivel solo accede al feed de Mi Club.
      if (key === "multimedia_gestion") {
        const lvl = getModuleAccess("multimedia_gestion");
        return levelCanRead(lvl) && lvl !== "vista_jugador";
      }
      return canViewModule(key);
    },
    [canViewModule, getModuleAccess],
  );
  // La sección Admin exige nivel global en `usuarios` (o super admin):
  // leer documentos u otros módulos nunca abre Admin.
  const canAccessAdmin = !!data?.isSuperAdmin || canSeeUsers(getModuleAccess("usuarios"));

  const visiblePages = React.useMemo(
    () => resolvePagesForUser(effectiveBaseRole, isModuleAccessible, { canAccessAdmin }),
    [effectiveBaseRole, isModuleAccessible, canAccessAdmin],
  );


  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState />
      </div>
    );
  }


  const ctx: AppCtx = {
    user: { id: user.id },
    accessibleModules,
    permissions: data.permissions,
    activePermissions,
    getModuleAccess,
    canViewModule,
    canEditModule,
    teamOptions,
    permissionsByTeam: data.permissionsByTeam,
    globalPermissions: data.globalPermissions,

    clubName: data.clubName,
    isSuperAdmin: data.isSuperAdmin,
    viewsAllClub,
    isPlayerOnly: data.isPlayerOnly,
    profile: data.profile,
    activeBaseRole: effectiveBaseRole,
    visiblePages,
  };

  return (
    <AppContext.Provider value={ctx}>
      <ClubPrefsSync />
      <div className="min-h-screen bg-background pb-24 sm:pb-8">

        <Header
          clubId={data.profile?.club_id ?? null}
          clubName={data.clubName}
          userName={data.profile?.full_name ?? user.email ?? ""}
          avatarUrl={data.profile?.avatar_url ?? null}
          userId={user.id}
          isSuperAdmin={data.isSuperAdmin}
          canOpenModule={(key) => isModuleAccessible(key as ModuleKey)}
          showSolicitudes={needsSolicitudesShortcut(visiblePages, isModuleAccessible("solicitudes"))}
          onSignOut={signOut}
        />
        <DesktopNav pages={visiblePages} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
        <BottomNav pages={visiblePages} />

      </div>
    </AppContext.Provider>
  );
}

/** Aplica las preferencias del club (zona horaria y formato de fecha) a los formateadores. */
function ClubPrefsSync() {
  useClubPrefs();
  return null;
}


function Header({
  clubId,
  clubName,
  userName,
  avatarUrl,
  userId,
  isSuperAdmin,
  canOpenModule,
  showSolicitudes,
  onSignOut,
}: {
  clubId: string | null;
  clubName: string | null;
  userName: string;
  avatarUrl: string | null;
  userId: string;
  isSuperAdmin: boolean;
  canOpenModule: (key: string) => boolean;
  /** Atajo "Mis Solicitudes" para quien no ve la página Coordinación. */
  showSolicitudes: boolean;
  onSignOut: () => void;
}) {
  const fallback = initials(userName || "?");
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      {/* Tres zonas: Squad · escudo del club (centrado) · campana + avatar. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center justify-self-start">
          <img src={squadLogo.url} alt="Squad" className="h-8 w-auto" />
        </Link>

        <ClubCrest clubId={clubId} clubName={clubName} className="justify-self-center" />

        <div className="flex items-center gap-2 justify-self-end">
          <NotificationBell userId={userId} canOpenModule={canOpenModule} />

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-9 w-9 border border-border/60">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={userName || "Mi perfil"} /> : null}
                <AvatarFallback className="bg-white/5 text-sm font-medium">
                  {fallback}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={userName || "Mi perfil"} /> : null}
                  <AvatarFallback className="text-[11px]">{fallback}</AvatarFallback>
                </Avatar>
                <span className="truncate">{userName || "Cuenta"}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/mi-perfil">
                  <User className="mr-2 h-4 w-4" />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              {showSolicitudes ? (
                <DropdownMenuItem asChild>
                  <Link to="/m/$module" params={{ module: "solicitudes" }}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Mis Solicitudes
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function computeActiveKey(
  pathname: string,
  pages: ResolvedPage[],
): string | null {
  if (pathname === "/") return "home";
  const activeModule = moduleFromPath(pathname);
  if (activeModule) {
    const hub = pages.find((p) => p.modules.includes(activeModule));
    if (hub) return hub.page.key;
  }
  // Fallback: prefix match on the hub route (e.g. /mi-club, /coordinacion)
  const match = pages.find((p) => {
    const to = p.page.to;
    if (to === "/") return false;
    return pathname === to || pathname.startsWith(to + "/");
  });
  return match ? match.page.key : null;
}

function useHubPrefetch() {
  const qc = useQueryClient();
  const { profile } = useApp();
  const ctx = React.useMemo(
    () => ({ clubId: profile?.club_id ?? null, teamId: null }),
    [profile?.club_id],
  );
  return React.useCallback(
    (rp: ResolvedPage) => {
      for (const mk of rp.modules) prefetchModule(qc, mk, ctx);
    },
    [qc, ctx],
  );
}

function BottomNav({ pages }: { pages: ResolvedPage[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeKey = computeActiveKey(pathname, pages);
  const prefetchHub = useHubPrefetch();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl sm:hidden">
      <div className="mx-auto flex max-w-6xl items-stretch justify-around px-2 py-1.5">
        {pages.map((rp) => {
          const active = rp.page.key === activeKey;
          const Icon = rp.page.icon;
          const label = rp.labelOverride ?? rp.page.label;
          return (
            <Link
              key={rp.page.key}
              to={rp.page.to as any}
              onMouseEnter={() => prefetchHub(rp)}
              onFocus={() => prefetchHub(rp)}
              onTouchStart={() => prefetchHub(rp)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active && "drop-shadow-[0_0_8px_hsl(150_100%_50%/0.85)]",
                )}
              />
              <span className={cn("truncate", active && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DesktopNav({ pages }: { pages: ResolvedPage[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeKey = computeActiveKey(pathname, pages);
  const prefetchHub = useHubPrefetch();
  return (
    <div className="hidden border-b border-border/40 bg-background/40 sm:block">
      <div className="mx-auto flex max-w-6xl items-stretch justify-around gap-1 px-4 py-2 sm:px-6">
        {pages.map((rp) => {
          const active = rp.page.key === activeKey;
          const Icon = rp.page.icon;
          const label = rp.labelOverride ?? rp.page.label;
          return (
            <Link
              key={rp.page.key}
              to={rp.page.to as any}
              onMouseEnter={() => prefetchHub(rp)}
              onFocus={() => prefetchHub(rp)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "text-primary font-semibold [&_svg]:drop-shadow-[0_0_8px_hsl(150_100%_50%/0.85)]"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>

  );
}


