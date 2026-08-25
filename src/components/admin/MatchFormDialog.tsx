import * as React from "react";
import { toast } from "sonner";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/calendar/LocationPicker";
import { AttendeePicker } from "@/components/calendar/AttendeePicker";
import { syncEventAttendees } from "@/lib/calendarEvents";
import { supabase } from "@/integrations/supabase/client";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/calendar-utils";
import { useSaveMatch, type MatchRow } from "@/hooks/useTournamentMatches";
import type { TournamentTeamRow } from "@/hooks/useTournaments";
import { MATCH_STATUS_LABEL, type MatchStatus } from "@/lib/torneo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  tournamentId: string;
  /** Categoría del torneo, para la convocatoria. */
  teamId?: string | null;
  teams: TournamentTeamRow[];
  match?: MatchRow | null;
}

export function MatchFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  tournamentId,
  teamId = null,
  teams,
  match,
}: Props) {
  const isEdit = !!match;
  const save = useSaveMatch();

  const [matchday, setMatchday] = React.useState("");
  const [homeId, setHomeId] = React.useState("");
  const [awayId, setAwayId] = React.useState("");
  const [kickoff, setKickoff] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<MatchStatus>("programado");
  const [notes, setNotes] = React.useState("");
  const [attendees, setAttendees] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) return;
    setMatchday(match?.matchday != null ? String(match.matchday) : "");
    setHomeId(match?.home_team_id ?? "");
    setAwayId(match?.away_team_id ?? "");
    setKickoff(toLocalInputValue(match?.kickoff_at));
    setVenue(match?.venue ?? "");
    setLocationId(match?.location_id ?? null);
    setStatus((match?.status as MatchStatus) ?? "programado");
    setNotes(match?.notes ?? "");
    setAttendees(new Set());
    const eventId = match?.calendar_event_id;
    if (eventId) {
      void (async () => {
        const { data } = await (supabase as any)
          .from("event_attendees")
          .select("user_id")
          .eq("event_id", eventId);
        setAttendees(new Set((data ?? []).map((r: any) => r.user_id as string)));
      })();
    }
  }, [open, match]);

  async function handleSave() {
    if (!homeId || !awayId) return toast.error("Elige el equipo local y el visitante");
    if (homeId === awayId) return toast.error("Un equipo no puede enfrentarse a sí mismo");
    try {
      await save.mutateAsync({
        id: match?.id,
        tournament_id: tournamentId,
        club_id: clubId,
        matchday: matchday.trim() ? Number(matchday) : null,
        home_team_id: homeId,
        away_team_id: awayId,
        kickoff_at: kickoff ? fromLocalInputValue(kickoff) : null,
        location_id: locationId,
        venue: venue.trim() || null,
        status,
        notes: notes.trim() || null,
        created_by: userId,
      });
      if (teamId && match?.id) {
        const { data: row } = await (supabase as any)
          .from("tournament_matches")
          .select("calendar_event_id")
          .eq("id", match.id)
          .maybeSingle();
        const eventId = row?.calendar_event_id ?? null;
        if (eventId) await syncEventAttendees(eventId, [...attendees]);
      }
      toast.success(isEdit ? "Partido actualizado" : "Partido creado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el partido");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar partido" : "Nuevo partido"}</EntitySheetTitle>
        <EntitySheetDescription>
          Jornada, equipos, fecha y sede del encuentro.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tm-jornada">Jornada</Label>
            <Input
              id="tm-jornada"
              type="number"
              min={1}
              value={matchday}
              onChange={(e) => setMatchday(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MatchStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MATCH_STATUS_LABEL) as MatchStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {MATCH_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Local</Label>
            <TeamSelect teams={teams} value={homeId} onChange={setHomeId} exclude={awayId} />
          </div>
          <div className="space-y-1.5">
            <Label>Visitante</Label>
            <TeamSelect teams={teams} value={awayId} onChange={setAwayId} exclude={homeId} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tm-kickoff">Fecha y hora</Label>
          <Input
            id="tm-kickoff"
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
          />
          {!kickoff ? (
            <p className="text-xs text-muted-foreground">
              Sin fecha y hora el partido no aparece en la Agenda.
            </p>
          ) : null}
        </div>

        <LocationPicker
          clubId={clubId}
          userId={userId}
          value={venue}
          onChange={setVenue}
          locationId={locationId}
          onLocationIdChange={setLocationId}
          label="Sede"
          placeholder="Estadio o cancha"
        />

        {teamId && isEdit ? (
          <AttendeePicker
            clubId={clubId}
            teamId={teamId}
            value={attendees}
            onChange={setAttendees}
            label="Convocatoria"
          />
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="tm-notes">Notas</Label>
          <Textarea
            id="tm-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

export function TeamSelect({
  teams,
  value,
  onChange,
  exclude,
  placeholder = "Elige equipo",
}: {
  teams: TournamentTeamRow[];
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {teams
          .filter((t) => t.id !== exclude)
          .map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
              {t.is_our_team ? " (nuestro)" : ""}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
