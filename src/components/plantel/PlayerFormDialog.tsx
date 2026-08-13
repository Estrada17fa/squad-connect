import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { TeamSelectField } from "@/components/squad/TeamSelectField";
import type { TeamOption } from "@/hooks/useAccess";
import type { PlayerRow, AvailabilityStatus } from "@/hooks/usePlayers";

const AVAILABILITY: { value: AvailabilityStatus; label: string }[] = [
  { value: "apto", label: "Apto" },
  { value: "lesionado", label: "Lesionado" },
  { value: "en_duda", label: "En duda" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  teamId: string;
  player?: PlayerRow | null;
  /** Equipos donde el usuario puede crear (solo alta). Con uno solo se fija. */
  teams?: TeamOption[];
}

export function PlayerFormDialog({ open, onOpenChange, clubId, teamId: teamIdProp, player, teams }: Props) {
  const isEdit = !!player;
  const qc = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>(teamIdProp);
  React.useEffect(() => {
    if (open) setSelectedTeamId(player?.team_id ?? teamIdProp);
  }, [open, player, teamIdProp]);
  const teamId = isEdit ? player!.team_id : selectedTeamId;
  // Guard defensivo: la UI ya filtra, pero nunca permitimos guardar en un
  // equipo donde el nivel del módulo no llega a editor.
  const { canEditTeam } = useTeamAccess("plantel");
  const canWrite = canEditTeam(teamId);

  const [userId, setUserId] = React.useState<string>(player?.user_id ?? "");
  const [position, setPosition] = React.useState(player?.position ?? "");
  const [jerseyNumber, setJerseyNumber] = React.useState<string>(
    player?.jersey_number != null ? String(player.jersey_number) : "",
  );
  const [birthdate, setBirthdate] = React.useState(player?.birthdate ?? "");
  const [availability, setAvailability] = React.useState<AvailabilityStatus>(player?.availability_status ?? "apto");
  const [notes, setNotes] = React.useState(player?.notes ?? "");

  React.useEffect(() => {
    if (!open) return;
    setUserId(player?.user_id ?? "");
    setPosition(player?.position ?? "");
    setJerseyNumber(player?.jersey_number != null ? String(player.jersey_number) : "");
    setBirthdate(player?.birthdate ?? "");
    setAvailability(player?.availability_status ?? "apto");
    setNotes(player?.notes ?? "");
  }, [open, player]);

  const membersQ = useTeamMembers(teamId, clubId);
  const existingQ = useQuery({
    queryKey: ["players", teamId, "ids"],
    enabled: open && !isEdit && !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase.from("player_profiles").select("user_id").eq("team_id", teamId);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.user_id));
    },
  });

  const eligible = (membersQ.data ?? []).filter((m) => isEdit || !existingQ.data?.has(m.id));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Selecciona un miembro");
      const payload = {
        user_id: userId,
        team_id: teamId,
        position: position.trim() || null,
        jersey_number: jerseyNumber ? Number(jerseyNumber) : null,
        birthdate: birthdate || null,
        availability_status: availability,
        notes: notes.trim() || null,
      };
      if (isEdit && player) {
        const { error } = await supabase.from("player_profiles").update(payload).eq("id", player.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("player_profiles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Jugador actualizado" : "Jugador agregado");
      qc.invalidateQueries({ queryKey: ["players", teamId] });
      qc.invalidateQueries({ queryKey: ["roster"] });
      if (player) qc.invalidateQueries({ queryKey: ["player", player.id] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!player) return;
      const { error } = await supabase.from("player_profiles").delete().eq("id", player.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jugador eliminado del plantel");
      qc.invalidateQueries({ queryKey: ["players", teamId] });
      qc.invalidateQueries({ queryKey: ["roster"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar jugador" : "Agregar jugador"}</EntitySheetTitle>
        <EntitySheetDescription>
          {isEdit ? "Actualiza los datos del jugador." : "Selecciona un miembro y define sus datos."}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {!isEdit && teams && teams.length > 0 ? (
          <TeamSelectField
            teams={teams}
            value={selectedTeamId || null}
            onChange={setSelectedTeamId}
          />
        ) : null}
        {!isEdit ? (
          <div className="space-y-1.5">
            <Label>Miembro</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un miembro" /></SelectTrigger>
              <SelectContent>
                {eligible.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Sin miembros disponibles</div>
                ) : (
                  eligible.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pos">Posición</Label>
            <Input id="pos" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="p.ej. Delantero" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dorsal">Dorsal</Label>
            <Input id="dorsal" type="number" inputMode="numeric" value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bd">Nacimiento</Label>
          <Input id="bd" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            El peso y la talla se registran en el estudio antropométrico de Nutrición.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Disponibilidad</Label>
          <Select value={availability} onValueChange={(v) => setAvailability(v as AvailabilityStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AVAILABILITY.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending || !canWrite}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Quitar
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !canWrite}>
          {isEdit ? "Guardar" : "Agregar"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
