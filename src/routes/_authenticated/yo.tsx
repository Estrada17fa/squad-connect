import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/yo")({
  head: () => ({
    meta: [
      { title: "Squad — Mi Perfil" },
      { name: "description", content: "Tu perfil personal y opciones de administración." },
    ],
  }),
  component: YoPage,
});

function YoPage() {
  const navigate = useNavigate();
  const { profile, activeTeam, activeBaseRole, visiblePages, isSuperAdmin } = useApp();
  const avatar = visiblePages.find((p) => p.page.key === "avatar");
  const adminModules = avatar?.modules ?? [];

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const displayName = profile?.full_name ?? profile?.email ?? "Mi perfil";

  return (
    <div className="space-y-6">
      <PageHeader title="Mi Perfil" subtitle={activeTeam ? `${activeTeam.name} · ${activeTeam.roleName}` : displayName} />

      <StandardCard icon={User} title={displayName} subtitle={profile?.email ?? undefined}>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Contexto activo: <span className="text-foreground">{activeTeam?.name ?? "—"}</span></p>
          <p>Rol: <span className="text-foreground">{activeTeam?.roleName ?? "—"}</span></p>
          <p>Rol base: <span className="text-foreground capitalize">{activeBaseRole}</span></p>
        </div>
        {activeBaseRole === "jugador" ? (
          <EmptyState
            title="Ficha personal en construcción"
            message="Aquí verás tus datos deportivos, tallas y ficha médica personal."
          />
        ) : null}
      </StandardCard>

      {adminModules.length > 0 || isSuperAdmin ? (
        <section className="space-y-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Administración
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {adminModules.map((key) => {
              const m = MODULE_MAP[key];
              return (
                <StandardCard
                  key={key}
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: key } })}
                  icon={m.icon}
                  title={m.label}
                  subtitle={m.description}
                />
              );
            })}
            {isSuperAdmin ? (
              <StandardCard
                interactive
                onClick={() => navigate({ to: "/admin/clubs" })}
                icon={User}
                title="Administrar clubes"
                subtitle="Panel de super admin"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="pt-2">
        <Button variant="ghost" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
