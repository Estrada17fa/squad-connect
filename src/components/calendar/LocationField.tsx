import * as React from "react";
import { toast } from "sonner";
import { Bookmark, Settings2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { useDeleteLocation, useLocations, useSaveLocation } from "@/hooks/useLocations";

interface Props {
  clubId: string;
  userId: string;
  /** Texto libre de la ubicación. */
  value: string;
  onChange: (v: string) => void;
  /** Referencia al lugar del catálogo (null cuando es texto libre). */
  locationId: string | null;
  onLocationIdChange: (id: string | null) => void;
  /** Permite crear/gestionar lugares del catálogo. */
  canManage?: boolean;
  id?: string;
}

/**
 * Ubicación combinada: elegir un lugar guardado del club o escribir uno libre,
 * con opción de guardar el texto libre en el catálogo.
 */
export function LocationField({
  clubId,
  userId,
  value,
  onChange,
  locationId,
  onLocationIdChange,
  canManage = true,
  id = "event-loc",
}: Props) {
  const locationsQ = useLocations(clubId);
  const save = useSaveLocation();
  const [managerOpen, setManagerOpen] = React.useState(false);
  const locations = locationsQ.data ?? [];

  const matches = React.useMemo(
    () => locations.some((l) => l.name.toLowerCase() === value.trim().toLowerCase()),
    [locations, value],
  );

  function onSelect(v: string) {
    if (v === "__free__") {
      onLocationIdChange(null);
      onChange("");
      return;
    }
    const loc = locations.find((l) => l.id === v);
    if (!loc) return;
    onLocationIdChange(loc.id);
    onChange(loc.name);
  }

  async function saveToCatalog() {
    try {
      const created = await save.mutateAsync({ club_id: clubId, name: value, created_by: userId });
      onLocationIdChange(created.id);
      toast.success("Lugar guardado en el catálogo");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar el lugar");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>Ubicación</Label>
        {canManage ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setManagerOpen(true)}>
            <Settings2 className="mr-1 h-3.5 w-3.5" />
            Lugares
          </Button>
        ) : null}
      </div>

      <select
        value={locationId ?? "__free__"}
        onChange={(e) => onSelect(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        aria-label="Lugar guardado"
      >
        <option value="__free__">Escribir una ubicación…</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onLocationIdChange(null);
        }}
        placeholder="Estadio, cancha, sala…"
      />

      {canManage && !locationId && value.trim() && !matches ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={saveToCatalog}
          disabled={save.isPending}
          className="text-primary"
        >
          <Bookmark className="mr-1 h-3.5 w-3.5" />
          Guardar “{value.trim()}” en el catálogo
        </Button>
      ) : null}

      {managerOpen ? (
        <LocationsManager open={managerOpen} onOpenChange={setManagerOpen} clubId={clubId} userId={userId} />
      ) : null}
    </div>
  );
}

function LocationsManager({
  open,
  onOpenChange,
  clubId,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
}) {
  const locationsQ = useLocations(clubId);
  const save = useSaveLocation();
  const del = useDeleteLocation();
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);

  function reset() {
    setName("");
    setAddress("");
    setEditingId(null);
  }

  async function submit() {
    if (!name.trim()) return toast.error("Escribe el nombre del lugar");
    try {
      await save.mutateAsync({
        id: editingId ?? undefined,
        club_id: clubId,
        name,
        address,
        created_by: userId,
      });
      toast.success(editingId ? "Lugar actualizado" : "Lugar creado");
      reset();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  async function remove(id: string) {
    try {
      await del.mutateAsync(id);
      toast.success("Lugar eliminado");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>Lugares del club</EntitySheetTitle>
        <EntitySheetDescription>Catálogo reutilizable de sedes, canchas y salas.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="loc-name">Nombre</Label>
          <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p.ej. Cancha 2" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-addr">Dirección (opcional)</Label>
          <Input id="loc-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button type="button" onClick={submit} disabled={save.isPending} className="w-full">
          {editingId ? "Guardar cambios" : "Agregar lugar"}
        </Button>

        <div className="mt-2 divide-y divide-border/60 rounded-lg border border-border/60">
          {(locationsQ.data ?? []).length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Aún no hay lugares guardados.</div>
          ) : (
            (locationsQ.data ?? []).map((l) => (
              <div key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-foreground"
                  onClick={() => {
                    setEditingId(l.id);
                    setName(l.name);
                    setAddress(l.address ?? "");
                  }}
                >
                  {l.name}
                  {l.address ? <span className="ml-2 text-xs text-muted-foreground">{l.address}</span> : null}
                </button>
                <button type="button" onClick={() => remove(l.id)} className="p-1 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
