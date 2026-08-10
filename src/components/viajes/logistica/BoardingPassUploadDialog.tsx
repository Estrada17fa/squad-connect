import * as React from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import type { TripFlight } from "@/hooks/useTripFlights";
import { useBoardingPassMutations } from "@/hooks/useTripBoardingPasses";

const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  flight: TripFlight;
  defaultUserId?: string | null;
}

/** Carga manual de un pase de abordar y su asignación a una persona. */
export function BoardingPassUploadDialog({ open, onOpenChange, tripId, flight, defaultUserId }: Props) {
  const { upload } = useBoardingPassMutations(tripId);
  const [file, setFile] = React.useState<File | null>(null);
  const [assignee, setAssignee] = React.useState<string>(defaultUserId ?? NONE);
  const [seat, setSeat] = React.useState("");
  const [group, setGroup] = React.useState("");
  const [terminal, setTerminal] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setFile(null);
    setAssignee(defaultUserId ?? NONE);
    setSeat("");
    setGroup("");
    setTerminal("");
    setNotes("");
  }, [open, defaultUserId]);

  const passengers: { user_id: string; profile: MiniProfile | null }[] = flight.passengers.map((p) => ({
    user_id: p.user_id,
    profile: p.profile,
  }));

  const submit = () => {
    if (!file) return toast.error("Selecciona el archivo del pase");
    upload.mutate(
      {
        flightId: flight.id,
        file,
        input: {
          user_id: assignee === NONE ? null : assignee,
          seat: seat.trim() || null,
          boarding_group: group.trim() || null,
          terminal: terminal.trim() || null,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Pase de abordar cargado");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo subir el pase"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>Agregar pase de abordar</EntitySheetTitle>
        <EntitySheetDescription>
          {flight.flight_code} · {flight.origin} → {flight.destination}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="bp-file">Archivo (PDF o imagen)</Label>
          <Input
            id="bp-file"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Persona</Label>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin asignar</SelectItem>
              {passengers.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {personLabel(p.profile)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {passengers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Este vuelo aún no tiene pasajeros. Puedes cargar el pase y asignarlo después.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="bp-seat">Asiento (opcional)</Label>
            <Input id="bp-seat" value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="14A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-group">Grupo de abordar (opcional)</Label>
            <Input id="bp-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="B" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-terminal">Terminal / puerta (opcional)</Label>
            <Input id="bp-terminal" value={terminal} onChange={(e) => setTerminal(e.target.value)} placeholder="T2 · A15" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-notes">Notas (opcional)</Label>
            <Input id="bp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={upload.isPending} onClick={submit}>
          <Upload className="mr-2 h-4 w-4" /> {upload.isPending ? "Subiendo…" : "Cargar pase"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
