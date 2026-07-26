import * as React from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";
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
  profile: { full_name: string | null; email: string | null; club_id: string | null } | null;
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
  const activePermissions = React.useMemo<Record<string, AccessLevel>>(() => {
    const teamKey = activeTeam?.id ?? "club";
    return data?.permissionsByTeam?.[teamKey] ?? clubPerms;
  }, [data?.permissionsByTeam, activeTeam?.id, clubPerms]);

  const getModuleAccess = React.useCallback(
    (key: ModuleKey): AccessLevel => {
      const scope = MODULE_MAP[key].scope;
      if (scope === "club") return clubPerms[key] ?? "none";
      return activePermissions[key] ?? "none";
    },
    [clubPerms, activePermissions],
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
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
        <BottomNav accessibleModules={accessibleModules} />
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
              {isSuperAdmin ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/clubs">Administrar clubes</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
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

function BottomNav({ accessibleModules }: { accessibleModules: ModuleKey[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Home + Calendario always first, then up to 2 more, rest under "Más".
  const primary: ModuleKey[] = ["calendario"];
  const extras = accessibleModules.filter((k) => !primary.includes(k));
  const inNav = extras.slice(0, 2);
  const inMore = extras.slice(2);

  const items = [
    { key: "home", label: HOME_MODULE.label, icon: HOME_MODULE.icon, to: "/" as const, active: pathname === "/" },
    ...primary.map((k) => ({
      key: k,
      label: MODULE_MAP[k].label,
      icon: MODULE_MAP[k].icon,
      to: `/m/${k}` as const,
      active: pathname === `/m/${k}`,
    })),
    ...inNav.map((k) => ({
      key: k,
      label: MODULE_MAP[k].label,
      icon: MODULE_MAP[k].icon,
      to: `/m/${k}` as const,
      active: pathname === `/m/${k}`,
    })),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl sm:hidden">
      <div className="mx-auto flex max-w-6xl items-stretch justify-around px-2 py-1.5">
        {items.map((it) => (
          <Link
            key={it.key}
            to={it.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors",
              it.active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <it.icon className={cn("h-5 w-5", it.active && "drop-shadow-[0_0_6px_hsl(150_100%_50%/0.7)]")} />
            <span>{it.label}</span>
          </Link>
        ))}
        {inMore.length > 0 || accessibleModules.length > 3 ? (
          <Link
            to="/mas"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors",
              pathname === "/mas"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Más</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
