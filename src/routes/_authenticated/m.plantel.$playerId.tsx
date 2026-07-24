import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HeartPulse, TrendingUp, Apple, Pencil } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/components/squad/AppLayout";
import { usePlayer } from "@/hooks/usePlayers";
import { AVAILABILITY_META } from "./m.plantel";
import { PlayerFormDialog } from "@/components/plantel/PlayerFormDialog";
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
  const { permissions, user, isSuperAdmin } = useApp();
  const canEdit = isSuperAdmin || permissions.plantel === "editor" || permissions.plantel === "approver";
  const { data: player, isLoading } = usePlayer(playerId);
  const [editOpen, setEditOpen] = React.useState(false);
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
          action={
            canEdit ? (
              <Button onClick={() => setEditOpen(true)} variant="secondary">
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            ) : null
          }
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
        <EmptyState icon={HeartPulse} title="Salud" message="Se conecta desde el módulo de Salud." />
        <EmptyState icon={TrendingUp} title="Desarrollo" message="Se conecta desde el módulo de Desarrollo." />
        <EmptyState icon={Apple} title="Nutrición" message="Se conecta desde el módulo de Nutrición." />
      </div>

      {clubId ? (
        <PlayerFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          clubId={clubId}
          teamId={player.team_id}
          player={player}
        />
      ) : null}
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
