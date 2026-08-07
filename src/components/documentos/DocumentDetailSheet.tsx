import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Trash2, FileText, User as UserIcon } from "lucide-react";
import { DetailSheet, DetailField, DetailGrid, DetailEmpty } from "@/components/squad/DetailSheet";
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

/** Ficha de lectura de un documento: vista previa + descarga. Editar abre el DocumentFormDialog existente. */
export function DocumentDetailSheet({ open, onOpenChange, doc, canEdit, onEdit }: Props) {
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
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        size="xl"
        title={
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">{doc.title}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <StatusBadge variant="info">{CATEGORY_LABEL[doc.category]}</StatusBadge>
            {doc.related_user?.full_name ? <span>· {doc.related_user.full_name}</span> : null}
            {doc.team?.name ? <span>· {doc.team.name}</span> : null}
            {doc.issue_date ? <span>· Emitido {doc.issue_date}</span> : null}
            {doc.expiry_date ? <span>· Vence {doc.expiry_date}</span> : null}
          </span>
        }
        headerActions={
          canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-status-rejected hover:bg-destructive/10 hover:text-status-rejected"
              onClick={() => setConfirmDel(true)}
              disabled={del.isPending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </Button>
          ) : null
        }
        canEdit={canEdit}
        renderEdit={undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {canEdit ? (
              <Button type="button" variant="secondary" onClick={() => onEdit?.(doc)}>
                Editar
              </Button>
            ) : null}
            {signedUrl ? (
              <Button asChild>
                <a href={signedUrl} target="_blank" rel="noreferrer" download>
                  <Download className="mr-2 h-4 w-4" /> Descargar
                </a>
              </Button>
            ) : null}
          </>
        }
      >
        {doc.description ? (
          <DetailField label="Descripción">
            <span className="whitespace-pre-wrap">{doc.description}</span>
          </DetailField>
        ) : null}

        <div className="w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {!signedUrl ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Cargando vista previa…</p>
          ) : isPdfExt(ext) ? (
            <iframe src={signedUrl} title={doc.title} className="block h-[55dvh] w-full sm:h-[60vh]" />
          ) : isImageExt(ext) ? (
            <img
              src={signedUrl}
              alt={doc.title}
              className="mx-auto block max-h-[55dvh] w-auto max-w-full object-contain sm:max-h-[60vh]"
            />
          ) : (
            <div className="space-y-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo.</p>
              <Button asChild variant="secondary">
                <a href={signedUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Descargar
                </a>
              </Button>
            </div>
          )}
        </div>

        <DetailGrid>
          <DetailField label="Categoría">{CATEGORY_LABEL[doc.category]}</DetailField>
          <DetailField label="Equipo">{doc.team?.name ?? <DetailEmpty>Todo el club</DetailEmpty>}</DetailField>
          <DetailField label="Fecha de emisión">{doc.issue_date ?? <DetailEmpty />}</DetailField>
          <DetailField label="Fecha de vencimiento">{doc.expiry_date ?? <DetailEmpty />}</DetailField>
        </DetailGrid>

        <DetailField label="Subido por" icon={UserIcon}>
          {uploaderName ?? "—"} · {uploadedAt}
        </DetailField>

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
      </DetailSheet>

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
