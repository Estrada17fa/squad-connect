import * as React from "react";
import { CalendarDays, Layers, Pencil, Plus, Shield, Star, Trophy } from "lucide-react";
import {
  DetailField,
  DetailGrid,
  DetailSection,
  DetailSheet,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { DeleteAction } from "@/components/squad/DeleteAction";
import {
  useCrestUrl,
  useDeleteTournament,
  useTournamentTeams,
  type TournamentRow,
  type TournamentTeamRow,
} from "@/hooks/useTournaments";
import {
  TIEBREAKER_LABEL,
  TOURNAMENT_STATUS_LABEL,
  TOURNAMENT_TYPE_LABEL,
  pointsSummary,
} from "@/lib/torneo";
import { TournamentTeamFormDialog } from "@/components/admin/TournamentTeamFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tournament: TournamentRow | null;
  canEdit: boolean;
  clubId: string;
  /** Abre el formulario del torneo (se gestiona en la página). */
  onEdit: () => void;
  onDeleted?: () => void;
}

export function TournamentDetailSheet({
  open,
  onOpenChange,
  tournament,
  canEdit,
  clubId,
  onEdit,
  onDeleted,
}: Props) {
  const teamsQ = useTournamentTeams(open && tournament ? tournament.id : null);
  const del = useDeleteTournament();
  const [teamForm, setTeamForm] = React.useState<{ open: boolean; row: TournamentTeamRow | null }>({
    open: false,
    row: null,
  });

  if (!tournament) return null;

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        size="xl"
        title={tournament.name}
        description={[
          TOURNAMENT_TYPE_LABEL[tournament.type],
          tournament.season,
          tournament.team_name,
        ]
          .filter(Boolean)
          .join(" · ")}
        headerActions={
          canEdit ? (
            <>
              <Button size="sm" variant="secondary" onClick={onEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar torneo
              </Button>
              <DeleteAction
                label="Eliminar torneo"
                title="Eliminar torneo"
                description="Se eliminarán también sus equipos participantes."
                successMessage="Torneo eliminado"
                loading={del.isPending}
                onDelete={() => del.mutateAsync(tournament)}
                onDeleted={() => {
                  onOpenChange(false);
                  onDeleted?.();
                }}
              />
            </>
          ) : null
        }
      >
        <Tabs defaultValue="general">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="partidos">Partidos</TabsTrigger>
            <TabsTrigger value="posiciones">Posiciones</TabsTrigger>
            <TabsTrigger value="goleo">Goleo</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 pt-4">
        <DetailSection title="Resumen">
          <DetailGrid>
            <DetailField label="Estado" icon={Trophy}>
              <StatusBadge variant={tournament.status === "en_curso" ? "approved" : "neutral"}>
                {TOURNAMENT_STATUS_LABEL[tournament.status]}
              </StatusBadge>
            </DetailField>
            <DetailField label="Tipo" icon={Layers}>
              <DetailValue value={TOURNAMENT_TYPE_LABEL[tournament.type]} />
            </DetailField>
            <DetailField label="Temporada" icon={CalendarDays}>
              <DetailValue value={tournament.season} />
            </DetailField>
            <DetailField label="Categoría" icon={Shield}>
              <DetailValue value={tournament.team_name} />
            </DetailField>
            <DetailField label="Notas" full>
              <DetailValue value={tournament.notes} />
            </DetailField>
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Sistema de puntos">
          <ul className="space-y-1.5 text-sm">
            {pointsSummary(tournament).map((line) => (
              <li
                key={line}
                className="rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-inset ring-white/5"
              >
                {line}
              </li>
            ))}
          </ul>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Desempate
            </p>
            <ol className="space-y-1 text-sm text-muted-foreground">
              {tournament.tiebreakers.map((k, i) => (
                <li key={k}>
                  {i + 1}. {TIEBREAKER_LABEL[k]}
                </li>
              ))}
            </ol>
          </div>
        </DetailSection>

        <DetailSection title={`Equipos participantes (${teamsQ.data?.length ?? 0})`}>
          {canEdit ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTeamForm({ open: true, row: null })}
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> Agregar equipo
            </Button>
          ) : null}
          {teamsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando equipos…</p>
          ) : (teamsQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay equipos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {(teamsQ.data ?? []).map((t) => (
                <li key={t.id}>
                  <TeamRow
                    team={t}
                    canEdit={canEdit}
                    onEdit={() => setTeamForm({ open: true, row: t })}
                  />
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
          </TabsContent>

          <TabsContent value="partidos" className="pt-4">
            <MatchList
              tournamentId={tournament.id}
              clubId={clubId}
              userId={userId}
              teamId={tournament.team_id}
              config={tournament}
              teams={teamsQ.data ?? []}
              matches={matchesQ.data ?? []}
              canEdit={canEdit}
              loading={matchesQ.isLoading}
            />
          </TabsContent>

          <TabsContent value="posiciones" className="pt-4">
            <StandingsTable
              tournamentId={tournament.id}
              clubId={clubId}
              userId={userId}
              config={tournament}
              teams={teamsQ.data ?? []}
              matches={matchesQ.data ?? []}
              canEdit={canEdit}
            />
          </TabsContent>

          <TabsContent value="goleo" className="pt-4">
            <ScorersTable
              tournamentId={tournament.id}
              clubId={clubId}
              teamId={tournament.team_id}
              teams={teamsQ.data ?? []}
            />
          </TabsContent>
        </Tabs>

      <TournamentTeamFormDialog
        open={teamForm.open}
        onOpenChange={(v) => setTeamForm((s) => ({ ...s, open: v }))}
        clubId={clubId}
        tournamentId={tournament.id}
        team={teamForm.row}
      />
    </>
  );
}

function TeamRow({
  team,
  canEdit,
  onEdit,
}: {
  team: TournamentTeamRow;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const { data: crest } = useCrestUrl(team.crest_path);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-inset ring-white/5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/5">
        {crest ? (
          <img src={crest} alt={`Escudo de ${team.name}`} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <Shield className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{team.name}</p>
        {team.short_name ? (
          <p className="truncate text-xs text-muted-foreground">{team.short_name}</p>
        ) : null}
      </div>
      {team.is_our_team ? (
        <StatusBadge variant="info">
          <Star className="mr-1 h-3 w-3" /> Nuestro
        </StatusBadge>
      ) : null}
      {canEdit ? (
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Editar
        </Button>
      ) : null}
    </div>
  );
}
