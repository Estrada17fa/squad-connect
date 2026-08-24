import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, X, FileText, Paperclip, ListChecks, Tags, StickyNote } from "lucide-react";
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
  requestSummary,
  fieldVisible,
  normalizeDetails,
  type RequestType,
  type RequestTypeDef,
  type RequestFieldDef,
} from "@/lib/requestTypes";
import type { RequestRow } from "@/hooks/useRequests";
import { InventoryItemPicker } from "./InventoryItemPicker";
import { useClubTeams, useRequestAttachmentUrl, type InventoryCatalogItem } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";
import { useClubPrefs } from "@/hooks/useClubPrefs";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Tipo elegido en el paso previo (creación) o tipo de la solicitud editada. */
  type: RequestType;
  request?: RequestRow | null;
  /** Categoría sugerida al crear (null = todo el club). */
  defaultTeamId?: string | null;
  /** Categorías donde la persona puede crear; vacío = solo "Todo el club". */
  allowedTeamIds?: string[] | null;
  onSaved?: (info: { isEdit: boolean; type: RequestType }) => void;
}

const ATTACHMENT_TYPES = new Set(["image", "file"]);

function isAttachment(f: RequestFieldDef) {
  return ATTACHMENT_TYPES.has(f.type);
}

function emptyValues(def: RequestTypeDef, request?: RequestRow | null) {
  const details = normalizeDetails(def.key, request?.details);
  const out: Record<string, string> = {};
  for (const f of def.fields) {
    const raw = request ? details[f.key] : undefined;
    if (raw === undefined || raw === null || raw === "") out[f.key] = f.defaultValue ?? "";
    else if (f.type === "datetime") out[f.key] = toLocalInputValue(String(raw));
    else out[f.key] = String(raw);
  }
  return out;
}

/** Rutas de adjuntos ya guardadas, por clave de campo. */
function initialPaths(def: RequestTypeDef, request?: RequestRow | null) {
  const out: Record<string, string | null> = {};
  for (const f of def.fields) {
    if (!isAttachment(f)) continue;
    const raw = request?.details?.[f.key];
    out[f.key] = typeof raw === "string" && raw ? raw : null;
  }
  return out;
}

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function RequestFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  type,
  request,
  defaultTeamId = null,
  allowedTeamIds = null,
  onSaved,
}: Props) {
  const isEdit = !!request;
  const def = REQUEST_TYPE_MAP[type];
  const qc = useQueryClient();
  const teamsQ = useClubTeams(clubId);
  const { currency: clubCurrency } = useClubPrefs();
  const categoryTeams = React.useMemo(() => {
    const all = teamsQ.data ?? [];
    if (!allowedTeamIds) return all;
    const set = new Set(allowedTeamIds);
    return all.filter((t: any) => set.has(t.id));
  }, [teamsQ.data, allowedTeamIds]);

  const [description, setDescription] = React.useState("");
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [itemId, setItemId] = React.useState<string | null>(null);
  const [itemAvailable, setItemAvailable] = React.useState<number | null>(null);
  const [files, setFiles] = React.useState<Record<string, File | null>>({});
  const [paths, setPaths] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    if (!open) return;
    setDescription(request?.description ?? "");
    setValues(emptyValues(def, request));
    setTeamId(request?.team_id ?? defaultTeamId ?? null);
    setItemId((request?.details?.item_id as string) ?? null);
    setItemAvailable(null);
    setFiles({});
    setPaths(initialPaths(def, request));
  }, [open, request, def, defaultTeamId]);

  function setField(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function pickItem(item: InventoryCatalogItem | null) {
    setItemId(item?.id ?? null);
    setItemAvailable(item?.available_quantity ?? null);
    setField("articulo", item?.name ?? "");
  }

  const visibleFields = React.useMemo(
    () => def.fields.filter((f) => fieldVisible(f, values)),
    [def, values],
  );
  const detailFields = visibleFields.filter((f) => !isAttachment(f));
  const attachmentFields = visibleFields.filter(isAttachment);

  const mutation = useMutation({
    mutationFn: async () => {
      const details: Record<string, any> = {};
      const active = def.fields.filter((f) => fieldVisible(f, values));

      for (const f of active) {
        if (isAttachment(f)) continue;
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
        } else if (f.type === "url") {
          let url = raw;
          if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
          try {
            // eslint-disable-next-line no-new
            new URL(url);
          } catch {
            throw new Error(`${f.label} no es un link válido`);
          }
          details[f.key] = url;
        } else {
          details[f.key] = raw;
        }
      }

      // Artículo de inventario
      if (active.some((f) => f.type === "item")) {
        if (!itemId) throw new Error("Elige un artículo del inventario");
        details.item_id = itemId;
      }

      // Adjuntos (bucket privado request-attachments)
      for (const f of active.filter(isAttachment)) {
        let path = paths[f.key] ?? null;
        const file = files[f.key] ?? null;
        if (file) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
          const key = `${clubId}/${userId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("request-attachments")
            .upload(key, file, { contentType: file.type || undefined, upsert: false });
          if (upErr) throw upErr;
          path = key;
          if (f.type === "file") details[`${f.key}_name`] = file.name;
        }
        if (path) {
          details[f.key] = path;
          const savedName = request?.details?.[`${f.key}_name`];
          if (!files[f.key] && typeof savedName === "string") details[`${f.key}_name`] = savedName;
        } else if (f.required) {
          throw new Error(`Falta el campo: ${f.label}`);
        }
      }

      const amount = def.amountKey ? (details[def.amountKey] ?? null) : null;
      const payload = {
        club_id: clubId,
        team_id: teamId,
        type,
        title: requestSummary({ type, details, amount, currency: amount !== null ? clubCurrency : null }),
        description: description.trim() || null,
        details,
        amount,
        currency: amount !== null ? clubCurrency : null,
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

  const cantidad = Number(values["cantidad"] ?? "");
  const overAvailable =
    itemAvailable !== null && !Number.isNaN(cantidad) && cantidad > 0 && cantidad > itemAvailable;

  function renderField(f: RequestFieldDef) {
    return (
      <div key={f.key} className="space-y-1.5">
        <Label htmlFor={`req-${f.key}`}>
          {f.label}
          {f.required ? null : <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>}
        </Label>
        {f.type === "item" ? (
          <InventoryItemPicker
            clubId={clubId}
            itemId={itemId}
            itemName={values[f.key] ?? ""}
            onChange={pickItem}
          />
        ) : f.type === "toggle" ? (
          <div className="flex flex-wrap gap-2">
            {(f.toggleOptions ?? []).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField(f.key, opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  values[f.key] === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : f.type === "team" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setField(f.key, "")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                !values[f.key]
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
              )}
            >
              Sin equipo
            </button>
            {(teamsQ.data ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setField(f.key, t.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  values[f.key] === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        ) : f.type === "image" ? (
          <PhotoField
            file={files[f.key] ?? null}
            path={paths[f.key] ?? null}
            onFile={(file) => {
              setFiles((p) => ({ ...p, [f.key]: file }));
              if (file) setPaths((p) => ({ ...p, [f.key]: null }));
            }}
            onClear={() => {
              setFiles((p) => ({ ...p, [f.key]: null }));
              setPaths((p) => ({ ...p, [f.key]: null }));
            }}
          />
        ) : f.type === "file" ? (
          <DocumentField
            file={files[f.key] ?? null}
            path={paths[f.key] ?? null}
            savedName={
              typeof request?.details?.[`${f.key}_name`] === "string"
                ? (request!.details![`${f.key}_name`] as string)
                : null
            }
            onFile={(file) => {
              setFiles((p) => ({ ...p, [f.key]: file }));
              if (file) setPaths((p) => ({ ...p, [f.key]: null }));
            }}
            onClear={() => {
              setFiles((p) => ({ ...p, [f.key]: null }));
              setPaths((p) => ({ ...p, [f.key]: null }));
            }}
          />
        ) : f.type === "textarea" ? (
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
                    : f.type === "url"
                      ? "url"
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
        {f.hint ? (
          <p className={cn("text-xs", f.required ? "text-amber-300" : "text-muted-foreground")}>{f.hint}</p>
        ) : null}
        {f.key === "cantidad" && overAvailable ? (
          <p className="text-xs text-amber-300">
            Solo hay {itemAvailable} disponible{itemAvailable === 1 ? "" : "s"} ahora mismo.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar solicitud" : `Nueva solicitud · ${def.label}`}</EntitySheetTitle>
        <EntitySheetDescription>{def.description}</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-6">
          <FormSection title="Categoría" icon={Tags}>
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTeamId(null)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    teamId === null
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                  )}
                >
                  Todo el club
                </button>
                {categoryTeams.map((t: any) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTeamId(t.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      teamId === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Define quién puede verla: quien tenga permiso de esa categoría, o de todo el club.
              </p>
            </div>
          </FormSection>

          <FormSection title="Detalle de la solicitud" icon={ListChecks}>
            {detailFields.map(renderField)}
          </FormSection>

          {attachmentFields.length ? (
            <FormSection title="Adjuntos" icon={Paperclip}>
              {attachmentFields.map(renderField)}
            </FormSection>
          ) : null}

          <FormSection title="Notas" icon={StickyNote}>
            <div className="space-y-1.5">
              <Label htmlFor="req-desc">
                Notas adicionales <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="req-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </FormSection>
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

function PhotoField({
  file,
  path,
  onFile,
  onClear,
}: {
  file: File | null;
  path: string | null;
  onFile: (f: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const existingQ = useRequestAttachmentUrl(!file && path ? path : null);
  const [localUrl, setLocalUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preview = localUrl ?? existingQ.data ?? null;

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <img src={preview} alt="Referencia" className="h-16 w-16 rounded-lg object-cover" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground">
          <ImagePlus className="h-5 w-5" />
        </span>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {preview ? "Cambiar foto" : "Subir foto"}
        </Button>
        {preview ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-1 h-4 w-4" /> Quitar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function DocumentField({
  file,
  path,
  savedName,
  onFile,
  onClear,
}: {
  file: File | null;
  path: string | null;
  savedName: string | null;
  onFile: (f: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const name = file?.name ?? savedName ?? (path ? "Documento adjunto" : null);
  const has = !!file || !!path;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {has ? (
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-white/[0.03] p-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Paperclip className="mr-1 h-4 w-4" /> {has ? "Cambiar archivo" : "Subir PDF o imagen"}
      </Button>
    </div>
  );
}
