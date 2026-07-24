import * as React from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LogOut, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess, hasAccess, type TeamOption } from "@/hooks/useAccess";
import { HOME_MODULE, MODULES, MODULE_MAP, type ModuleKey } from "@/lib/modules";
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
  permissions: Record<string, "none" | "read" | "editor" | "approver">;
  activeTeam: TeamOption | null;
  setActiveTeamId: (id: string | null) => void;
  clubName: string | null;
  isSuperAdmin: boolean;
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

    activeTeam,
    setActiveTeamId,
    clubName: data.clubName,
    isSuperAdmin: data.isSuperAdmin,
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
  onSignOut,
}: {
  clubName: string | null;
  teams: TeamOption[];
  activeTeam: TeamOption | null;
  setActiveTeamId: (id: string | null) => void;
  userName: string;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={squadLogo.url} alt="Squad" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          {teams.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-white/[0.06]">
                <span className="max-w-[120px] truncate">{activeTeam?.name ?? "Equipo"}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 rounded-2xl border-white/10 bg-background/85 p-1.5 backdrop-blur-xl"
              >
                <DropdownMenuLabel className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cambiar equipo
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                {teams.map((t) => (
                  <DropdownMenuItem
                    key={(t.id ?? "club") + t.roleId}
                    onSelect={() => setActiveTeamId(t.id)}
                    className="rounded-xl focus:bg-white/[0.06]"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.roleName}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : clubName ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">{clubName}</span>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm font-medium text-foreground ring-1 ring-white/10 transition-colors hover:bg-white/10">
              {(userName || "?").slice(0, 1).toUpperCase()}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl border-white/10 bg-background/85 p-1.5 backdrop-blur-xl"
            >
              <DropdownMenuLabel className="truncate px-2 text-sm">{userName || "Cuenta"}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onSelect={onSignOut} className="rounded-xl focus:bg-white/[0.06]">
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
