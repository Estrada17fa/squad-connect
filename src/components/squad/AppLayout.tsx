import * as React from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchModule } from "@/lib/prefetch";
import { ChevronDown, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess, hasAccess, type TeamOption, type AccessLevel } from "@/hooks/useAccess";
import { MODULES, MODULE_MAP, moduleFromPath, type ModuleKey } from "@/lib/modules";
import { resolvePagesForUser, inferBaseRole, type BaseRole, type ResolvedPage } from "@/lib/rolePages";
import { LoadingState } from "./LoadingState";
import { FAB } from "./FAB";
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

interface AppCtx {
  user: { id: string };
  accessibleModules: ModuleKey[];
  /** Unión (mejor nivel) — úsalo solo para navegación global. */
  permissions: Record<string, AccessLevel>;
  /** Permisos efectivos según el equipo activo (respeta scope de módulo). */
  activePermissions: Record<string, AccessLevel>;
  /** Devuelve el nivel efectivo para un módulo específico según su scope. */
  getModuleAccess: (key: ModuleKey) => AccessLevel;
  activeTeam: TeamOption | null;
  setActiveTeamId: (id: string | null) => void;
  clubName: string | null;
  isSuperAdmin: boolean;
  /** true si el usuario ve todo el club (no-jugadores + super admin). */
  viewsAllClub: boolean;
  /** true si el usuario es exclusivamente jugador. */
  isPlayerOnly: boolean;
  profile: { full_name: string | null; email: string | null; club_id: string | null } | null;
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

const ACTIVE_TEAM_KEY = "squad.activeTeamId";

export function AppLayout({ user }: { user: { id: string; email?: string | null } }) {
  const navigate = useNavigate();
  const { data, isLoading } = useAccess(user.id);
  const [activeTeamId, setActiveTeamIdState] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACTIVE_TEAM_KEY);
  });

  const setActiveTeamId = React.useCallback((id: string | null) => {
    setActiveTeamIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(ACTIVE_TEAM_KEY, id);
      else window.localStorage.removeItem(ACTIVE_TEAM_KEY);
    }
  }, []);

  const teams = data?.teams ?? [];
  const activeTeam = React.useMemo<TeamOption | null>(() => {
    if (teams.length === 0) return null;
    const found = teams.find((t) => (t.id ?? "__club__") === (activeTeamId ?? "__club__"));
    return found ?? teams[0];
  }, [teams, activeTeamId]);

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
  const activePermissions = React.useMemo<Record<string, AccessLevel>>(() => {
    // No-jugadores y super admin: usan la unión (ven todo el club).
    if (viewsAllClub) return data?.permissions ?? {};
    const teamKey = activeTeam?.id ?? "club";
    return data?.permissionsByTeam?.[teamKey] ?? clubPerms;
  }, [viewsAllClub, data?.permissions, data?.permissionsByTeam, activeTeam?.id, clubPerms]);

  const getModuleAccess = React.useCallback(
    (key: ModuleKey): AccessLevel => {
      if (viewsAllClub) return data?.permissions?.[key] ?? "none";
      const scope = MODULE_MAP[key].scope;
      if (scope === "club") return clubPerms[key] ?? "none";
      return activePermissions[key] ?? "none";
    },
    [viewsAllClub, data?.permissions, clubPerms, activePermissions],
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

  const activeBaseRole: BaseRole = viewsAllClub
    ? (data?.isSuperAdmin ? "admin" : dominantBaseRole)
    : ((activeTeam?.baseRole as BaseRole | null | undefined) ?? inferBaseRole(activeTeam?.roleName ?? null));

  const effectiveBaseRole: BaseRole = data?.isSuperAdmin ? "admin" : activeBaseRole;
  const effectiveModules = React.useMemo<ModuleKey[]>(
    () => (data?.isSuperAdmin ? MODULES.map((m) => m.key) : accessibleModules),
    [data?.isSuperAdmin, accessibleModules],
  );
  const visiblePages = React.useMemo(
    () => resolvePagesForUser(effectiveBaseRole, effectiveModules),
    [effectiveBaseRole, effectiveModules],
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
    activeTeam,
    setActiveTeamId,
    clubName: data.clubName,
    isSuperAdmin: data.isSuperAdmin,
    profile: data.profile,
    activeBaseRole: effectiveBaseRole,
    visiblePages,
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="min-h-screen bg-background pb-24 sm:pb-8">
        <Header
          clubName={data.clubName}
          teams={teams}
          activeTeam={activeTeam}
          setActiveTeamId={setActiveTeamId}
          userName={data.profile?.full_name ?? user.email ?? ""}
          isSuperAdmin={data.isSuperAdmin}
          onSignOut={signOut}
        />
        <DesktopNav pages={visiblePages} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
        <BottomNav pages={visiblePages} />
        <FAB />
      </div>
    </AppContext.Provider>
  );
}

function Header({
  clubName,
  teams,
  activeTeam,
  setActiveTeamId,
  userName,
  isSuperAdmin,
  onSignOut,
}: {
  clubName: string | null;
  teams: TeamOption[];
  activeTeam: TeamOption | null;
  setActiveTeamId: (id: string | null) => void;
  userName: string;
  isSuperAdmin: boolean;
  onSignOut: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeModule = moduleFromPath(pathname);
  const activeScope = activeModule ? MODULE_MAP[activeModule].scope : null;
  // Ocultar selector cuando estamos en un módulo estrictamente de club.
  const showTeamSelector = activeScope !== "club" && teams.length > 1;
  const showClubName = activeScope === "club" || teams.length <= 1;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={squadLogo.url} alt="Squad" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          {showTeamSelector ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-foreground hover:bg-white/[0.06]">
                <span className="flex flex-col items-start leading-tight">
                  <span className="max-w-[140px] truncate">{activeTeam?.name ?? "Equipo"}</span>
                  {activeTeam?.roleName ? (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {activeTeam.roleName}
                    </span>
                  ) : null}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Cambiar contexto</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {teams.map((t) => (
                  <DropdownMenuItem
                    key={(t.id ?? "club") + t.roleId}
                    onSelect={() => setActiveTeamId(t.id)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.roleName}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : showClubName && clubName ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">{clubName}</span>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-medium text-foreground hover:bg-white/10">
              {(userName || "?").slice(0, 1).toUpperCase()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{userName || "Cuenta"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/mi-perfil">
                  <User className="mr-2 h-4 w-4" />
                  Ver mi perfil
                </Link>
              </DropdownMenuItem>
              {isSuperAdmin ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin/clubs">Administrar clubes</Link>
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
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
  const { profile, activeTeam } = useApp();
  const ctx = React.useMemo(
    () => ({ clubId: profile?.club_id ?? null, teamId: activeTeam?.id ?? null }),
    [profile?.club_id, activeTeam?.id],
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
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2 sm:px-6">
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
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
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


