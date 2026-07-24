import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/calendar-utils";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Squad — Inicio" },
      { name: "description", content: "Panel de bienvenida de Squad para tu club." },
      { property: "og:title", content: "Squad" },
      { property: "og:description", content: "Plataforma de gestión para clubes deportivos profesionales." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { accessibleModules, clubName, activeTeam } = useApp();

  const nextEventQ = useQuery({
    queryKey: ["home-next-event", activeTeam?.id ?? "none"],
    enabled: !!activeTeam?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select("id, title, starts_at, event_type, location")
        .eq("team_id", activeTeam!.id!)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const rosterQ = useQuery({
    queryKey: ["home-roster-count", activeTeam?.id ?? "none"],
    enabled: !!activeTeam?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("player_profiles")
        .select("availability_status")
        .eq("team_id", activeTeam!.id!);
      const list = data ?? [];
      return {
        total: list.length,
        unavailable: list.filter((p) => p.availability_status !== "apto").length,
      };
    },
  });

  const others = accessibleModules.filter((k) => k !== "calendario" && k !== "plantel");
  const hasCal = accessibleModules.includes("calendario");
  const hasPlantel = accessibleModules.includes("plantel");

  return (
    <div className="space-y-6">
      <PageHeader
        title={clubName ? `Hola, ${clubName}` : "Bienvenido"}
        subtitle={activeTeam ? `${activeTeam.name} · ${activeTeam.roleName}` : "Selecciona un módulo para comenzar"}
      />

      {accessibleModules.length === 0 ? (
        <EmptyState
          title="Sin módulos disponibles"
          message="Tu rol actual no tiene acceso a ningún módulo. Contacta al administrador de tu club."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hasCal ? (
              <div className="animate-card-in">
                <StandardCard
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: "calendario" } })}
                  icon={Calendar}
                  title="Calendario"
                  subtitle={
                    nextEventQ.data
                      ? `${EVENT_TYPE_MAP[nextEventQ.data.event_type as keyof typeof EVENT_TYPE_MAP].label} · ${formatDateTime(nextEventQ.data.starts_at)}`
                      : "Sin próximos eventos"
                  }
                >
                  {nextEventQ.data ? (
                    <span className="text-foreground">{nextEventQ.data.title}</span>
                  ) : (
                    "Programa el próximo entrenamiento o partido."
                  )}
                </StandardCard>
              </div>
            ) : null}
            {hasPlantel ? (
              <div className="animate-card-in" style={{ animationDelay: "40ms" }}>
                <StandardCard
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: "plantel" } })}
                  icon={Users}
                  title="Plantel"
                  subtitle={
                    rosterQ.data
                      ? `${rosterQ.data.total} jugadores · ${rosterQ.data.unavailable} con baja o en duda`
                      : "Aún sin datos"
                  }
                >
                  Revisa disponibilidad y datos del roster.
                </StandardCard>
              </div>
            ) : null}
          </div>

          {others.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((key, i) => {
                const m = MODULE_MAP[key];
                return (
                  <div key={key} className="animate-card-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <StandardCard
                      interactive
                      onClick={() => navigate({ to: "/m/$module", params: { module: key } })}
                      icon={m.icon}
                      title={m.label}
                      subtitle={m.description}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
