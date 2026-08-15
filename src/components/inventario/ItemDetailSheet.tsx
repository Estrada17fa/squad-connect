import * as React from "react";
import { AlertTriangle, Pencil } from "lucide-react";
import { DetailSheet, DetailField, DetailGrid, DetailEmpty } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { categoryIcon, SIN_CATEGORIA } from "@/lib/inventory";
import { useInventoryThumbnails, type InventoryItemRow } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: InventoryItemRow | null;
  availableQuantity: number;
  canEdit: boolean;
  onEdit: (item: InventoryItemRow) => void;
}

/** Ficha de lectura de un artículo del catálogo. Editar abre el ItemFormDialog existente. */
export function ItemDetailSheet({ open, onOpenChange, item, availableQuantity, canEdit, onEdit }: Props) {
  const thumbsQ = useInventoryThumbnails([item?.image_path]);
  const thumb = item?.image_path ? thumbsQ.data?.[item.image_path] : undefined;

  if (!item) return null;

  const Icon = categoryIcon(item.category);
  const low = availableQuantity <= item.min_quantity;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item.name}
      icon={Package}
      description={item.category ?? SIN_CATEGORIA}
      headerActions={
        canEdit ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(item)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
          </Button>
        ) : null
      }
    >
      <div className="flex items-center gap-3">
        {thumb ? (
          <img src={thumb} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-primary">
            <Icon className="h-7 w-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-foreground">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.category ?? SIN_CATEGORIA}
            {item.unit ? ` · ${item.unit}` : ""}
          </p>
        </div>
      </div>

      <DetailGrid>
        <DetailField label="Total">{item.total_quantity}</DetailField>
        <DetailField label="Disponibles">
          <span className={cn(low && "text-amber-400")}>
            {availableQuantity}
            {low ? (
              <span className="ml-2 inline-flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" /> Stock bajo
              </span>
            ) : null}
          </span>
        </DetailField>
        <DetailField label="Stock mínimo">{item.min_quantity}</DetailField>
        <DetailField label="Unidad">{item.unit || <DetailEmpty />}</DetailField>
      </DetailGrid>

      <DetailField label="Notas">
        {item.description ? <span className="whitespace-pre-wrap">{item.description}</span> : <DetailEmpty />}
      </DetailField>
    </DetailSheet>
  );
}
