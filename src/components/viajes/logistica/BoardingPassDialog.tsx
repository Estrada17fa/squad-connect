import * as React from "react";
import { toast } from "sonner";
import { Download, Trash2, Upload } from "lucide-react";
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
import { openBoardingPass, useBoardingPassMutations } from "@/hooks/useTripBoardingPasses";

const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  flight: TripFlight;
}

/** Gestión de pases de abordar de un vuelo: subir archivo y asignarlo a un pasajero. */
export function BoardingPassDialog({ open, onOpenChange, tripId, flight }: Props) {
  const { upload, update, remove } = useBoardingPassMutations(tripId);
  const [file, setFile] = React.useState<File | null>(null);
  const [assignee, setAssignee] = React.useState<string>(NONE);
  const [seat, setSeat] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setFile(null);
    setAssignee(NONE);
    setSeat("");
  }, [open]);

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
          notes: null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Pase de abordar subido");
          setFile(null);
          setAssignee(NONE);
          setSeat("");
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo subir el pase"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>Pases de abordar</EntitySheetTitle>
        <EntitySheetDescription>
          {flight.flight_code} · {flight.origin} → {flight.destination}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <section className="glass space-y-3 p-4">
          <p className="text-sm font-medium text-foreground">Subir pase</p>

          <div className="space-y-1.5">
            <Label htmlFor="bp-file">Archivo (PDF o imagen)</Label>
            <Input
              id="bp-file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pasajero</Label>
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-seat">Asiento</Label>
              <Input id="bp-seat" value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="14A" />
            </div>
          </div>

          {passengers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Este vuelo aún no tiene pasajeros asignados. Puedes subir el pase y asignarlo después.
            </p>
          ) : null}

          <Button type="button" className="w-full glow-primary" disabled={upload.isPending} onClick={submit}>
            <Upload className="mr-2 h-4 w-4" /> Subir pase
          </Button>
        </section>

        <section className="space-y-2">
          <p className="text-sm font-medium text-foreground">Pases cargados ({flight.boarding_passes.length})</p>
          {flight.boarding_passes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay pases para este vuelo.</p>
          ) : (
            <ul className="space-y-2">
              {flight.boarding_passes.map((bp) => (
                <li key={bp.id} className="glass flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {bp.user_id ? personLabel(bp.profile) : "Sin asignar"}
                    </p>
                    <p className="text-xs text-muted-foreground">{bp.seat ? `Asiento ${bp.seat}` : "Sin asiento"}</p>
                  </div>
                  <Select
                    value={bp.user_id ?? NONE}
                    onValueChange={(v) =>
                      update.mutate(
                        { id: bp.id, input: { user_id: v === NONE ? null : v, seat: bp.seat, notes: bp.notes } },
                        { onError: (e: any) => toast.error(e.message ?? "No se pudo reasignar") },
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
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
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      openBoardingPass(bp.file_path).catch(() => toast.error("No se pudo abrir el pase"))
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      remove.mutate(
                        { id: bp.id, filePath: bp.file_path },
                        {
                          onSuccess: () => toast.success("Pase eliminado"),
                          onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
                        },
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
