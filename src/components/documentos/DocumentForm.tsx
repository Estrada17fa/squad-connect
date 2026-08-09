import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Upload, X } from "lucide-react";
import { EntitySheetBody, EntitySheetFooter } from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/components/squad/AppLayout";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { supabase } from "@/integrations/supabase/client";
import {
  DOCUMENT_TYPES,
  fileExtOf,
  type DocumentCategory,
  type DocumentRow,
} from "@/hooks/useDocuments";

const NONE = "__none";

interface Props {
  existing?: DocumentRow | null;
  presetRelatedUserId?: string | null;
  presetTeamId?: string | null;
  /** Bloquea el selector de persona (documentos personales desde un perfil). */
  lockPerson?: boolean;
  onDone: () => void;
  onCancel: () => void;
}

/** Secciones del formulario, compartidas por el alta y la edición en la ficha. */
export function DocumentForm({
  existing,
  presetRelatedUserId,
  presetTeamId,
  lockPerson,
  onDone,
  onCancel,
}: Props) {
  const { profile, user } = useApp();
  const clubId = profile?.club_id ?? null;
  const qc = useQueryClient();
  const teams = useEditableTeams("documentos");
  const { canEditTeam } = useTeamAccess("documentos");
  const canClubWide = canEditTeam(null);

  const [title, setTitle] = React.useState(existing?.title ?? "");
  const [category, setCategory] = React.useState<DocumentCategory>(existing?.category ?? "institucional");
  const [teamId, setTeamId] = React.useState<string>(existing?.team_id ?? presetTeamId ?? "");
  const [relatedUserId, setRelatedUserId] = React.useState<string>(
    existing?.related_user_id ?? presetRelatedUserId ?? "",
  );
  const [issueDate, setIssueDate] = React.useState(existing?.issue_date ?? "");
  const [expiryDate, setExpiryDate] = React.useState(existing?.expiry_date ?? "");
  const [description, setDescription] = React.useState(existing?.description ?? "");
  const [tags, setTags] = React.useState((existing?.tags ?? []).join(", "));
  const [file, setFile] = React.useState<File | null>(null);

  const { data: people } = useQuery({
    queryKey: ["doc-people", clubId ?? "none"],
    enabled: !!clubId && !lockPerson,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("club_id", clubId!)
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!clubId) throw new Error("Sin club activo");
      if (!title.trim()) throw new Error("El título es requerido");
      if (!existing && !file) throw new Error("Selecciona un archivo");
      if (teamId ? !canEditTeam(teamId) : !canClubWide) {
        throw new Error("No tienes permiso de edición en esa categoría");
      }
      if (issueDate && expiryDate && expiryDate < issueDate) {
        throw new Error("El vencimiento no puede ser anterior a la emisión");
      }

      let file_path = existing?.file_path ?? "";
      let file_type: string | null = existing?.file_type ?? null;
      let file_size: number | null = existing?.file_size ?? null;

      if (file) {
        const ext = fileExtOf(file.name) ?? "bin";
        const docId = existing?.id ?? crypto.randomUUID();
        const path = `${clubId}/${docId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) throw upErr;
        if (existing?.file_path) await supabase.storage.from("documents").remove([existing.file_path]);
        file_path = path;
        file_type = ext;
        file_size = file.size;
      }

      const payload = {
        club_id: clubId,
        title: title.trim(),
        description: description.trim() || null,
        category,
        file_path,
        file_type,
        file_size,
        related_user_id: relatedUserId || null,
        team_id: teamId || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean).length
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
        uploaded_by: existing?.uploaded_by ?? user.id,
      };

      if (existing) {
        const { error } = await supabase.from("documents").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("documents").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Documento actualizado" : "Documento subido");
      qc.invalidateQueries({ queryKey: ["documents"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  return (
    <>
      <EntitySheetBody>
        <FormSection title="Archivo">
          <label
            htmlFor="doc-file"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 hover:border-white/25"
          >
            {file ? (
              <FileText className="h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {file ? file.name : (existing?.file_path.split("/").pop() ?? "Seleccionar archivo (PDF o imagen)")}
            </span>
            {file ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setFile(null);
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <input
              id="doc-file"
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </FormSection>

        <FormSection title="Identificación">
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Título *</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={teamId || NONE} onValueChange={(v) => setTeamId(v === NONE ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todo el club" />
                </SelectTrigger>
                <SelectContent>
                  {canClubWide ? <SelectItem value={NONE}>Todo el club</SelectItem> : null}
                  {teams.map((t) => (
                    <SelectItem key={t.id!} value={t.id!}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        {!lockPerson ? (
          <FormSection
            title="Asignación"
            hint="Si asignas una persona, el documento es personal y aparece en su perfil."
          >
            <Select value={relatedUserId || NONE} onValueChange={(v) => setRelatedUserId(v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Documento general" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Documento general (sin persona)</SelectItem>
                {(people ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.email ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormSection>
        ) : null}

        <FormSection title="Vigencia">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-issue">Emisión</Label>
              <Input id="doc-issue" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-expiry">Vencimiento</Label>
              <Input id="doc-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Detalles">
          <div className="space-y-1.5">
            <Label htmlFor="doc-desc">Notas</Label>
            <Textarea id="doc-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-tags">Etiquetas</Label>
            <Input
              id="doc-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="contrato, 2026, temporada"
            />
          </div>
        </FormSection>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={onCancel} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button className="glow-primary" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : existing ? "Guardar cambios" : "Subir documento"}
        </Button>
      </EntitySheetFooter>
    </>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        {hint ? <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
