import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import {
  REQUEST_TYPE_MAP,
  type RequestType,
  type RequestTypeDef,
  type RequestFieldDef,
} from "@/lib/requestTypes";
import type { RequestRow } from "@/hooks/useRequests";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Tipo elegido en el paso previo (creación) o tipo de la solicitud editada. */
  type: RequestType;
  request?: RequestRow | null;
  onSaved?: (info: { isEdit: boolean; type: RequestType }) => void;
}

function emptyValues(def: RequestTypeDef, request?: RequestRow | null) {
  const out: Record<string, string> = {};
  for (const f of def.fields) {
    const raw = request?.details?.[f.key];
    if (raw === undefined || raw === null) out[f.key] = "";
    else if (f.type === "datetime") out[f.key] = toLocalInputValue(String(raw));
    else out[f.key] = String(raw);
  }
  return out;
}

export function RequestFormDialog({ open, onOpenChange, clubId, userId, type, request, onSaved }: Props) {
  const isEdit = !!request;
  const def = REQUEST_TYPE_MAP[type];
  const qc = useQueryClient();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setTitle(request?.title ?? "");
    setDescription(request?.description ?? "");
    setValues(emptyValues(def, request));
  }, [open, request, def]);

  function setField(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("El título es obligatorio");
      const details: Record<string, any> = {};
      for (const f of def.fields) {
        const raw = (values[f.key] ?? "").trim();
        if (!raw) {
          if (f.required) throw new Error(`Falta el campo: ${f.label}`);
          continue;
        }
        if (f.type === "number" || f.type === "money") {
          const n = Number(raw);
          if (Number.isNaN(n)) throw new Error(`${f.label} debe ser un número`);
          details[f.key] = n;
        } else if (f.type === "datetime") {
          details[f.key] = fromLocalInputValue(raw);
        } else {
          details[f.key] = raw;
        }
      }
      const amount = def.amountKey ? (details[def.amountKey] ?? null) : null;
      const payload = {
        club_id: clubId,
        type,
        title: title.trim(),
        description: description.trim() || null,
        details,
        amount,
        currency: amount !== null ? "MXN" : null,
      };
      if (isEdit && request) {
        const { error } = await supabase.from("requests").update(payload).eq("id", request.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("requests")
          .insert({ ...payload, requester_id: userId, status: "pendiente" as const });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Solicitud actualizada" : "Solicitud enviada");
      qc.invalidateQueries({ queryKey: ["requests", clubId] });
      onSaved?.({ isEdit, type });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar solicitud" : `Nueva solicitud · ${def.label}`}</EntitySheetTitle>
        <EntitySheetDescription>{def.description}</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="req-title">Título</Label>
          <Input
            id="req-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resumen corto de la solicitud"
          />
        </div>

        {def.fields.map((f: RequestFieldDef) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`req-${f.key}`}>
              {f.label}
              {f.required ? null : <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>}
            </Label>
            {f.type === "textarea" ? (
              <Textarea
                id={`req-${f.key}`}
                rows={3}
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            ) : f.type === "select" ? (
              <div className="flex flex-wrap gap-2">
                {(f.options ?? []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setField(f.key, opt)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      values[f.key] === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                id={`req-${f.key}`}
                type={
                  f.type === "number" || f.type === "money"
                    ? "number"
                    : f.type === "date"
                      ? "date"
                      : f.type === "datetime"
                        ? "datetime-local"
                        : "text"
                }
                inputMode={f.type === "money" ? "decimal" : undefined}
                step={f.type === "money" ? "0.01" : undefined}
                min={f.type === "number" ? 1 : undefined}
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}

        <div className="space-y-1.5">
          <Label htmlFor="req-desc">Notas adicionales <span className="text-xs text-muted-foreground">(opcional)</span></Label>
          <Textarea id="req-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
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
