import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Trash2, User as UserIcon } from "lucide-react";
import {
  DetailSheet,
  DetailField,
  DetailGrid,
  DetailEmpty,
  DetailSection,
} from "@/components/squad/DetailSheet";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { DocumentForm } from "./DocumentForm";
import {
  CATEGORY_LABEL,
  expiryStateOf,
  fileExtOf,
  formatDocDate,
  formatFileSize,
  isImageExt,
  isPdfExt,
  type DocumentRow,
} from "@/hooks/useDocuments";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: DocumentRow | null;
  /** Puede editar/eliminar este documento (según su categoría). */
  canEdit?: boolean;
  lockPerson?: boolean;
}

/** Ficha del documento: siempre abre en lectura, con previa y descarga. */
export function DocumentDetailSheet({ open, onOpenChange, doc, canEdit, lockPerson }: Props) {
  const qc = useQueryClient();
  const [confirmDel, setConfirmDel] = React.useState(false);

  const { data: signedUrl } = useQuery({
    queryKey: ["doc-signed", doc?.file_path ?? "none"],
    enabled: !!doc && open,
    staleTime: 45_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc!.file_path, 60);
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
  const state = expiryStateOf(doc.expiry_date);
  const vigencia =
    state === "expired"
      ? { label: "Vencido", variant: "rejected" as const }
      : state === "soon"
        ? { label: "Por vencer", variant: "pending" as const }
        : state === "ok"
          ? { label: "Vigente", variant: "approved" as const }
          : null;

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        size="xl"
        canEdit={canEdit}
        title={
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <span className="break-words [overflow-wrap:anywhere]">{doc.title}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge variant="info">{CATEGORY_LABEL[doc.category]}</StatusBadge>
            {vigencia ? <StatusBadge variant={vigencia.variant}>{vigencia.label}</StatusBadge> : null}
            <span className="text-xs text-muted-foreground">{doc.team?.name ?? "Todo el club"}</span>
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
        renderEdit={
          canEdit
            ? ({ done, cancel }) => (
                <DocumentForm key={doc.id} existing={doc} lockPerson={lockPerson} onDone={done} onCancel={cancel} />
              )
            : undefined
        }
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {signedUrl ? (
              <Button asChild className="glow-primary">
                <a href={signedUrl} target="_blank" rel="noreferrer" download>
                  <Download className="mr-2 h-4 w-4" /> Descargar
                </a>
              </Button>
            ) : null}
          </>
        }
      >
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
              <p className="text-sm text-muted-foreground">Vista previa no disponible para este archivo.</p>
              <Button asChild variant="secondary">
                <a href={signedUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Descargar
                </a>
              </Button>
            </div>
          )}
        </div>

        <DetailSection title="Clasificación">
          <DetailGrid>
            <DetailField label="Tipo">{CATEGORY_LABEL[doc.category]}</DetailField>
            <DetailField label="Categoría">{doc.team?.name ?? <DetailEmpty>Todo el club</DetailEmpty>}</DetailField>
            <DetailField label="Asignado a" icon={UserIcon}>
              {doc.related_user?.full_name ?? <DetailEmpty>Documento general</DetailEmpty>}
            </DetailField>
            <DetailField label="Archivo">
              {(ext ? ext.toUpperCase() : "Archivo") +
                (formatFileSize(doc.file_size) ? ` · ${formatFileSize(doc.file_size)}` : "")}
            </DetailField>
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Vigencia">
          <DetailGrid>
            <DetailField label="Emisión">{formatDocDate(doc.issue_date) ?? <DetailEmpty />}</DetailField>
            <DetailField label="Vencimiento">{formatDocDate(doc.expiry_date) ?? <DetailEmpty />}</DetailField>
          </DetailGrid>
        </DetailSection>

        {doc.description || (doc.tags && doc.tags.length) ? (
          <DetailSection title="Detalles">
            {doc.description ? (
              <DetailField label="Notas" full>
                <span className="whitespace-pre-wrap">{doc.description}</span>
              </DetailField>
            ) : null}
            {doc.tags && doc.tags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {doc.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-white/5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </DetailSection>
        ) : null}

        <DetailField label="Subido por" icon={UserIcon}>
          {(doc.uploader?.full_name ?? "—") + " · " + (formatDocDate(doc.created_at) ?? "")}
        </DetailField>
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
