import * as React from "react";
import { toast } from "sonner";
import { ExternalLink, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LocationMap } from "@/components/calendar/LocationMap";
import { googleMapsUrl } from "@/components/calendar/LocationDisplay";
import { LocationForm } from "@/components/admin/LocationsTab";
import { useLocations, useSaveLocation, useDeleteLocation, type LocationRow } from "@/hooks/useLocations";
import { useClub, useUpdateClub } from "@/hooks/useClubSettings";
import { SectionLabel, GroupCard } from "@/components/admin/users/ui";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { cn } from "@/lib/utils";
import { ClubSheet } from "./parts";

function shortAddress(a: string | null) {
  if (!a) return "Sin dirección";
  return a.split(",").slice(0, 2).join(",").trim();
}

export function LocationsSection({ clubId, userId, canEdit }: { clubId: string; userId: string; canEdit: boolean }) {
  const locQ = useLocations(clubId);
  const clubQ = useClub(clubId);
  const updateClub = useUpdateClub();
  const del = useDeleteLocation();
  const homeId = (clubQ.data as any)?.home_location_id as string | null | undefined;

  const list = React.useMemo(() => {
    const rows = [...(locQ.data ?? [])];
    rows.sort((a, b) => (a.id === homeId ? -1 : b.id === homeId ? 1 : a.name.localeCompare(b.name, "es")));
    return rows;
  }, [locQ.data, homeId]);

  const [detail, setDetail] = React.useState<LocationRow | null>(null);
  const [form, setForm] = React.useState<{ row: LocationRow | null; mode: "mapa" | "manual" } | null>(null);
  const [toDelete, setToDelete] = React.useState<LocationRow | null>(null);

  async function setHome(id: string | null) {
    try {
      await updateClub.mutateAsync({ id: clubId, home_location_id: id } as any);
      toast.success(id ? "Marcada como Sede" : "Ya no es la Sede");
      setDetail(null);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success("Ubicación eliminada");
      setToDelete(null);
      setDetail(null);
      clubQ.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  return (
    <section>
      <SectionLabel
        action={canEdit ? (
          <button type="button" onClick={() => setForm({ row: null, mode: "mapa" })} className="coord-press inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" /> Agregar ubicación
          </button>
        ) : null}
      >
        Ubicaciones
      </SectionLabel>
      <GroupCard>
        {locQ.isLoading ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">Cargando…</p>
        ) : list.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">Aún no hay ubicaciones.</p>
        ) : (
          list.map((l) => (
            <button key={l.id} type="button" onClick={() => setDetail(l)} className="coord-press flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left outline-none hover:bg-muted/40">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{l.name}</span>
                  {l.id === homeId ? <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">Sede</span> : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{shortAddress(l.address)}</span>
              </span>
              <span aria-hidden className="text-muted-foreground/60">›</span>
            </button>
          ))
        )}
      </GroupCard>

      <ClubSheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail?.name ?? ""} description={detail?.address ?? undefined}>
        {detail ? (
          <div className="space-y-3">
            {detail.latitude != null && detail.longitude != null ? (
              <>
                <LocationMap latitude={detail.latitude} longitude={detail.longitude} className="h-48 w-full overflow-hidden rounded-xl" />
                <a href={googleMapsUrl(detail.latitude, detail.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Abrir en Google Maps <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Capturada a mano, sin punto en el mapa.</p>
            )}
            {detail.notes ? <p className="text-sm text-muted-foreground">{detail.notes}</p> : null}
            {canEdit ? (
              <div className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-background/60">
                <button type="button" onClick={() => { setForm({ row: detail, mode: detail.latitude != null ? "mapa" : "manual" }); setDetail(null); }} className="coord-press flex min-h-12 w-full items-center px-3 text-left text-sm">Editar</button>
                <button type="button" disabled={updateClub.isPending} onClick={() => setHome(detail.id === homeId ? null : detail.id)} className="coord-press flex min-h-12 w-full items-center px-3 text-left text-sm">
                  {detail.id === homeId ? "Quitar como Sede" : "Marcar como Sede"}
                </button>
                <button type="button" onClick={() => setToDelete(detail)} className="coord-press flex min-h-12 w-full items-center px-3 text-left text-sm font-semibold text-destructive">Eliminar</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </ClubSheet>

      <ClubSheet open={!!form} onOpenChange={(o) => !o && setForm(null)} title={form?.row ? "Editar ubicación" : "Agregar ubicación"} full>
        {form ? (
          <div className="space-y-4">
            {!form.row ? (
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-background/60 p-1">
                {(["mapa", "manual"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setForm({ ...form, mode: m })} className={cn("h-9 rounded-lg text-sm font-semibold", form.mode === m ? "bg-card text-foreground" : "text-muted-foreground")}>
                    {m === "mapa" ? "Buscar en mapa" : "A mano"}
                  </button>
                ))}
              </div>
            ) : null}
            {form.mode === "mapa" ? (
              <LocationForm clubId={clubId} userId={userId} row={form.row} onDone={() => setForm(null)} onCancel={() => setForm(null)} />
            ) : (
              <ManualForm clubId={clubId} userId={userId} row={form.row} onDone={() => setForm(null)} />
            )}
          </div>
        ) : null}
      </ClubSheet>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar ${toDelete?.name ?? ""}?`}
        description="Se quitará de las ubicaciones del club. No se puede deshacer."
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function ManualForm({ clubId, userId, row, onDone }: { clubId: string; userId: string; row: LocationRow | null; onDone: () => void }) {
  const save = useSaveLocation();
  const [name, setName] = React.useState(row?.name ?? "");
  const [address, setAddress] = React.useState(row?.address ?? "");
  const [notes, setNotes] = React.useState(row?.notes ?? "");
  async function submit() {
    try {
      await save.mutateAsync({
        id: row?.id, club_id: clubId, name, address, notes,
        latitude: row?.latitude ?? null, longitude: row?.longitude ?? null, place_id: row?.place_id ?? null,
        source: row?.source ?? "manual", is_catalog: true, created_by: userId,
      });
      toast.success(row ? "Ubicación actualizada" : "Ubicación agregada");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="loc-m-name" className="text-xs text-muted-foreground">Nombre</Label>
        <Input id="loc-m-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="loc-m-addr" className="text-xs text-muted-foreground">Dirección</Label>
        <Input id="loc-m-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="loc-m-notes" className="text-xs text-muted-foreground">Notas (opcional)</Label>
        <Textarea id="loc-m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <Button className="h-11 w-full" disabled={!name.trim() || save.isPending} onClick={submit}>{save.isPending ? "Guardando…" : "Guardar"}</Button>
    </div>
  );
}
