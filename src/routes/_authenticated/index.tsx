import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/components/squad/AppLayout";
import { useUpcomingEvents, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EventDetailSheet } from "@/components/calendar/EventDetailSheet";
import { EmptyState } from "@/components/squad/EmptyState";
import { GreetingBlock } from "@/components/home/GreetingBlock";
import { NextMatchHero } from "@/components/home/NextMatchHero";
import { UpcomingList } from "@/components/home/UpcomingList";
import { TournamentStandingBlock } from "@/components/home/TournamentStandingBlock";
import { AnnouncementsBlock } from "@/components/home/AnnouncementsBlock";
import { useClubTournamentSummary } from "@/hooks/useClubNextMatch";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Squad — Inicio" },
      {
        name: "description",
        content:
          "Resumen del club: próximo partido, tus eventos, posición en el torneo y comunicados recientes.",
      },
      { property: "og:title", content: "Squad — Inicio" },
      {
        property: "og:description",
        content: "El próximo partido del club, tus eventos y los comunicados, en una pantalla.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

/**
 * Inicio: resumen general del club (partido, torneo, comunicados) más los
 * eventos propios de la persona. Solo lectura y sin lógica de permisos nueva:
 * cada bloque lee de hooks que ya filtran (RLS de `calendar_events`, resumen
 * de torneo con `canReadTeam`, RLS de comunicados). Los bloques de partido,
 * torneo y comunicados se ocultan cuando no hay contenido.
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

  const { tournament, teams, ourTeam, nextMatch, standing, groupLabel } =
    useClubTournamentSummary();

  const teamName = React.useCallback(
    (id: string | null) => teamOptions.find((t) => t.id === id)?.name ?? null,
    [teamOptions],
  );

  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || null;

  return (
    <div className="space-y-7">
      <GreetingBlock name={firstName} />

      {accessibleModules.length === 0 ? (
        <EmptyState
          title="Sin módulos disponibles"
          message="Tu rol actual no tiene acceso a ningún módulo. Contacta al administrador de tu club."
        />
      ) : (
        <>
          {nextMatch && ourTeam ? (
            <NextMatchHero match={nextMatch} teams={teams} ourTeam={ourTeam} />
          ) : null}

          <UpcomingList
            events={list}
            teamName={teamName}
            onOpen={setDetailEvent}
            onSeeAgenda={
              hasAgenda
                ? () => navigate({ to: "/m/$module", params: { module: agendaTarget } })
                : undefined
            }
          />

          {tournament && standing ? (
            <TournamentStandingBlock
              tournament={tournament}
              standing={standing}
              groupLabel={groupLabel}
            />
          ) : null}

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
