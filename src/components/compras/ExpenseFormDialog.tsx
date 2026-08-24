import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, X, FileText, Receipt, CreditCard, Building2, FileSpreadsheet } from "lucide-react";
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
  isValidRfc,
  toDayInput,
  type ExpenseCategory,
  type PaymentStatus,
} from "@/lib/expenses";
import { cn } from "@/lib/utils";
import { useClubPrefs } from "@/hooks/useClubPrefs";

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

function Section({
  icon: Icon,
  title,
  description,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="glass space-y-3 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="space-y-3">{children}</div> : null}
    </section>
  );
}

function FilePicker({
  label,
  accept,
  file,
  existing,
  hint,
  onPick,
  onClear,
}: {
  label: string;
  accept: string;
  file: File | null;
  existing: string | null;
  hint?: string;
  onPick: (f: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.04]">
            <FileUp className="h-4 w-4" />
            {file || existing ? "Cambiar archivo" : "Subir archivo"}
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {file ? file.name : existing ? "Archivo ya adjunto" : (hint ?? "Sin archivo")}
          </p>
          {file || existing ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" /> Quitar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
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
  const { currency: clubCurrency } = useClubPrefs();

  const [concept, setConcept] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<ExpenseCategory>("otro");
  const [supplierId, setSupplierId] = React.useState<string>("");
  const [supplierName, setSupplierName] = React.useState("");
  const [saveSupplier, setSaveSupplier] = React.useState(false);
  const [date, setDate] = React.useState(toDayInput(new Date()));
  const [paid, setPaid] = React.useState(false);
  const [paidDate, setPaidDate] = React.useState(toDayInput(new Date()));
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [receiptPath, setReceiptPath] = React.useState<string | null>(null);

  // Factura recibida del proveedor
  const [hasInvoice, setHasInvoice] = React.useState(false);
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [pdfPath, setPdfPath] = React.useState<string | null>(null);
  const [xmlFile, setXmlFile] = React.useState<File | null>(null);
  const [xmlPath, setXmlPath] = React.useState<string | null>(null);
  const [folio, setFolio] = React.useState("");
  const [uuid, setUuid] = React.useState("");
  const [rfc, setRfc] = React.useState("");
  const [invoiceTotal, setInvoiceTotal] = React.useState("");
  const [invoiceTax, setInvoiceTax] = React.useState("");
  const [invoiceDate, setInvoiceDate] = React.useState("");

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
    setPaidDate(
      expense?.paid_at ? toDayInput(new Date(expense.paid_at)) : toDayInput(new Date()),
    );
    setNotes(expense?.notes ?? initial?.notes ?? "");
    setFile(null);
    setReceiptPath(expense?.receipt_path ?? null);

    setHasInvoice(!!expense?.has_invoice);
    setPdfFile(null);
    setPdfPath(expense?.invoice_pdf_path ?? null);
    setXmlFile(null);
    setXmlPath(expense?.invoice_xml_path ?? null);
    setFolio(expense?.invoice_folio ?? "");
    setUuid(expense?.invoice_uuid ?? "");
    setRfc(expense?.issuer_rfc ?? "");
    setInvoiceTotal(expense?.invoice_total != null ? String(expense.invoice_total) : "");
    setInvoiceTax(expense?.invoice_tax != null ? String(expense.invoice_tax) : "");
    setInvoiceDate(expense?.invoice_date ?? "");
  }, [open, expense, initial]);

  const upload = React.useCallback(
    async (f: File) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "pdf";
      const key = `${clubId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("expense-receipts")
        .upload(key, f, { contentType: f.type || undefined, upsert: false });
      if (error) throw error;
      return key;
    },
    [clubId],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!concept.trim()) throw new Error("El concepto es obligatorio");
      const amountN = Number(amount);
      if (!Number.isFinite(amountN) || amountN <= 0) throw new Error("Monto inválido");
      if (!date) throw new Error("La fecha del gasto es obligatoria");
      if (hasInvoice && !isValidRfc(rfc)) throw new Error("El RFC del emisor no es válido");

      let path = receiptPath;

      if (file) {
        path = await upload(file);
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

      let finalPdf = hasInvoice ? pdfPath : null;
      let finalXml = hasInvoice ? xmlPath : null;
      if (hasInvoice && pdfFile) finalPdf = await upload(pdfFile);
      if (hasInvoice && xmlFile) finalXml = await upload(xmlFile);

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

      const num = (v: string) => {
        const n = Number(v);
        return v.trim() && Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
      };

      const payload = {
        club_id: clubId,
        concept: concept.trim(),
        amount: Math.round(amountN * 100) / 100,
        currency: expense?.currency ?? initial?.currency ?? clubCurrency,
        category,
        supplier_id: finalSupplierId,
        supplier_name: finalSupplierId ? null : freeName || null,
        expense_date: date,
        payment_status: (paid ? "pagado" : "pendiente") as PaymentStatus,
        paid_at: paid ? new Date(`${paidDate}T12:00:00`).toISOString() : null,
        receipt_path: path,
        notes: notes.trim() || null,
        has_invoice: hasInvoice,
        invoice_pdf_path: finalPdf,
        invoice_xml_path: finalXml,
        invoice_folio: hasInvoice ? folio.trim() || null : null,
        invoice_uuid: hasInvoice ? uuid.trim() || null : null,
        issuer_rfc: hasInvoice ? rfc.trim().toUpperCase() || null : null,
        invoice_total: hasInvoice ? num(invoiceTotal) : null,
        invoice_tax: hasInvoice ? num(invoiceTax) : null,
        invoice_date: hasInvoice ? invoiceDate || null : null,
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
            : "Dinero que sale del club, con su comprobante, estado de pago y factura."}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <Section icon={Receipt} title="Datos del gasto" description="Qué se compró y cuánto costó.">
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
            <Label htmlFor="exp-notes">Notas (opcional)</Label>
            <Textarea id="exp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Section>

        <Section
          icon={Building2}
          title="Proveedor"
          description="Opcional: del catálogo o escrito a mano."
        >
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
        </Section>

        <Section
          icon={CreditCard}
          title="Pago y comprobante"
          description="Estado del pago y el ticket o recibo simple."
        >
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <div>
              <p className="text-sm text-foreground">Marcar como pagado</p>
              <p className="text-xs text-muted-foreground">Guarda la fecha en que salió el dinero.</p>
            </div>
            <Switch checked={paid} onCheckedChange={setPaid} />
          </div>
          {paid ? (
            <div className="space-y-1.5">
              <Label htmlFor="exp-paid-date">Fecha de pago</Label>
              <Input
                id="exp-paid-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
          ) : null}

          <FilePicker
            label="Comprobante (PDF o foto, opcional)"
            accept="image/*,application/pdf"
            file={file}
            existing={receiptPath}
            hint={
              initial?.requestPhotoPath
                ? "Se copiará el comprobante de la solicitud"
                : "Sin comprobante"
            }
            onPick={setFile}
            onClear={() => {
              setFile(null);
              setReceiptPath(null);
            }}
          />
        </Section>

        <Section
          icon={FileSpreadsheet}
          title="¿Este gasto tiene factura?"
          description="Factura recibida del proveedor y sus datos fiscales."
          action={<Switch checked={hasInvoice} onCheckedChange={setHasInvoice} />}
        >
          {hasInvoice ? (
            <>
              <FilePicker
                label="Factura PDF"
                accept="application/pdf"
                file={pdfFile}
                existing={pdfPath}
                onPick={setPdfFile}
                onClear={() => {
                  setPdfFile(null);
                  setPdfPath(null);
                }}
              />
              <FilePicker
                label="Factura XML (comprobante fiscal)"
                accept=".xml,text/xml,application/xml"
                file={xmlFile}
                existing={xmlPath}
                onPick={setXmlFile}
                onClear={() => {
                  setXmlFile(null);
                  setXmlPath(null);
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-folio">Folio</Label>
                  <Input
                    id="inv-folio"
                    value={folio}
                    onChange={(e) => setFolio(e.target.value)}
                    placeholder="A-1024"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-date">Fecha de la factura</Label>
                  <Input
                    id="inv-date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-uuid">UUID fiscal</Label>
                <Input
                  id="inv-uuid"
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-rfc">RFC del emisor</Label>
                <Input
                  id="inv-rfc"
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value.toUpperCase())}
                  placeholder="ABC010203XYZ"
                  className={cn(!isValidRfc(rfc) && "border-destructive")}
                />
                {!isValidRfc(rfc) ? (
                  <p className="text-xs text-destructive">Revisa el formato del RFC.</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-total">Monto facturado (con IVA)</Label>
                  <Input
                    id="inv-total"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={invoiceTotal}
                    onChange={(e) => setInvoiceTotal(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-tax">IVA (opcional)</Label>
                  <Input
                    id="inv-tax"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={invoiceTax}
                    onChange={(e) => setInvoiceTax(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Actívalo cuando el proveedor entregue la factura; el gasto queda como “Sin factura”
              mientras tanto.
            </p>
          )}
        </Section>
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
