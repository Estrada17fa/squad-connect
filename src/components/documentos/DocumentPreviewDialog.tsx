import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Pencil, Trash2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORY_LABEL,
  fileExtOf,
  isImageExt,
  isPdfExt,
  type DocumentRow,
} from "@/hooks/useDocuments";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DocumentRow | null;
  canEdit: boolean;
  onEdit?: (doc: DocumentRow) => void;
}

export function DocumentPreviewDialog({ open, onOpenChange, doc, canEdit, onEdit }: Props) {
  const qc = useQueryClient();
  const { data: signedUrl } = useQuery({
    queryKey: ["doc-signed", doc?.file_path ?? "none"],
    enabled: !!doc && open,
    staleTime: 45_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc!.file_path, 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!doc) return;
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      await supabase.storage.from("documents").remove([doc.file_path]);
    },
    onSuccess: () => {
      toast.success("Documento eliminado");
      qc.invalidateQueries({ queryKey: ["documents"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  if (!doc) return null;
  const ext = doc.file_type ?? fileExtOf(doc.file_path);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl glass border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="truncate">{doc.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge variant="info">{CATEGORY_LABEL[doc.category]}</StatusBadge>
          {doc.related_user?.full_name ? <span>· {doc.related_user.full_name}</span> : null}
          {doc.team?.name ? <span>· {doc.team.name}</span> : null}
          {doc.issue_date ? <span>· Emitido {doc.issue_date}</span> : null}
          {doc.expiry_date ? <span>· Vence {doc.expiry_date}</span> : null}
        </div>

        {doc.description ? (
          <p className="text-sm text-muted-foreground">{doc.description}</p>
        ) : null}

        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 min-h-[300px] flex items-center justify-center">
          {!signedUrl ? (
            <p className="text-sm text-muted-foreground p-6">Cargando vista previa…</p>
          ) : isPdfExt(ext) ? (
            <iframe src={signedUrl} title={doc.title} className="w-full h-[60vh]" />
          ) : isImageExt(ext) ? (
            <img src={signedUrl} alt={doc.title} className="max-h-[60vh] w-auto object-contain" />
          ) : (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo.</p>
              <Button asChild variant="secondary">
                <a href={signedUrl} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Descargar
                </a>
              </Button>
            </div>
          )}
        </div>

        {doc.tags && doc.tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map((t) => (
              <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-white/5">
                #{t}
              </span>
            ))}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {signedUrl ? (
            <Button asChild variant="secondary">
              <a href={signedUrl} target="_blank" rel="noreferrer" download>
                <Download className="h-4 w-4 mr-2" /> Descargar
              </a>
            </Button>
          ) : null}
          {canEdit ? (
            <>
              <Button variant="ghost" onClick={() => onEdit?.(doc)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
              <Button
                variant="ghost"
                className="text-status-rejected"
                onClick={() => {
                  if (confirm("¿Eliminar este documento?")) del.mutate();
                }}
                disabled={del.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
