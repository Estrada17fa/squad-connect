import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  REQUEST_TYPE_LABEL, type RequestRow, type RequestType,
} from "@/hooks/useRequests";
import { useInventoryImageUrl } from "@/hooks/useInventory";
import { Package as PackageIcon } from "lucide-react";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  request?: RequestRow | null;
  initialType?: RequestType;
}

type ItemLite = { id: string; name: string; unit: string | null; image_path: string | null };
type EventLite = { id: string; title: string; starts_at: string; event_type: string };
type MemberLite = { id: string; full_name: string | null; email: string | null };

export function RequestFormDialog({
  open, onOpenChange, clubId, userId, request, initialType,
}: Props) {
  const isEdit = !!request;
  const qc = useQueryClient();

  const [type, setType] = React.useState<RequestType>("otro");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [neededAt, setNeededAt] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("MXN");
  const [details, setDetails] = React.useState<Record<string, any>>({});
  const [relItem, setRelItem] = React.useState<string>("");
  const [relEvent, setRelEvent] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    setType(request?.type ?? initialType ?? "otro");
    setTitle(request?.title ?? "");
    setDescription(request?.description ?? "");
    setNeededAt(request?.needed_at ? toLocalInputValue(request.needed_at) : "");
    setAmount(request?.amount != null ? String(request.amount) : "");
    setCurrency(request?.currency ?? "MXN");
    setDetails(request?.details ?? {});
    setRelItem(request?.related_item_id ?? "");
    setRelEvent(request?.related_event_id ?? "");
  }, [open, request, initialType]);

  const itemsQ = useQuery({
    queryKey: ["req-items", clubId] as const,
    enabled: open && (type === "material"),
    queryFn: async (): Promise<ItemLite[]> => {
      const { data, error } = await supabase
        .from("inventory_items").select("id, name, unit")
        .eq("club_id", clubId).order("name");
      if (error) throw error;
      return (data ?? []) as ItemLite[];
    },
  });

  const eventsQ = useQuery({
    queryKey: ["req-events-partidos", clubId] as const,
    enabled: open && type === "cortesias",
    queryFn: async (): Promise<EventLite[]> => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("calendar_events").select("id, title, starts_at, event_type")
        .eq("club_id", clubId).eq("event_type", "partido")
        .gte("starts_at", since).order("starts_at").limit(30);
      if (error) throw error;
      return (data ?? []) as EventLite[];
    },
  });

  const membersQ = useQuery({
    queryKey: ["req-members", clubId] as const,
    enabled: open && type === "medica",
    queryFn: async (): Promise<MemberLite[]> => {
      const { data, error } = await supabase
        .from("profiles").select("id, full_name, email")
        .eq("club_id", clubId).order("full_name", { nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as MemberLite[];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("El título es obligatorio");

      const payload: any = {
        club_id: clubId,
        type,
        title: title.trim(),
        description: description.trim() || null,
        details,
        amount: amount ? Number(amount) : null,
        currency: amount ? currency : null,
        needed_at: neededAt ? fromLocalInputValue(neededAt) : null,
        related_item_id: type === "material" && relItem ? relItem : null,
        related_event_id: type === "cortesias" && relEvent ? relEvent : null,
      };

      if (type === "material") {
        const qty = Number(details.quantity ?? 0);
        if (!relItem) throw new Error("Selecciona el artículo solicitado");
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("Cantidad inválida");
      }
      if (type === "permiso") {
        if (!details.start_date || !details.end_date) throw new Error("Indica el rango de fechas");
      }
      if (type === "cortesias") {
        if (!relEvent) throw new Error("Selecciona el partido");
        if (!Number(details.tickets ?? 0)) throw new Error("Indica la cantidad de boletos");
      }
      if ((type === "pago_proveedor" || type === "reembolso" || type === "compra") && !amount) {
        throw new Error("Indica el monto");
      }
      if (type === "medica" && !details.patient_id) {
        throw new Error("Selecciona al paciente");
      }

      if (isEdit && request) {
        const { error } = await supabase.from("requests").update(payload).eq("id", request.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("requests")
          .insert({ ...payload, requester_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Solicitud actualizada" : "Solicitud creada");
      qc.invalidateQueries({ queryKey: ["requests", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar la solicitud"),
  });

  const canEditType = !isEdit;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar solicitud" : "Nueva solicitud"}</EntitySheetTitle>
        <EntitySheetDescription>
          {isEdit ? "Ajusta los detalles de tu solicitud." : "Elige el tipo y completa la información."}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label>Tipo de solicitud</Label>
          <Select value={type} onValueChange={(v) => setType(v as RequestType)} disabled={!canEditType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((t) => (
                <SelectItem key={t} value={t}>{REQUEST_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="r-title">Título</Label>
          <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Resumen breve" />
        </div>

        {/* Campos por tipo */}
        {type === "material" ? (
          <>
            <div className="space-y-1.5">
              <Label>Artículo</Label>
              <Select value={relItem} onValueChange={setRelItem}>
                <SelectTrigger><SelectValue placeholder="Selecciona un artículo" /></SelectTrigger>
                <SelectContent>
                  {(itemsQ.data ?? []).map((it) => (
                    <SelectItem key={it.id} value={it.id}>{it.name}{it.unit ? ` (${it.unit})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Cantidad" value={details.quantity ?? ""} onChange={(v) => setDetails({ ...details, quantity: v })} min={1} />
          </>
        ) : null}

        {type === "compra" ? (
          <>
            <TextField label="Categoría" value={details.category ?? ""} onChange={(v) => setDetails({ ...details, category: v })} placeholder="Balones, papelería…" />
            <UrgencySelect value={details.urgency ?? "normal"} onChange={(v) => setDetails({ ...details, urgency: v })} />
            <AmountFields amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} />
          </>
        ) : null}

        {type === "pago_proveedor" ? (
          <>
            <TextField label="Proveedor" value={details.vendor ?? ""} onChange={(v) => setDetails({ ...details, vendor: v })} />
            <TextField label="Concepto / factura #" value={details.invoice ?? ""} onChange={(v) => setDetails({ ...details, invoice: v })} />
            <AmountFields amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} />
            <TextField label="Link a comprobante (opcional)" value={details.attachment_url ?? ""} onChange={(v) => setDetails({ ...details, attachment_url: v })} placeholder="https://…" />
          </>
        ) : null}

        {type === "permiso" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <TextField type="date" label="Desde" value={details.start_date ?? ""} onChange={(v) => setDetails({ ...details, start_date: v })} />
              <TextField type="date" label="Hasta" value={details.end_date ?? ""} onChange={(v) => setDetails({ ...details, end_date: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Select value={details.reason ?? "personal"} onValueChange={(v) => setDetails({ ...details, reason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        {type === "cortesias" ? (
          <>
            <div className="space-y-1.5">
              <Label>Partido</Label>
              <Select value={relEvent} onValueChange={setRelEvent}>
                <SelectTrigger><SelectValue placeholder="Selecciona un partido" /></SelectTrigger>
                <SelectContent>
                  {(eventsQ.data ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Boletos" value={details.tickets ?? ""} onChange={(v) => setDetails({ ...details, tickets: v })} min={1} />
            <TextField label="Para (nombres)" value={details.attendees ?? ""} onChange={(v) => setDetails({ ...details, attendees: v })} placeholder="Familia, invitados…" />
          </>
        ) : null}

        {type === "reembolso" ? (
          <>
            <TextField label="Concepto" value={details.concept ?? ""} onChange={(v) => setDetails({ ...details, concept: v })} />
            <TextField type="date" label="Fecha del gasto" value={details.spent_at ?? ""} onChange={(v) => setDetails({ ...details, spent_at: v })} />
            <AmountFields amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} />
            <TextField label="Link al comprobante (opcional)" value={details.receipt_url ?? ""} onChange={(v) => setDetails({ ...details, receipt_url: v })} placeholder="https://…" />
          </>
        ) : null}

        {type === "medica" ? (
          <>
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select value={details.patient_id ?? ""} onValueChange={(v) => setDetails({ ...details, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Miembro del club" /></SelectTrigger>
                <SelectContent>
                  {(membersQ.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email ?? m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={details.medical_kind ?? "consulta"} onValueChange={(v) => setDetails({ ...details, medical_kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consulta">Consulta externa</SelectItem>
                  <SelectItem value="estudio">Estudio / imagen</SelectItem>
                  <SelectItem value="tratamiento">Tratamiento</SelectItem>
                  <SelectItem value="cirugia">Cirugía</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TextField label="Especialidad" value={details.specialty ?? ""} onChange={(v) => setDetails({ ...details, specialty: v })} placeholder="Ortopedia, cardiología…" />
            <UrgencySelect value={details.urgency ?? "normal"} onChange={(v) => setDetails({ ...details, urgency: v })} />
          </>
        ) : null}

        {/* Comunes */}
        <div className="space-y-1.5">
          <Label htmlFor="r-need">Fecha necesaria (opcional)</Label>
          <Input id="r-need" type="datetime-local" value={neededAt} onChange={(e) => setNeededAt(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="r-desc">Descripción / notas</Label>
          <Textarea id="r-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto adicional para el aprobador…" />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Enviar solicitud"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function NumberField({ label, value, onChange, min }: {
  label: string; value: string | number; onChange: (v: string) => void; min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" inputMode="numeric" min={min} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AmountFields({ amount, setAmount, currency, setCurrency }: {
  amount: string; setAmount: (v: string) => void; currency: string; setCurrency: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_100px] gap-3">
      <div className="space-y-1.5">
        <Label>Monto</Label>
        <Input type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Moneda</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MXN">MXN</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function UrgencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Urgencia</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="baja">Baja</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
