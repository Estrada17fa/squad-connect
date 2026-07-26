import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/components/squad/AppLayout";
import {
  DOCUMENT_CATEGORIES,
  fileExtOf,
  type DocumentCategory,
  type DocumentRow,
} from "@/hooks/useDocuments";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: DocumentRow | null;
  /** Prefija persona relacionada (ficha de plantel). */
  presetRelatedUserId?: string | null;
  /** Prefija equipo. */
  presetTeamId?: string | null;
}

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
}
interface TeamOpt {
  id: string;
  name: string;
  category: string | null;
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  existing,
  presetRelatedUserId,
  presetTeamId,
}: Props) {
  const { profile, user } = useApp();
  const clubId = profile?.club_id ?? null;
  const qc = useQueryClient();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<DocumentCategory>("institucional");
  const [relatedUserId, setRelatedUserId] = React.useState<string>("");
  const [teamId, setTeamId] = React.useState<string>("");
  const [issueDate, setIssueDate] = React.useState<string>("");
  const [expiryDate, setExpiryDate] = React.useState<string>("");
  const [tags, setTags] = React.useState<string>("");
  const [file, setFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setCategory(existing.category);
      setRelatedUserId(existing.related_user_id ?? "");
      setTeamId(existing.team_id ?? "");
      setIssueDate(existing.issue_date ?? "");
      setExpiryDate(existing.expiry_date ?? "");
      setTags((existing.tags ?? []).join(", "));
      setFile(null);
    } else {
      setTitle("");
      setDescription("");
      setCategory("institucional");
      setRelatedUserId(presetRelatedUserId ?? "");
      setTeamId(presetTeamId ?? "");
      setIssueDate("");
      setExpiryDate("");
      setTags("");
      setFile(null);
    }
  }, [open, existing, presetRelatedUserId, presetTeamId]);

  // Cargar personas y equipos del club para los selects
  const { data: people } = useQuery({
    queryKey: ["doc-people", clubId ?? "none"],
    enabled: !!clubId && open,
    staleTime: 60_000,
    queryFn: async (): Promise<ProfileOption[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("club_id", clubId!)
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ProfileOption[];
    },
  });
  const { data: teams } = useQuery({
    queryKey: ["doc-teams", clubId ?? "none"],
    enabled: !!clubId && open,
    staleTime: 60_000,
    queryFn: async (): Promise<TeamOpt[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category")
        .eq("club_id", clubId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as TeamOpt[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!clubId) throw new Error("Sin club activo");
      if (!title.trim()) throw new Error("El título es requerido");
      if (!existing && !file) throw new Error("Selecciona un archivo");

      const tagArr = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

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
        // Eliminar el anterior si es edición
        if (existing?.file_path) {
          await supabase.storage.from("documents").remove([existing.file_path]);
        }
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
        tags: tagArr.length ? tagArr : null,
        uploaded_by: user.id,
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
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg glass border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display">
            {existing ? "Editar documento" : "Subir documento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Archivo{existing ? " (opcional para reemplazar)" : ""}</Label>
            <label
              htmlFor="doc-file"
              className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 cursor-pointer hover:border-white/25"
            >
              {file ? <FileText className="h-5 w-5 text-primary" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm text-muted-foreground truncate">
                {file ? file.name : existing?.file_path.split("/").pop() ?? "Seleccionar archivo…"}
              </span>
              {file ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                  }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <input
                id="doc-file"
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Título *</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Equipo (opcional)</Label>
              <Select value={teamId || "__none"} onValueChange={(v) => setTeamId(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todo el club" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Todo el club</SelectItem>
                  {(teams ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Persona relacionada (opcional)</Label>
            <Select value={relatedUserId || "__none"} onValueChange={(v) => setRelatedUserId(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Documento general" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Documento general</SelectItem>
                {(people ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email ?? p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-desc">Descripción</Label>
            <Textarea id="doc-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-issue">Fecha de emisión</Label>
              <Input id="doc-issue" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-expiry">Fecha de vencimiento</Label>
              <Input id="doc-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-tags">Etiquetas (separadas por coma)</Label>
            <Input id="doc-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="contrato, 2026, temporada" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Guardando…" : existing ? "Guardar cambios" : "Subir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
