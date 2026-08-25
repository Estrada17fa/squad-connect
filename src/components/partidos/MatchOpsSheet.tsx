import * as React from "react";
import { toast } from "sonner";
import { CalendarDays, ClipboardList, Clock, FileText, MapPin, Shirt, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DetailBadge,
  DetailEmptyBlock,
  DetailField,
  DetailGrid,
  DetailSection,
  DetailSheet,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { EntitySheetBody, EntitySheetFooter } from "@/components/squad/EntitySheet";
import { LocationDisplay } from "@/components/calendar/LocationDisplay";
import { LocationPicker } from "@/components/calendar/LocationPicker";
import { TeamCrest } from "@/components/torneo/TeamCrest";
import { CallupList } from "./CallupList";
import { CallupPicker } from "./CallupPicker";
import { formatMatchWhen } from "./MatchOpsCard";
import { usePlayers } from "@/hooks/usePlayers";
import {
  useSaveCallups,
  useSaveMatchLogistics,
  type CallupRow,
  type MatchLogisticsRow,
  type OurMatch,
} from "@/hooks/useMatchOps";
import { MATCH_STATUS_LABEL } from "@/lib/torneo";
import { matchAccent } from "@/lib/accents";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: OurMatch | null;
  callups: CallupRow[];
  logistics: MatchLogisticsRow | null;
  clubId: string | null | undefined;
  userId: string;
  canEdit: boolean;
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Ficha operativa del partido: info leída del torneo + convocatoria, logística y notas. */
export function MatchOpsSheet({
  open,
  onOpenChange,
  match,
  callups,
  logistics,
  clubId,
  userId,
  canEdit,
}: Props) {
  if (!match) return null;
  const played = match.status === "jugado" && match.home_goals != null && match.away_goals != null;
  const ourGoals = match.isHome ? match.home_goals : match.away_goals;
  const rivalGoals = match.isHome ? match.away_goals : match.home_goals;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`vs ${match.rival?.name ?? "Rival por definir"}`}
      icon={Trophy}
      accent={matchAccent(match.status)}
      description={`${match.tournament_name}${match.matchday != null ? ` · Jornada ${match.matchday}` : ""}`}
      canEdit={canEdit && !!clubId}
      editLabel="Gestionar"
      badges={
        <>
          <DetailBadge color={matchAccent(match.status)}>{MATCH_STATUS_LABEL[match.status]}</DetailBadge>
          <DetailBadge>{match.isHome ? "Local" : "Visitante"}</DetailBadge>
          {match.matchday != null ? <DetailBadge>{`Jornada ${match.matchday}`}</DetailBadge> : null}
        </>
      }
      renderEdit={
        clubId
          ? ({ done }) => (
              <MatchOpsForm
                match={match}
                callups={callups}
                logistics={logistics}
                clubId={clubId}
                userId={userId}
                onDone={done}
              />
            )
          : undefined
      }
    >
      <DetailSection title="Partido" icon={Trophy}>
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <TeamCrest name={match.rival?.name ?? "Rival"} path={match.rival?.crest_path ?? null} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-foreground">
              {match.rival?.name ?? "Rival por definir"}
            </p>
            <p className="text-xs text-muted-foreground">
              {match.isHome ? "Jugamos de local" : "Jugamos de visitante"}
            </p>
          </div>
          {played ? (
            <p className="font-display text-xl font-semibold tabular-nums text-foreground">
              {ourGoals} - {rivalGoals}
            </p>
          ) : null}
        </div>
        <DetailGrid>
          <DetailField label="Fecha y hora" icon={CalendarDays}>
            <DetailValue value={formatMatchWhen(match.kickoff_at) ?? undefined} />
          </DetailField>
          <DetailField label="Torneo" icon={Trophy}>
            <DetailValue value={match.tournament_name} />
          </DetailField>
          <DetailField label="Sede" icon={MapPin} full>
            {match.location_id || match.venue ? (
              <LocationDisplay clubId={clubId} locationId={match.location_id} text={match.venue} />
            ) : (
              <DetailValue value={null} />
            )}
          </DetailField>
        </DetailGrid>
      </DetailSection>

      <DetailSection title={`Convocatoria (${callups.length})`} icon={Users}>
        {callups.length === 0 ? (
          <DetailEmptyBlock icon={Users}>Sin convocatoria publicada.</DetailEmptyBlock>
        ) : (
          <CallupList callups={callups} highlightUserId={userId} />
        )}
      </DetailSection>

      <DetailSection title="Logística" icon={ClipboardList}>
        <DetailGrid>
          <DetailField label="Citación" icon={Clock}>
            <DetailValue value={formatMatchWhen(logistics?.call_time_at ?? null) ?? undefined} />
          </DetailField>
          <DetailField label="Uniforme" icon={Shirt}>
            <DetailValue value={logistics?.kit} />
          </DetailField>
          <DetailField label="Punto de reunión" icon={MapPin} full>
            {logistics?.meeting_location_id || logistics?.meeting_point ? (
              <LocationDisplay
                clubId={clubId}
                locationId={logistics?.meeting_location_id ?? null}
                text={logistics?.meeting_point ?? null}
              />
            ) : (
              <DetailValue value={null} />
            )}
          </DetailField>
          <DetailField label="Notas de logística" icon={ClipboardList} full>
            <DetailValue value={logistics?.logistics_notes} />
          </DetailField>
        </DetailGrid>
      </DetailSection>

      {played || logistics?.post_match_notes ? (
        <DetailSection title="Notas post-partido" icon={FileText}>
          {logistics?.post_match_notes ? (
            <DetailValue value={logistics.post_match_notes} />
          ) : (
            <DetailEmptyBlock icon={FileText}>Sin notas del partido.</DetailEmptyBlock>
          )}
        </DetailSection>
      ) : null}
    </DetailSheet>
  );
}

/* ------------------------------------------------------------------ */

function MatchOpsForm({
  match,
  callups,
  logistics,
  clubId,
  userId,
  onDone,
}: {
  match: OurMatch;
  callups: CallupRow[];
  logistics: MatchLogisticsRow | null;
  clubId: string;
  userId: string;
  onDone: () => void;
}) {
  const playersQ = usePlayers(match.tournament_team_id);
  const players = playersQ.data ?? [];

  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(callups.map((c) => c.user_id)),
  );
  const [callTime, setCallTime] = React.useState(toLocalInput(logistics?.call_time_at ?? null));
  const [meetingPoint, setMeetingPoint] = React.useState(logistics?.meeting_point ?? "");
  const [meetingLocationId, setMeetingLocationId] = React.useState<string | null>(
    logistics?.meeting_location_id ?? null,
  );
  const [kit, setKit] = React.useState(logistics?.kit ?? "");
  const [notes, setNotes] = React.useState(logistics?.logistics_notes ?? "");
  const [postNotes, setPostNotes] = React.useState(logistics?.post_match_notes ?? "");

  const saveCallups = useSaveCallups();
  const saveLogistics = useSaveMatchLogistics();
  const saving = saveCallups.isPending || saveLogistics.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const byUser = new Map(players.map((p) => [p.user_id, p.id]));
      await saveCallups.mutateAsync({
        matchId: match.id,
        clubId,
        createdBy: userId,
        players: [...selected].map((id) => ({ userId: id, playerProfileId: byUser.get(id) ?? null })),
        current: callups,
      });
      await saveLogistics.mutateAsync({
        matchId: match.id,
        clubId,
        createdBy: userId,
        call_time_at: callTime ? new Date(callTime).toISOString() : null,
        meeting_location_id: meetingLocationId,
        meeting_point: meetingPoint.trim() || null,
        kit: kit.trim() || null,
        logistics_notes: notes.trim() || null,
        post_match_notes: postNotes.trim() || null,
      });
      toast.success("Partido actualizado");
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar");
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <EntitySheetBody>
        <div className="space-y-5">
          <CallupPicker
            players={players}
            loading={playersQ.isLoading}
            value={selected}
            onChange={setSelected}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="call-time">Hora de citación</Label>
              <Input
                id="call-time"
                type="datetime-local"
                value={callTime}
                onChange={(e) => setCallTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kit">Uniforme</Label>
              <Input
                id="kit"
                value={kit}
                onChange={(e) => setKit(e.target.value)}
                placeholder="Ej. Local blanco"
              />
            </div>
          </div>

          <LocationPicker
            clubId={clubId}
            userId={userId}
            value={meetingPoint}
            onChange={setMeetingPoint}
            locationId={meetingLocationId}
            onLocationIdChange={setMeetingLocationId}
            label="Punto de reunión"
            id="meeting-point"
          />

          <div className="space-y-1.5">
            <Label htmlFor="log-notes">Notas de logística</Label>
            <Textarea
              id="log-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Traslado, comida, documentos…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-notes">Notas post-partido</Label>
            <Textarea
              id="post-notes"
              rows={3}
              value={postNotes}
              onChange={(e) => setPostNotes(e.target.value)}
              placeholder="Observaciones del partido"
            />
          </div>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Users className="mr-2 h-4 w-4" /> Guardar
        </Button>
      </EntitySheetFooter>
    </form>
  );
}
