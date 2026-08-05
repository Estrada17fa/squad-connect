import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, ImagePlus, X } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { categoryIcon } from "@/lib/inventory";
import { useInventoryThumbnails, type InventoryItemRow } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  item?: InventoryItemRow | null;
}

export function ItemFormDialog({ open, onOpenChange, clubId, userId, item }: Props) {
  const isEdit = !!item;
  const qc = useQueryClient();

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [total, setTotal] = React.useState("1");
  const [min, setMin] = React.useState("0");
  const [imagePath, setImagePath] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const thumbsQ = useInventoryThumbnails([imagePath]);
  const existingThumb = imagePath ? thumbsQ.data?.[imagePath] : undefined;

  React.useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategory(item?.category ?? "");
    setUnit(item?.unit ?? "");
    setDescription(item?.description ?? "");
    setTotal(String(item?.total_quantity ?? 1));
    setMin(String(item?.min_quantity ?? 0));
    setImagePath(item?.image_path ?? null);
    setFile(null);
    setPreview(null);
  }, [open, item]);

  React.useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("El nombre es obligatorio");
      const totalN = Number(total);
      const minN = Number(min || 0);
      if (!Number.isFinite(totalN) || totalN < 0) throw new Error("Cantidad total inválida");
      if (!Number.isFinite(minN) || minN < 0) throw new Error("Stock mínimo inválido");

      let path = imagePath;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const key = `${clubId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("inventory")
          .upload(key, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        path = key;
      }

      const payload = {
        club_id: clubId,
        name: name.trim(),
        category: category.trim() || null,
        unit: unit.trim() || null,
        description: description.trim() || null,
        total_quantity: Math.round(totalN),
        min_quantity: Math.round(minN),
        image_path: path,
      };

      if (isEdit && item) {
        const { error } = await supabase.from("inventory_items").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Artículo actualizado" : "Artículo creado");
      qc.invalidateQueries({ queryKey: ["inventory-items", clubId] });
      qc.invalidateQueries({ queryKey: ["inventory-catalog", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artículo eliminado");
      qc.invalidateQueries({ queryKey: ["inventory-items", clubId] });
      qc.invalidateQueries({ queryKey: ["inventory-catalog", clubId] });
      onOpenChange(false);
    },
    onError: () =>
      toast.error("No se pudo eliminar. Si tiene préstamos registrados, devuélvelos primero."),
  });

  const Icon = categoryIcon(category);
  const shownImage = preview ?? existingThumb ?? null;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar artículo" : "Nuevo artículo"}</EntitySheetTitle>
        <EntitySheetDescription>
          La disponibilidad se calcula sola a partir de los préstamos activos.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label>Foto (opcional)</Label>
          <div className="flex items-center gap-3">
            {shownImage ? (
              <img src={shownImage} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-primary">
                <Icon className="h-7 w-7" />
              </span>
            )}
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.04]">
                <ImagePlus className="h-4 w-4" />
                {shownImage ? "Cambiar foto" : "Subir foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {shownImage ? (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setImagePath(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" /> Quitar foto
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="item-name">Nombre</Label>
          <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p.ej. Balones de entrenamiento" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="item-cat">Categoría</Label>
            <Input id="item-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="p.ej. Entrenamiento" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-unit">Unidad</Label>
            <Input id="item-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="p.ej. piezas" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="item-total">Cantidad total</Label>
            <Input id="item-total" type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-min">Stock mínimo</Label>
            <Input id="item-min" type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="item-desc">Descripción (opcional)</Label>
          <Textarea id="item-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Crear artículo"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
