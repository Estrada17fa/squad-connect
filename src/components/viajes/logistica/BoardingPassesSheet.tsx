import * as React from "react";
import { toast } from "sonner";
import { Download, Eye, FileText, Sparkles, Trash2, Upload } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { personInitials, personLabel, type MiniProfile } from "@/lib/tripLogistics";
import type { TripBoardingPass, TripFlight } from "@/hooks/useTripFlights";
import { openBoardingPass, useBoardingPassMutations } from "@/hooks/useTripBoardingPasses";
import { BoardingPassUploadDialog } from "./BoardingPassUploadDialog";
import { BoardingPassAutoMatchSheet } from "./BoardingPassAutoMatchSheet";

const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  flight: TripFlight;
  canEdit: boolean;
}

function PassActions({ pass, canEdit, onDelete }: { pass: TripBoardingPass; canEdit: boolean; onDelete: () => void }) {
  const openFile = () => openBoardingPass(pass.file_path).catch(() => toast.error("No se pudo abrir el pase"));
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button type="button" size="icon" variant="ghost" onClick={openFile} aria-label="Ver pase">
        <Eye className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" onClick={openFile} aria-label="Descargar pase">
        <Download className="h-4 w-4" />
      </Button>
      {canEdit ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="Eliminar pase"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

/** Lista de pasajeros del vuelo con su estado de pase de abordar. */
export function BoardingPassesSheet({ open, onOpenChange, tripId, flight, canEdit }: Props) {
  const { update, remove } = useBoardingPassMutations(tripId);
  const [uploadFor, setUploadFor] = React.useState<string | null | undefined>(undefined);
  const [autoOpen, setAutoOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<TripBoardingPass | null>(null);

  const passByUser = new Map<string, TripBoardingPass>();
  for (const bp of flight.boarding_passes) if (bp.user_id) passByUser.set(bp.user_id, bp);
  const unassigned = flight.boarding_passes.filter((bp) => !bp.user_id);

  const withPass = flight.passengers.filter((p) => passByUser.has(p.user_id)).length;
  const total = flight.passengers.length;

  const passengerOptions = flight.passengers.map((p) => ({
    user_id: p.user_id,
    label: personLabel(p.profile as MiniProfile | null),
  }));

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Pases de abordar
          </EntitySheetTitle>
          <EntitySheetDescription>
            {flight.flight_code} · {flight.origin} → {flight.destination}
          </EntitySheetDescription>
          <p className="mt-2 text-sm font-medium text-primary">
            {withPass} de {total} con pase
          </p>
          {canEdit ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="glow-primary" onClick={() => setUploadFor(null)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Agregar pase
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAutoOpen(true)}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Repartir desde PDF
              </Button>
            </div>
          ) : null}
        </EntitySheetHeader>

        <EntitySheetBody>
          <section className="space-y-2">
            <p className="text-sm font-medium text-foreground">Pasajeros</p>
            {total === 0 ? (
              <p className="text-xs text-muted-foreground">Este vuelo aún no tiene pasajeros asignados.</p>
            ) : (
              <ul className="space-y-2">
                {flight.passengers.map((p) => {
                  const pass = passByUser.get(p.user_id);
                  const profile = p.profile as MiniProfile | null;
                  return (
                    <li key={p.id} className="glass flex items-center gap-3 p-3">
                      <Avatar className="h-9 w-9">
                        {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                        <AvatarFallback className="text-xs">{personInitials(profile)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{personLabel(profile)}</p>
                        <p className="text-xs text-muted-foreground">
                          {pass?.seat ? `Asiento ${pass.seat}` : "Sin asiento"}
                          {pass?.boarding_group ? ` · Grupo ${pass.boarding_group}` : ""}
                          {pass?.terminal ? ` · ${pass.terminal}` : ""}
                        </p>
                      </div>
                      {pass ? (
                        <>
                          <Badge variant="default">Con pase</Badge>
                          <PassActions pass={pass} canEdit={canEdit} onDelete={() => setToDelete(pass)} />
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">Sin pase</Badge>
                          {canEdit ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Cargar pase"
                              onClick={() => setUploadFor(p.user_id)}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {unassigned.length > 0 ? (
            <section className="space-y-2">
              <p className="text-sm font-medium text-foreground">Sin asignar ({unassigned.length})</p>
              <ul className="space-y-2">
                {unassigned.map((bp) => (
                  <li key={bp.id} className="glass flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">Pase sin persona</p>
                      <p className="text-xs text-muted-foreground">{bp.seat ? `Asiento ${bp.seat}` : "Sin asiento"}</p>
                    </div>
                    {canEdit ? (
                      <Select
                        value={NONE}
                        onValueChange={(v) =>
                          update.mutate(
                            { id: bp.id, input: { user_id: v === NONE ? null : v } },
                            {
                              onSuccess: () => toast.success("Pase asignado"),
                              onError: (e: any) => toast.error(e.message ?? "No se pudo asignar"),
                            },
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue placeholder="Asignar a…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin asignar</SelectItem>
                          {passengerOptions.map((p) => (
                            <SelectItem key={p.user_id} value={p.user_id}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <PassActions pass={bp} canEdit={canEdit} onDelete={() => setToDelete(bp)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </EntitySheetBody>

        <EntitySheetFooter>
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </EntitySheetFooter>
      </EntitySheet>

      {canEdit && uploadFor !== undefined ? (
        <BoardingPassUploadDialog
          open
          onOpenChange={(v) => !v && setUploadFor(undefined)}
          tripId={tripId}
          flight={flight}
          defaultUserId={uploadFor}
        />
      ) : null}

      {canEdit && autoOpen ? (
        <BoardingPassAutoMatchSheet open onOpenChange={(v) => !v && setAutoOpen(false)} tripId={tripId} flight={flight} />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar pase de abordar"
        description="Se eliminará el archivo del pase. Esta acción no se puede deshacer."
        loading={remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(
            { id: toDelete.id, filePath: toDelete.file_path },
            {
              onSuccess: () => {
                toast.success("Pase eliminado");
                setToDelete(null);
              },
              onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
            },
          );
        }}
      />
    </>
  );
}
