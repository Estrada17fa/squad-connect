import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HeartPulse, TrendingUp, Apple } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { usePlayer } from "@/hooks/usePlayers";
import { AVAILABILITY_META } from "@/lib/plantel";
import { PlayerMedicalSheet } from "@/components/salud/PlayerMedicalSheet";
import { PlayerDevelopmentSheet } from "@/components/desarrollo/PlayerDevelopmentSheet";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/m/plantel/$playerId")({
  head: () => ({
    meta: [
      { title: "Squad — Jugador" },
      { name: "description", content: "Ficha del jugador." },
    ],
  }),
  component: PlayerDetail,
  notFoundComponent: () => <EmptyState title="Jugador no encontrado" />,
});

function PlayerDetail() {
  const { playerId } = Route.useParams();
  const { user } = useApp();
  const { canEditTeam } = useTeamAccess("plantel");
  const { canEditTeam: canEditSalud, canReadTeam: canReadSalud } = useTeamAccess("salud");
  const { canEditTeam: canEditDesarrollo } = useTeamAccess("desarrollo");

  const { data: player, isLoading } = usePlayer(playerId);
  // Permiso por equipo: editor en Sub-20 no puede editar fichas de Primera.
  const canEdit = canEditTeam(player?.team_id);
  const [healthOpen, setHealthOpen] = React.useState(false);
  const [devOpen, setDevOpen] = React.useState(false);
  const [clubId, setClubId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!player?.team_id) return;
    supabase.from("teams").select("club_id").eq("id", player.team_id).maybeSingle()
      .then(({ data }) => setClubId(data?.club_id ?? null));
  }, [player?.team_id]);

  if (isLoading) return <LoadingState />;
  if (!player) return <EmptyState title="Jugador no encontrado" />;

  const meta = AVAILABILITY_META[player.availability_status];
  const isSelf = player.user_id === user.id;
  const showFull = canEdit || isSelf;
  // Privacidad: el expediente médico solo lo abre el cuerpo médico del equipo o el propio jugador.
  const canEditHealth = canEditSalud(player.team_id);
  const canSeeHealth = isSelf || canReadSalud(player.team_id);
  // Desarrollo: el lector solo ve lo suyo; ver a otros exige editor en el equipo.
  const canEditDev = canEditDesarrollo(player.team_id);
  const canSeeDev = isSelf || canEditDev;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/m/$module" params={{ module: "plantel" }}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Plantel
          </Link>
        </Button>
        <PageHeader
          title={player.profile?.full_name ?? "Jugador"}
          subtitle={player.position ?? "Sin posición"}
        />
      </div>

      <div className="glass flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20">
          <AvatarImage src={player.profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl">
            {(player.profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            {player.jersey_number != null ? (
              <span className="font-display text-3xl font-bold text-primary">#{player.jersey_number}</span>
            ) : null}
            <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
          </div>
          {showFull ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <Info label="Posición" value={player.position} />
              <Info label="Nacimiento" value={player.birthdate} />
              <Info label="Altura" value={player.height_cm ? `${player.height_cm} cm` : null} />
              <Info label="Peso" value={player.weight_kg ? `${player.weight_kg} kg` : null} />
            </dl>
          ) : null}
        </div>
      </div>

      {showFull && player.notes ? (
        <div className="glass p-5">
          <h3 className="mb-1 font-display font-semibold text-foreground">Notas</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{player.notes}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {canSeeHealth ? (
          <button
            type="button"
            onClick={() => setHealthOpen(true)}
            className="glass flex flex-col items-center justify-center gap-2 p-6 text-center transition-all hover:border-white/15 hover:bg-white/[0.06]"
          >
            <HeartPulse className="h-6 w-6 text-primary" />
            <span className="font-display font-semibold text-foreground">Salud</span>
            <span className="text-xs text-muted-foreground">
              {isSelf && !canEditHealth ? "Tu expediente médico" : "Expediente médico del jugador"}
            </span>
          </button>
        ) : (
          <EmptyState icon={HeartPulse} title="Salud" message="Información médica privada." />
        )}
        {canSeeDev ? (
          <button
            type="button"
            onClick={() => setDevOpen(true)}
            className="glass flex flex-col items-center justify-center gap-2 p-6 text-center transition-all hover:border-white/15 hover:bg-white/[0.06]"
          >
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-display font-semibold text-foreground">Desarrollo</span>
            <span className="text-xs text-muted-foreground">
              {isSelf && !canEditDev ? "Tu progreso" : "Progreso del jugador"}
            </span>
          </button>
        ) : (
          <EmptyState icon={TrendingUp} title="Desarrollo" message="Información privada del jugador." />
        )}
        <EmptyState icon={Apple} title="Nutrición" message="Se conecta desde el módulo de Nutrición." />
      </div>

      {clubId ? (
        <PlayerMedicalSheet
          open={healthOpen}
          onOpenChange={setHealthOpen}
          clubId={clubId}
          player={{
            userId: player.user_id,
            teamId: player.team_id,
            fullName: player.profile?.full_name ?? null,
            avatarUrl: player.profile?.avatar_url ?? null,
          }}
          canEdit={canEditHealth}
        />
      ) : null}

      <PlayerDevelopmentSheet
        open={devOpen}
        onOpenChange={setDevOpen}
        clubId={clubId}
        player={{
          userId: player.user_id,
          fullName: player.profile?.full_name ?? null,
          avatarUrl: player.profile?.avatar_url ?? null,
        }}
        isSelf={isSelf}
      />

    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value ?? "—"}</dd>
    </>
  );
}
