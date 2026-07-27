import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { InventoryItem } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  item?: InventoryItem | null;
  outstandingForItem?: number;
  categories?: string[];
}

export function ItemFormDialog({ open, onOpenChange, clubId, userId, item, outstandingForItem = 0, categories = [] }: Props) {
  const isEdit = !!item;
  const qc = useQueryClient();

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [total, setTotal] = React.useState<string>("0");
  const [min, setMin] = React.useState<string>("0");

  React.useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategory(item?.category ?? "");
    setDescription(item?.description ?? "");
    setUnit(item?.unit ?? "");
    setTotal(String(item?.total_quantity ?? 0));
    setMin(String(item?.min_quantity ?? 0));
  }, [open, item]);

  const mutation = useMutation({
    mutationFn: async () => {
      const t = Number(total);
      const m = Number(min);
      if (!name.trim()) throw new Error("El nombre es obligatorio");
      if (!Number.isFinite(t) || t < 0) throw new Error("Cantidad total inválida");
      if (!Number.isFinite(m) || m < 0) throw new Error("Stock mínimo inválido");
      if (isEdit && t < outstandingForItem) {
        throw new Error(`Ya hay ${outstandingForItem} prestados; la cantidad total no puede ser menor`);
      }
      const payload = {
        club_id: clubId,
        name: name.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        unit: unit.trim() || null,
        total_quantity: t,
        min_quantity: m,
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
      qc.invalidateQueries({ queryKey: ["inv-items", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      if (outstandingForItem > 0) {
        throw new Error("No puedes eliminar un artículo con préstamos activos");
      }
      const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artículo eliminado");
      qc.invalidateQueries({ queryKey: ["inv-items", clubId] });
      qc.invalidateQueries({ queryKey: ["inv-loans", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

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
          <Label htmlFor="i-name">Nombre</Label>
          <Input id="i-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p.ej. Balones de entrenamiento" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="i-cat">Categoría</Label>
            <Input
              id="i-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="p.ej. Balones, Conos, Uniformes"
              list="i-cat-list"
            />
            <datalist id="i-cat-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-unit">Unidad (opcional)</Label>
            <Input id="i-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pieza, par, caja…" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="i-total">Cantidad total</Label>
            <Input id="i-total" type="number" inputMode="numeric" min={0} value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-min">Stock mínimo</Label>
            <Input id="i-min" type="number" inputMode="numeric" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="i-desc">Descripción</Label>
          <Textarea id="i-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles del material, marca, estado…" />
        </div>

        {isEdit && outstandingForItem > 0 ? (
          <p className="text-xs text-muted-foreground">
            Hay {outstandingForItem} unidades prestadas; no podrás poner una cantidad total menor que eso.
          </p>
        ) : null}
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
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Crear artículo"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
