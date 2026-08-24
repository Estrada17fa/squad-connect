import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/components/squad/AppLayout";
import { useUpcomingEvents, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EventDetailSheet } from "@/components/calendar/EventDetailSheet";
import { EmptyState } from "@/components/squad/EmptyState";
import { NextEventHero } from "@/components/home/NextEventHero";
import { UpcomingList } from "@/components/home/UpcomingList";
import { TodoBlock } from "@/components/home/TodoBlock";
import { AnnouncementsBlock } from "@/components/home/AnnouncementsBlock";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Squad — Inicio" },
      {
        name: "description",
        content: "Tu resumen del día: próximo evento, pendientes por atender y comunicados del club.",
      },
      { property: "og:title", content: "Squad — Inicio" },
      {
        property: "og:description",
        content: "Qué tienes hoy y qué debes atender, en una sola pantalla.",
      },
    ],
  }),
  component: Home,
});

/**
 * Inicio: un solo esqueleto de bloques, rellenado con lo que cada persona
 * puede ver. Solo lectura: para actuar, cada bloque lleva a su módulo.
 *
 * Ningún bloque implementa permisos propios — todos leen de los hooks que ya
 * filtran (RLS de `calendar_events`, aprobadores efectivos, asignaciones,
 * RLS de comunicados). Para crecer, basta añadir otro bloque a la lista.
 */
function Home() {
  const navigate = useNavigate();
  const { user, profile, accessibleModules, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;

  const [detailEvent, setDetailEvent] = React.useState<CalendarEventRow | null>(null);

  const hasAgenda = accessibleModules.includes("agenda") || accessibleModules.includes("mes");
  const agendaTarget: "agenda" | "mes" = accessibleModules.includes("agenda") ? "agenda" : "mes";

  const { data: events } = useUpcomingEvents(clubId, 4);
  const list = events ?? [];
  const next = list[0] ?? null;
  const rest = list.slice(1);

  const teamName = React.useCallback(
    (id: string | null) => teamOptions.find((t) => t.id === id)?.name ?? null,
    [teamOptions],
  );

  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || null;

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {firstName ? `Hola, ${firstName}` : "Hola"}
        </h1>
        <p className="text-sm text-muted-foreground">Esto es lo que sigue</p>
      </header>

      {accessibleModules.length === 0 ? (
        <EmptyState
          title="Sin módulos disponibles"
          message="Tu rol actual no tiene acceso a ningún módulo. Contacta al administrador de tu club."
        />
      ) : (
        <>
          <NextEventHero
            event={next}
            teamLabel={next ? teamName(next.team_id) : null}
            onOpen={setDetailEvent}
          />

          <UpcomingList
            events={rest}
            teamName={teamName}
            onOpen={setDetailEvent}
            onSeeAgenda={
              hasAgenda
                ? () => navigate({ to: "/m/$module", params: { module: agendaTarget } })
                : undefined
            }
          />

          <TodoBlock />

          <AnnouncementsBlock />
        </>
      )}

      <EventDetailSheet
        open={!!detailEvent}
        onOpenChange={(v) => !v && setDetailEvent(null)}
        event={detailEvent}
        canEdit={false}
        clubId={clubId}
        userId={user.id}
        teams={[]}
        teamName={teamName}
      />
    </div>
  );
}
