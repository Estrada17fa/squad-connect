import * as React from "react";
import { Pencil, Mail, Phone, User, StickyNote, Receipt } from "lucide-react";
import { DetailSheet, DetailField } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import type { SupplierRow } from "@/hooks/useExpenses";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier: SupplierRow | null;
  canEdit: boolean;
  onEdit: (s: SupplierRow) => void;
  onViewExpenses?: (s: SupplierRow) => void;
}

/** Ficha de lectura de un proveedor. Editar abre el SupplierFormDialog existente. */
export function SupplierDetailSheet({ open, onOpenChange, supplier, canEdit, onEdit, onViewExpenses }: Props) {
  if (!supplier) return null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={supplier.name}
      icon={Receipt}
      description="Proveedor"
      size="md"
      headerActions={
        canEdit || onViewExpenses ? (
          <>
            {onViewExpenses ? (
              <Button size="sm" variant="outline" onClick={() => onViewExpenses(supplier)}>
                <Receipt className="mr-2 h-3.5 w-3.5" /> Ver gastos
              </Button>
            ) : null}
            {canEdit ? (
              <Button size="sm" variant="secondary" onClick={() => onEdit(supplier)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      <DetailField label="Contacto" icon={User}>
        {supplier.contact ?? <span className="text-muted-foreground">—</span>}
      </DetailField>
      <DetailField label="Teléfono" icon={Phone}>
        {supplier.phone ?? <span className="text-muted-foreground">—</span>}
      </DetailField>
      <DetailField label="Correo" icon={Mail}>
        {supplier.email ?? <span className="text-muted-foreground">—</span>}
      </DetailField>
      <DetailField label="Notas" icon={StickyNote}>
        {supplier.notes ? (
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{supplier.notes}</p>
        ) : (
          <span className="text-muted-foreground">Sin notas.</span>
        )}
      </DetailField>
    </DetailSheet>
  );
}
