import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, MessagesSquare, Package, Receipt, Plane } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { useApp } from "@/components/squad/AppLayout";
import { MODULE_MAP } from "@/lib/modules";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/calendar-utils";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { useExpenseSummary } from "@/hooks/useExpenses";
import { formatMoney } from "@/lib/expenses";
import { useMyNextTrip } from "@/hooks/useTrips";

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
  const { accessibleModules, clubName, user, profile, teamOptions } = useApp();
  const teamIds = React.useMemo(
    () => teamOptions.map((t) => t.id).filter((id): id is string => !!id),
    [teamOptions],
  );
  const clubId = profile?.club_id ?? null;

  const nextEventQ = useQuery({
    queryKey: ["home-next-event", teamIds],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select("id, title, starts_at, event_type, location")
        .in("team_id", teamIds)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const rosterQ = useQuery({
    queryKey: ["home-roster-count", teamIds],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("player_profiles")
        .select("availability_status")
        .in("team_id", teamIds);
      const list = data ?? [];
      return {
        total: list.length,
        unavailable: list.filter((p) => p.availability_status !== "apto").length,
      };
    },
  });

  const coordQ = useQuery({
    queryKey: ["home-coord", user.id, clubId ?? "none"],
    enabled: !!clubId && accessibleModules.includes("coordinacion_interna"),
    queryFn: async () => {
      const [tasksRes, meetingsRes] = await Promise.all([
        supabase
          .from("task_assignees")
          .select("task:tasks!inner(id, status, club_id)")
          .eq("user_id", user.id),
        supabase
          .from("meeting_attendees")
          .select("meeting:meetings!inner(id, title, starts_at, location, club_id)")
          .eq("user_id", user.id)
          .neq("attendance_status", "rechazado"),
      ]);
      const pending = (tasksRes.data ?? []).filter(
        (r: any) => r.task && r.task.club_id === clubId && r.task.status !== "completada",
      ).length;
      const nowIso = new Date().toISOString();
      const nextMeeting = (meetingsRes.data ?? [])
        .map((r: any) => r.meeting)
        .filter((m: any) => m && m.club_id === clubId && m.starts_at >= nowIso)
        .sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at))[0];
      return { pending, nextMeeting };
    },
  });

  const inventoryQ = useQuery({
    queryKey: ["home-inventory", clubId ?? "none"],
    enabled: !!clubId && accessibleModules.includes("inventario"),
    queryFn: async () => {
      const [loansRes, catalogRes, itemsRes] = await Promise.all([
        supabase.from("inventory_loans").select("id").eq("club_id", clubId!).is("returned_at", null),
        (supabase as any).rpc("inventory_catalog", { _club_id: clubId }),
        supabase.from("inventory_items").select("id, min_quantity").eq("club_id", clubId!),
      ]);
      const mins: Record<string, number> = {};
      for (const i of itemsRes.data ?? []) mins[i.id] = i.min_quantity;
      const low = ((catalogRes.data ?? []) as any[]).filter(
        (i) => i.available_quantity <= (mins[i.id] ?? 0),
      ).length;
      return { activeLoans: (loansRes.data ?? []).length, low };
    },
  });

  const hasCompras = accessibleModules.includes("compras_facturas");
  const expensesQ = useExpenseSummary(clubId, hasCompras);

  const hasViajes = accessibleModules.includes("viajes");
  const nextTripQ = useMyNextTrip(clubId, null, user.id, hasViajes);

  const others = accessibleModules.filter(
    (k) =>
      k !== "agenda" &&
      k !== "mes" &&
      k !== "plantel" &&
      k !== "coordinacion_interna" &&
      k !== "inventario" &&
      k !== "compras_facturas" &&
      k !== "viajes",
  );
  const hasCal = accessibleModules.includes("agenda") || accessibleModules.includes("mes");
  const calTarget: "agenda" | "mes" = accessibleModules.includes("agenda") ? "agenda" : "mes";
  const hasPlantel = accessibleModules.includes("plantel");
  const hasCoord = accessibleModules.includes("coordinacion_interna");
  const hasInv = accessibleModules.includes("inventario");

  return (
    <div className="space-y-6">
      <PageHeader
        title={clubName ? `Hola, ${clubName}` : "Bienvenido"}
        subtitle="Selecciona un módulo para comenzar"
      />

      {accessibleModules.length === 0 ? (
        <EmptyState
          title="Sin módulos disponibles"
          message="Tu rol actual no tiene acceso a ningún módulo. Contacta al administrador de tu club."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hasCal ? (
              <div className="animate-card-in">
                <StandardCard
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: calTarget } })}
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
            {hasCoord ? (
              <div className="animate-card-in" style={{ animationDelay: "80ms" }}>
                <StandardCard
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: "coordinacion_interna" } })}
                  icon={MessagesSquare}
                  title="Coordinación"
                  subtitle={
                    coordQ.data
                      ? `${coordQ.data.pending} tarea${coordQ.data.pending === 1 ? "" : "s"} pendiente${coordQ.data.pending === 1 ? "" : "s"}`
                      : "Cargando…"
                  }
                >
                  {coordQ.data?.nextMeeting ? (
                    <span>
                      Próxima junta:{" "}
                      <span className="text-foreground">{coordQ.data.nextMeeting.title}</span>
                      <span className="text-muted-foreground"> · {formatDateTime(coordQ.data.nextMeeting.starts_at)}</span>
                    </span>
                  ) : (
                    "Sin juntas próximas."
                  )}
                </StandardCard>
              </div>
            ) : null}
            {hasInv ? (
              <div className="animate-card-in" style={{ animationDelay: "120ms" }}>
                <StandardCard
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: "inventario" } })}
                  icon={Package}
                  title="Inventario"
                  subtitle={
                    inventoryQ.data
                      ? `${inventoryQ.data.activeLoans} préstamo${inventoryQ.data.activeLoans === 1 ? "" : "s"} activo${inventoryQ.data.activeLoans === 1 ? "" : "s"}`
                      : "Cargando…"
                  }
                >
                  {inventoryQ.data ? (
                    inventoryQ.data.low > 0 ? (
                      <span className="text-amber-400">
                        {inventoryQ.data.low} artículo{inventoryQ.data.low === 1 ? "" : "s"} en stock bajo
                      </span>
                    ) : (
                      "Sin artículos en stock bajo."
                    )
                  ) : (
                    "Material deportivo y equipamiento."
                  )}
                </StandardCard>
              </div>
            ) : null}

            {hasCompras ? (
              <div className="animate-card-in" style={{ animationDelay: "160ms" }}>
                <StandardCard
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: "compras_facturas" } })}
                  icon={Receipt}
                  title="Compras y facturas"
                  subtitle={
                    expensesQ.data
                      ? `Gasto del mes: ${formatMoney(expensesQ.data.month_total)}`
                      : "Cargando…"
                  }
                >
                  {expensesQ.data ? (
                    expensesQ.data.pending_count > 0 ? (
                      <span className="text-amber-400">
                        {formatMoney(expensesQ.data.pending_total)} pendiente de pago ·{" "}
                        {expensesQ.data.pending_count} gasto{expensesQ.data.pending_count === 1 ? "" : "s"}
                      </span>
                    ) : (
                      "Todo pagado, sin adeudos."
                    )
                  ) : (
                    "Gastos, comprobantes y proveedores."
                  )}
                </StandardCard>
              </div>
            ) : null}

            {hasViajes ? (
              <div className="animate-card-in" style={{ animationDelay: "200ms" }}>
                <StandardCard
                  interactive
                  onClick={() => navigate({ to: "/m/$module", params: { module: "viajes" } })}
                  icon={Plane}
                  title="Viajes"
                  subtitle={
                    nextTripQ.data
                      ? `${nextTripQ.data.destination ?? nextTripQ.data.title} · ${formatDateTime(nextTripQ.data.departure_at)}`
                      : "Sin viajes próximos"
                  }
                >
                  {nextTripQ.data ? (
                    <span className="text-foreground">Estás convocado a este viaje.</span>
                  ) : (
                    "Traslados, hospedaje y logística del equipo."
                  )}
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
