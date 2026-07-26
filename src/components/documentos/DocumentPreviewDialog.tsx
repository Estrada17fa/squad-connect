import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Pencil, Trash2, FileText, User as UserIcon } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [confirmDel, setConfirmDel] = React.useState(false);

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
      setConfirmDel(false);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  if (!doc) return null;
  const ext = doc.file_type ?? fileExtOf(doc.file_path);
  const uploaderName = doc.uploader?.full_name ?? null;
  const uploadedAt = new Date(doc.created_at).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{doc.title}</span>
          </EntitySheetTitle>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <StatusBadge variant="info">{CATEGORY_LABEL[doc.category]}</StatusBadge>
            {doc.related_user?.full_name ? <span>· {doc.related_user.full_name}</span> : null}
            {doc.team?.name ? <span>· {doc.team.name}</span> : null}
            {doc.issue_date ? <span>· Emitido {doc.issue_date}</span> : null}
            {doc.expiry_date ? <span>· Vence {doc.expiry_date}</span> : null}
          </div>
        </EntitySheetHeader>

        <EntitySheetBody>
          {doc.description ? (
            <p className="text-sm text-muted-foreground">{doc.description}</p>
          ) : null}

          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 w-full max-w-full">
            {!signedUrl ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Cargando vista previa…</p>
            ) : isPdfExt(ext) ? (
              <iframe
                src={signedUrl}
                title={doc.title}
                className="w-full h-[55dvh] sm:h-[60vh] block"
              />
            ) : isImageExt(ext) ? (
              <img
                src={signedUrl}
                alt={doc.title}
                className="mx-auto max-h-[55dvh] sm:max-h-[60vh] w-auto max-w-full object-contain block"
              />
            ) : (
              <div className="p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vista previa no disponible para este tipo de archivo.
                </p>
                <Button asChild variant="secondary">
                  <a href={signedUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Descargar
                  </a>
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5" />
            <span className="truncate">
              Subido por {uploaderName ?? "—"} · {uploadedAt}
            </span>
          </div>

          {doc.tags && doc.tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-white/5"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}
        </EntitySheetBody>

        <EntitySheetFooter>
          {canEdit ? (
            <>
              <Button
                variant="ghost"
                className="text-status-rejected sm:mr-auto"
                onClick={() => setConfirmDel(true)}
                disabled={del.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </Button>
              <Button variant="ghost" onClick={() => onEdit?.(doc)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
            </>
          ) : null}
          {signedUrl ? (
            <Button asChild>
              <a href={signedUrl} target="_blank" rel="noreferrer" download>
                <Download className="h-4 w-4 mr-2" /> Descargar
              </a>
            </Button>
          ) : null}
        </EntitySheetFooter>
      </EntitySheet>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo se eliminará del almacenamiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                del.mutate();
              }}
              disabled={del.isPending}
              className="bg-status-rejected text-white hover:bg-status-rejected/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
