import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Plane, Users, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { cn } from "@/lib/utils";

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

function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

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
        available: list.filter((p) => p.availability_status === "apto").length,
        unavailable: list.filter((p) => p.availability_status !== "apto").length,
      };
    },
  });

  const hasCal = accessibleModules.includes("calendario");
  const hasPlantel = accessibleModules.includes("plantel");
  const hasViajes = accessibleModules.includes("viajes");
  const others = accessibleModules.filter(
    (k) => k !== "calendario" && k !== "plantel" && k !== "viajes",
  );

  const nextEv = nextEventQ.data;
  const evDef = nextEv ? EVENT_TYPE_MAP[nextEv.event_type as keyof typeof EVENT_TYPE_MAP] : null;
  const evDate = nextEv ? new Date(nextEv.starts_at) : null;
  const days = nextEv ? daysUntil(nextEv.starts_at) : null;

  const calAccent = MODULE_MAP.calendario.accent;
  const plantelAccent = MODULE_MAP.plantel.accent;
  const viajesAccent = MODULE_MAP.viajes.accent;

  let animIndex = 0;
  const delay = () => ({ animationDelay: `${animIndex++ * 40}ms` } as React.CSSProperties);

  return (
    <div className="space-y-6">
      <PageHeader
        title={clubName ? `Hola, ${clubName}` : "Bienvenido"}
        subtitle={activeTeam ? `${activeTeam.name} · ${activeTeam.roleName}` : "Selecciona un módulo"}
      />

      {accessibleModules.length === 0 ? (
        <EmptyState
          title="Sin módulos disponibles"
          message="Tu rol actual no tiene acceso a ningún módulo. Contacta al administrador de tu club."
        />
      ) : (
        <div className="grid auto-rows-[minmax(120px,auto)] grid-cols-2 gap-3 sm:grid-cols-4">
          {hasCal ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/m/$module", params: { module: "calendario" } })}
              className="animate-card-in group glass card-hover relative col-span-2 flex flex-col justify-between overflow-hidden p-5 text-left sm:col-span-2 sm:row-span-2 hover:-translate-y-0.5 hover:[background:linear-gradient(hsl(0_0%_100%/0.055),hsl(0_0%_100%/0.055))_padding-box,linear-gradient(180deg,hsl(150_100%_50%/0.45),hsl(150_100%_50%/0.06))_border-box]"
              style={{ ...delay(), ["--card-accent" as any]: calAccent } as React.CSSProperties}
            >
              <span
                className="pointer-events-none absolute inset-x-5 top-0 h-px opacity-70"
                style={{ background: `linear-gradient(90deg,transparent,${calAccent},transparent)` }}
              />
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
                style={{ background: `radial-gradient(closest-side, ${calAccent}, transparent)` }}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{
                      background: `color-mix(in oklab, ${calAccent} 16%, transparent)`,
                      color: calAccent,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${calAccent} 26%, transparent)`,
                    }}
                  >
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Próximo evento
                    </div>
                    <div className="font-display text-lg font-bold text-foreground">
                      {MODULE_MAP.calendario.label}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>

              {nextEv && evDate && evDef ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-display text-6xl font-bold leading-none tracking-tight"
                      style={{ color: calAccent }}
                    >
                      {days === 0 ? "Hoy" : days}
                    </span>
                    {days !== 0 ? (
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {days === 1 ? "día" : "días"}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <div className="font-display text-base font-semibold text-foreground line-clamp-1">
                      {nextEv.title}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {evDate.toLocaleDateString("es-MX", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {evDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      {nextEv.location ? ` · ${nextEv.location}` : ""}
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: `color-mix(in oklab, ${evDef.cssVar} 16%, transparent)`,
                      color: evDef.cssVar,
                    }}
                  >
                    {evDef.label}
                  </span>
                </div>
              ) : (
                <div className="mt-4">
                  <div
                    className="font-display text-4xl font-bold leading-none"
                    style={{ color: calAccent }}
                  >
                    0
                  </div>
                  <div className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sin próximos eventos
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Programa el próximo entrenamiento o partido.
                  </p>
                </div>
              )}
            </button>
          ) : null}

          {hasPlantel ? (
            <div style={delay()} className="animate-card-in sm:row-span-2">
              <StandardCard
                interactive
                onClick={() => navigate({ to: "/m/$module", params: { module: "plantel" } })}
                icon={Users}
                title="Plantel"
                accent={plantelAccent}
                stat={rosterQ.data?.total ?? "—"}
                statLabel="jugadores"
                size="md"
                className="h-full"
              >
                {rosterQ.data ? (
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{rosterQ.data.unavailable}</span>{" "}
                    con baja o duda
                  </span>
                ) : (
                  "Sin datos aún"
                )}
              </StandardCard>
            </div>
          ) : null}

          {hasViajes ? (
            <div style={delay()} className="animate-card-in sm:row-span-2">
              <StandardCard
                interactive
                onClick={() => navigate({ to: "/m/$module", params: { module: "viajes" } })}
                icon={Plane}
                title="Viajes"
                accent={viajesAccent}
                stat={0}
                statLabel="programados"
                size="md"
                className="h-full"
              >
                Próxima logística del equipo.
              </StandardCard>
            </div>
          ) : null}

          {others.map((key) => {
            const m = MODULE_MAP[key];
            const Icon = m.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate({ to: "/m/$module", params: { module: key } })}
                style={{ ...delay(), ["--card-accent" as any]: m.accent } as React.CSSProperties}
                className={cn(
                  "animate-card-in glass card-hover relative flex flex-col items-start gap-3 overflow-hidden p-4 text-left",
                  "hover:-translate-y-0.5 hover:[background:linear-gradient(hsl(0_0%_100%/0.055),hsl(0_0%_100%/0.055))_padding-box,linear-gradient(180deg,hsl(150_100%_50%/0.45),hsl(150_100%_50%/0.06))_border-box]",
                )}
              >
                <span
                  className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-60"
                  style={{ background: `linear-gradient(90deg,transparent,${m.accent},transparent)` }}
                />
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    background: `color-mix(in oklab, ${m.accent} 14%, transparent)`,
                    color: m.accent,
                    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${m.accent} 22%, transparent)`,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold text-foreground">{m.label}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {m.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
