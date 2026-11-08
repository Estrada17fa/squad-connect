import * as React from "react";
import { toast } from "sonner";
import { Check, MoreHorizontal, Upload } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import type { TripBoardingPass, TripFlight } from "@/hooks/useTripFlights";
import { useBoardingPassMutations } from "@/hooks/useTripBoardingPasses";
import { PassAssignFlow } from "@/components/coord/viajes/passes/PassAssignFlow";
import { PersonAvatar } from "@/components/coord/viajes/parts";
import { PassViewer } from "@/components/viajes/mine/PassViewer";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  flight: TripFlight;
  canEdit: boolean;
}

type Filter = "todos" | "sin";

/** Pasajeros del vuelo con su pase. Toda subida usa el flujo de tarjetas. */
export function BoardingPassesSheet({ open, onOpenChange, tripId, flight, canEdit }: Props) {
  const { remove } = useBoardingPassMutations(tripId);
  const [flow, setFlow] = React.useState<{ userId: string | null } | null>(null);
  const [toView, setToView] = React.useState<{ paths: string[]; title: string } | null>(null);
  const [toDelete, setToDelete] = React.useState<TripBoardingPass[] | null>(null);
  const [filter, setFilter] = React.useState<Filter>("todos");

  const passesByUser = new Map<string, TripBoardingPass[]>();
  for (const bp of flight.boarding_passes) if (bp.user_id) passesByUser.set(bp.user_id, [...(passesByUser.get(bp.user_id) ?? []), bp]);
  const total = flight.passengers.length;
  const withPass = flight.passengers.filter((p) => passesByUser.has(p.user_id)).length;
  const missing = total - withPass;
  const rows = [...flight.passengers]
    .sort((a, b) => personLabel(a.profile as MiniProfile).localeCompare(personLabel(b.profile as MiniProfile), "es"))
    .filter((p) => filter === "todos" || !passesByUser.has(p.user_id));

  const open1 = (userId: string, name: string) => {
    const ps = passesByUser.get(userId);
    if (ps?.length) setToView({ paths: ps.map((x) => x.file_path), title: name });
    else if (canEdit) setFlow({ userId });
  };

  const busy = !!flow || !!toView;
  return (
    <>
      <EntitySheet open={open && !busy} onOpenChange={onOpenChange} size="lg">
        <EntitySheetHeader>
          <EntitySheetTitle>Pases de abordar</EntitySheetTitle>
          <EntitySheetDescription>
            {flight.flight_code} · {flight.origin} → {flight.destination}
          </EntitySheetDescription>
          {total ? (
            <p className={cn("mt-1 text-sm font-semibold", missing ? "text-status-pending-foreground" : "text-primary")}>
              {withPass} de {total} con pase{missing ? ` · Faltan ${missing}` : ""}
            </p>
          ) : null}
          {canEdit ? (
            <button onClick={() => setFlow({ userId: null })} className="coord-press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
              <Upload className="h-4 w-4" /> Subir pases
            </button>
          ) : null}
        </EntitySheetHeader>

        <EntitySheetBody>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">Este vuelo aún no tiene pasajeros.</p>
          ) : (
            <>
              <div role="tablist" className="flex gap-1 rounded-xl bg-muted p-1 text-sm">
                {(["todos", "sin"] as const).map((f) => (
                  <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn("h-9 flex-1 rounded-lg font-semibold", filter === f ? "bg-background text-foreground" : "text-muted-foreground")}>
                    {f === "todos" ? "Todos" : `Sin pase${missing ? ` (${missing})` : ""}`}
                  </button>
                ))}
              </div>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Todos tienen su pase.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {rows.map((p) => {
                    const profile = p.profile as MiniProfile | null;
                    const name = personLabel(profile);
                    const ps = passesByUser.get(p.user_id);
                    const first = ps?.[0];
                    const detail = [first?.seat ? `Asiento ${first.seat}` : null, first?.boarding_group ? `Grupo ${first.boarding_group}` : null].filter(Boolean).join(" · ");
                    return (
                      <li key={p.id} className="flex items-center gap-1">
                        <button onClick={() => open1(p.user_id, name)} className="coord-press flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2 text-left">
                          <PersonAvatar p={profile} size={10} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium leading-snug">{name}</span>
                            {detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}
                          </span>
                          {ps ? (
                            <span aria-label="Con pase" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="h-4 w-4" /></span>
                          ) : (
                            <span className="shrink-0 text-xs text-muted-foreground">Sin pase</span>
                          )}
                        </button>
                        {canEdit && ps ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger aria-label={`Opciones del pase de ${name}`} className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground">
                              <MoreHorizontal className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setFlow({ userId: p.user_id })}>Reemplazar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(ps)}>Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </EntitySheetBody>
      </EntitySheet>

      {flow ? (
        <PassAssignFlow
          tripId={tripId}
          flights={[flight]}
          travelers={flight.passengers.map((p) => ({ user_id: p.user_id, profile: p.profile as MiniProfile | null }))}
          initialFlightId={flight.id}
          forUserId={flow.userId}
          onClose={() => setFlow(null)}
        />
      ) : null}

      {toView ? <PassViewer paths={toView.paths} title={toView.title} onClose={() => setToView(null)} /> : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Eliminar pase de abordar"
        description="Se eliminará el pase y su archivo. Esta acción no se puede deshacer."
        loading={remove.isPending}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            for (const bp of toDelete) await remove.mutateAsync({ id: bp.id, filePath: bp.file_path });
            toast.success("Pase eliminado");
            setToDelete(null);
          } catch (e) {
            toast.error((e as Error).message ?? "No se pudo eliminar");
          }
        }}
      />
    </>
  );
}
