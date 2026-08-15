import * as React from "react";
import { AlertTriangle, Boxes, FileText, Info, Package, Pencil } from "lucide-react";
import {
  DetailBadge,
  DetailEmptyBlock,
  DetailField,
  DetailGrid,
  DetailSection,
  DetailSheet,
  DetailStat,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { categoryIcon, SIN_CATEGORIA } from "@/lib/inventory";
import { stockAccent } from "@/lib/accents";
import { useInventoryThumbnails, type InventoryItemRow } from "@/hooks/useInventory";

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
  const accent = stockAccent(availableQuantity, item.min_quantity);
  const loaned = Math.max(0, item.total_quantity - availableQuantity);

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item.name}
      icon={Package}
      accent={accent}
      description={item.category ?? SIN_CATEGORIA}
      media={
        thumb ? (
          <img src={thumb} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/10" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/5 text-primary">
            <Icon className="h-8 w-8" />
          </span>
        )
      }
      badges={
        <>
          <DetailBadge color={accent}>
            {availableQuantity <= 0 ? "Sin disponibles" : low ? "Stock bajo" : "Disponible"}
          </DetailBadge>
          {item.unit ? <DetailBadge>{item.unit}</DetailBadge> : null}
        </>
      }
      headerActions={
        canEdit ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(item)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
          </Button>
        ) : null
      }
    >
      <DetailSection title="Stock" icon={Boxes}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <DetailStat label="Total" value={item.total_quantity} />
          <DetailStat
            label="Disponibles"
            value={availableQuantity}
            color={accent}
            hint={
              low ? (
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Stock bajo
                </span>
              ) : undefined
            }
          />
          <DetailStat label="Prestados" value={loaned} />
        </div>
      </DetailSection>

      <DetailSection title="Datos del artículo" icon={Info}>
        <DetailGrid>
          <DetailField label="Categoría">
            <DetailValue value={item.category ?? SIN_CATEGORIA} />
          </DetailField>
          <DetailField label="Unidad">
            <DetailValue value={item.unit} />
          </DetailField>
          <DetailField label="Stock mínimo">{item.min_quantity}</DetailField>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Notas" icon={FileText}>
        {item.description ? (
          <p className="whitespace-pre-wrap text-sm text-foreground/90 [overflow-wrap:anywhere]">
            {item.description}
          </p>
        ) : (
          <DetailEmptyBlock icon={FileText}>Sin notas para este artículo.</DetailEmptyBlock>
        )}
      </DetailSection>
    </DetailSheet>
  );
}
