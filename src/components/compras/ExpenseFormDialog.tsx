import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, X, FileText } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useSuppliers, type ExpenseRow } from "@/hooks/useExpenses";
import {
  EXPENSE_CATEGORIES,
  toDayInput,
  type ExpenseCategory,
  type PaymentStatus,
} from "@/lib/expenses";
import { cn } from "@/lib/utils";

/** Pre-llenado del formulario (registro directo o desde una solicitud). */
export interface ExpenseInitialValues {
  concept?: string;
  amount?: number | null;
  currency?: string | null;
  category?: ExpenseCategory;
  supplierName?: string;
  supplierId?: string | null;
  expenseDate?: string;
  notes?: string | null;
  /** Comprobante ya adjunto en la solicitud (bucket request-attachments). */
  requestPhotoPath?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Gasto existente (modo edición). */
  expense?: ExpenseRow | null;
  initial?: ExpenseInitialValues | null;
  /** Solicitud que origina el gasto: queda ligada y se marca completada. */
  requestId?: string | null;
  onRegistered?: () => void;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  expense,
  initial,
  requestId,
  onRegistered,
}: Props) {
  const isEdit = !!expense;
  const qc = useQueryClient();
  const suppliersQ = useSuppliers(open ? clubId : null);

  const [concept, setConcept] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<ExpenseCategory>("otro");
  const [supplierId, setSupplierId] = React.useState<string>("");
  const [supplierName, setSupplierName] = React.useState("");
  const [saveSupplier, setSaveSupplier] = React.useState(false);
  const [date, setDate] = React.useState(toDayInput(new Date()));
  const [paid, setPaid] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [receiptPath, setReceiptPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setConcept(expense?.concept ?? initial?.concept ?? "");
    setAmount(
      expense ? String(expense.amount) : initial?.amount != null ? String(initial.amount) : "",
    );
    setCategory(expense?.category ?? initial?.category ?? "otro");
    setSupplierId(expense?.supplier_id ?? initial?.supplierId ?? "");
    setSupplierName(expense?.supplier_name ?? initial?.supplierName ?? "");
    setSaveSupplier(false);
    setDate(expense?.expense_date ?? initial?.expenseDate ?? toDayInput(new Date()));
    setPaid(expense?.payment_status === "pagado");
    setNotes(expense?.notes ?? initial?.notes ?? "");
    setFile(null);
    setReceiptPath(expense?.receipt_path ?? null);
  }, [open, expense, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!concept.trim()) throw new Error("El concepto es obligatorio");
      const amountN = Number(amount);
      if (!Number.isFinite(amountN) || amountN <= 0) throw new Error("Monto inválido");
      if (!date) throw new Error("La fecha del gasto es obligatoria");

      let path = receiptPath;

      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        const key = `${clubId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("expense-receipts")
          .upload(key, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        path = key;
      } else if (!path && initial?.requestPhotoPath) {
        // Copia el comprobante adjunto en la solicitud al bucket de gastos.
        const { data: blob } = await supabase.storage
          .from("request-attachments")
          .download(initial.requestPhotoPath);
        if (blob) {
          const ext = initial.requestPhotoPath.split(".").pop()?.toLowerCase() || "jpg";
          const key = `${clubId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("expense-receipts")
            .upload(key, blob, { contentType: blob.type, upsert: false });
          if (!upErr) path = key;
        }
      }

      // Proveedor nuevo escrito a mano que se quiere guardar al catálogo.
      let finalSupplierId: string | null = supplierId || null;
      const freeName = supplierName.trim();
      if (!finalSupplierId && freeName && saveSupplier) {
        const { data: created, error: supErr } = await supabase
          .from("suppliers")
          .insert({ club_id: clubId, name: freeName, created_by: userId })
          .select("id")
          .single();
        if (supErr) throw supErr;
        finalSupplierId = created.id;
        qc.invalidateQueries({ queryKey: ["suppliers", clubId] });
      }

      const payload = {
        club_id: clubId,
        concept: concept.trim(),
        amount: Math.round(amountN * 100) / 100,
        currency: expense?.currency ?? initial?.currency ?? "MXN",
        category,
        supplier_id: finalSupplierId,
        supplier_name: finalSupplierId ? null : freeName || null,
        expense_date: date,
        payment_status: (paid ? "pagado" : "pendiente") as PaymentStatus,
        receipt_path: path,
        notes: notes.trim() || null,
      };

      if (isEdit && expense) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", expense.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("expenses")
        .insert({ ...payload, request_id: requestId ?? null, created_by: userId });
      if (error) throw error;

      if (requestId) {
        const { error: reqErr } = await supabase
          .from("requests")
          .update({ status: "completada" as const })
          .eq("id", requestId);
        if (reqErr) throw reqErr;
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? "Gasto actualizado"
          : requestId
            ? "Gasto registrado y solicitud completada"
            : "Gasto registrado",
      );
      qc.invalidateQueries({ queryKey: ["expenses", clubId] });
      qc.invalidateQueries({ queryKey: ["expense-report", clubId] });
      qc.invalidateQueries({ queryKey: ["expense-summary", clubId] });
      if (requestId) {
        qc.invalidateQueries({ queryKey: ["requests", clubId] });
        qc.invalidateQueries({ queryKey: ["request-expense", requestId] });
        qc.invalidateQueries({ queryKey: ["request-history", requestId] });
      }
      onRegistered?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el gasto"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar gasto" : "Registrar gasto"}</EntitySheetTitle>
        <EntitySheetDescription>
          {requestId
            ? "Revisa los datos que vienen de la solicitud y confirma el gasto real."
            : "Dinero que sale del club, con su comprobante y estado de pago."}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="exp-concept">Concepto</Label>
          <Input
            id="exp-concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="p.ej. Balones de entrenamiento"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="exp-amount">Monto</Label>
            <Input
              id="exp-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-date">Fecha del gasto</Label>
            <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  category === c.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Proveedor (opcional)</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSupplierId("")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                supplierId === ""
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
              )}
            >
              Nombre libre
            </button>
            {(suppliersQ.data ?? []).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSupplierId(s.id);
                  setSupplierName("");
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  supplierId === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          {supplierId === "" ? (
            <>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Escribe el proveedor (opcional)"
              />
              {supplierName.trim() ? (
                <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <Switch checked={saveSupplier} onCheckedChange={setSaveSupplier} />
                  Guardar en el catálogo de proveedores
                </label>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>Comprobante (PDF o foto, opcional)</Label>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.04]">
                <FileUp className="h-4 w-4" />
                {file || receiptPath ? "Cambiar comprobante" : "Subir comprobante"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {file
                  ? file.name
                  : receiptPath
                    ? "Comprobante ya adjunto"
                    : initial?.requestPhotoPath
                      ? "Se copiará el comprobante de la solicitud"
                      : "Sin comprobante"}
              </p>
              {file || receiptPath ? (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setReceiptPath(null);
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" /> Quitar
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
          <div>
            <p className="text-sm text-foreground">Marcar como pagado</p>
            <p className="text-xs text-muted-foreground">Registra la fecha de pago automáticamente.</p>
          </div>
          <Switch checked={paid} onCheckedChange={setPaid} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-notes">Notas (opcional)</Label>
          <Textarea id="exp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="glow-primary"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar gasto"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
