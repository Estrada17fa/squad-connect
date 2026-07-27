import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Pencil, Package, ArrowLeftRight } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useInventoryImageUrl, type InventoryItem } from "@/hooks/useInventory";
import { formatDateTime } from "@/lib/calendar-utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: InventoryItem | null;
  available: number;
  outstanding: number;
  clubId: string;
  canEdit: boolean;
  onEdit: () => void;
  onLoan: () => void;
}

export function ItemDetailSheet({ open, onOpenChange, item, available, outstanding, clubId, canEdit, onEdit, onLoan }: Props) {
  const qc = useQueryClient();
  const imageQ = useInventoryImageUrl(item?.image_path);

  const del = useMutation({
    mutationFn: async () => {
      if (!item) return;
      if (outstanding > 0) throw new Error("No puedes eliminar un artículo con préstamos activos");
      if (item.image_path) {
        await supabase.storage.from("inventory").remove([item.image_path]);
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

  if (!item) return null;

  const low = item.min_quantity > 0 && available <= item.min_quantity;
  const out = available === 0;
  const status: { label: string; variant: StatusVariant } = out
    ? { label: "Agotado", variant: "rejected" }
    : low
      ? { label: "Bajo stock", variant: "pending" }
      : { label: `${available} disponibles`, variant: "approved" };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{item.name}</EntitySheetTitle>
        <EntitySheetDescription>Detalle del artículo</EntitySheetDescription>
        {canEdit ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (confirm("¿Eliminar este artículo?")) del.mutate();
              }}
              disabled={del.isPending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </Button>
            <Button size="sm" variant="ghost" onClick={onLoan} disabled={available === 0}>
              <ArrowLeftRight className="mr-2 h-3.5 w-3.5" /> Prestar
            </Button>
          </div>
        ) : null}
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-white/[0.02]">
          {imageQ.data ? (
            <img src={imageQ.data} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        <Field label="Estado">
          <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Total"><span className="text-foreground">{item.total_quantity}{item.unit ? ` ${item.unit}` : ""}</span></Field>
          <Field label="Prestados"><span className="text-foreground">{outstanding}</span></Field>
          <Field label="Disponibles"><span className="text-foreground">{available}</span></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría"><span className="text-foreground">{item.category ?? "Sin categoría"}</span></Field>
          <Field label="Stock mínimo"><span className="text-foreground">{item.min_quantity || "Sin alerta"}</span></Field>
        </div>

        {item.description ? (
          <Field label="Descripción">
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{item.description}</p>
          </Field>
        ) : null}

        <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-muted-foreground">
          <div>
            <div className="uppercase tracking-wider">Creado</div>
            <div className="mt-0.5 text-foreground/80">{formatDateTime(item.created_at)}</div>
          </div>
          <div>
            <div className="uppercase tracking-wider">Actualizado</div>
            <div className="mt-0.5 text-foreground/80">{formatDateTime(item.updated_at)}</div>
          </div>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
