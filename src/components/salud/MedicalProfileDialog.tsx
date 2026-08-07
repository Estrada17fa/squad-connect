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
import { useSaveMedicalProfile, type MedicalProfileRow } from "@/hooks/useHealth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  teamId: string;
  playerUserId: string;
  profile: MedicalProfileRow | null;
}

export function MedicalProfileDialog({ open, onOpenChange, clubId, teamId, playerUserId, profile }: Props) {
  const save = useSaveMedicalProfile(clubId);
  const [bloodType, setBloodType] = React.useState("");
  const [allergies, setAllergies] = React.useState("");
  const [chronic, setChronic] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setBloodType(profile?.blood_type ?? "");
    setAllergies(profile?.allergies ?? "");
    setChronic(profile?.chronic_conditions ?? "");
    setContactName(profile?.emergency_contact_name ?? "");
    setContactPhone(profile?.emergency_contact_phone ?? "");
    setNotes(profile?.notes ?? "");
  }, [open, profile]);

  const submit = async () => {
    try {
      await save.mutateAsync({
        ...(profile?.id ? { id: profile.id } : {}),
        player_user_id: playerUserId,
        team_id: teamId,
        blood_type: bloodType.trim() || null,
        allergies: allergies.trim() || null,
        chronic_conditions: chronic.trim() || null,
        emergency_contact_name: contactName.trim() || null,
        emergency_contact_phone: contactPhone.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Ficha médica guardada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la ficha");
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>Datos médicos base</EntitySheetTitle>
        <EntitySheetDescription>Información útil en urgencias y viajes.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="mp-blood">Tipo de sangre</Label>
          <Input id="mp-blood" value={bloodType} onChange={(e) => setBloodType(e.target.value)} placeholder="O+" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mp-allergies">Alergias</Label>
          <Textarea id="mp-allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mp-chronic">Padecimientos crónicos</Label>
          <Textarea id="mp-chronic" value={chronic} onChange={(e) => setChronic(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="mp-cname">Contacto de emergencia</Label>
            <Input id="mp-cname" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-cphone">Teléfono</Label>
            <Input id="mp-cphone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mp-notes">Notas</Label>
          <Textarea id="mp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
