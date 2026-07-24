import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers } from "@/hooks/useTeamMembers";
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
}

export function PlayerFormDialog({ open, onOpenChange, clubId, teamId, player }: Props) {
  const isEdit = !!player;
  const qc = useQueryClient();

  const [userId, setUserId] = React.useState<string>(player?.user_id ?? "");
  const [position, setPosition] = React.useState(player?.position ?? "");
  const [jerseyNumber, setJerseyNumber] = React.useState<string>(
    player?.jersey_number != null ? String(player.jersey_number) : "",
  );
  const [birthdate, setBirthdate] = React.useState(player?.birthdate ?? "");
  const [heightCm, setHeightCm] = React.useState<string>(player?.height_cm != null ? String(player.height_cm) : "");
  const [weightKg, setWeightKg] = React.useState<string>(player?.weight_kg != null ? String(player.weight_kg) : "");
  const [availability, setAvailability] = React.useState<AvailabilityStatus>(player?.availability_status ?? "apto");
  const [notes, setNotes] = React.useState(player?.notes ?? "");

  React.useEffect(() => {
    if (!open) return;
    setUserId(player?.user_id ?? "");
    setPosition(player?.position ?? "");
    setJerseyNumber(player?.jersey_number != null ? String(player.jersey_number) : "");
    setBirthdate(player?.birthdate ?? "");
    setHeightCm(player?.height_cm != null ? String(player.height_cm) : "");
    setWeightKg(player?.weight_kg != null ? String(player.weight_kg) : "");
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

  const eligible = (membersQ.data ?? []).filter(
    (m) => isEdit || !existingQ.data?.has(m.id),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Selecciona un miembro");
      const payload = {
        user_id: userId,
        team_id: teamId,
        position: position.trim() || null,
        jersey_number: jerseyNumber ? Number(jerseyNumber) : null,
        birthdate: birthdate || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
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
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? "Editar jugador" : "Agregar jugador"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Actualiza los datos del jugador." : "Selecciona un miembro y define sus datos."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bd">Nacimiento</Label>
              <Input id="bd" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="h">Altura (cm)</Label>
              <Input id="h" type="number" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w">Peso (kg)</Label>
              <Input id="w" type="number" inputMode="numeric" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </div>
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
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Quitar
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {isEdit ? "Guardar" : "Agregar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
