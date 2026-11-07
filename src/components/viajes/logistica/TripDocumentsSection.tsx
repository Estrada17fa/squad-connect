import * as React from "react";
import { toast } from "sonner";
import { FileText, Plus } from "lucide-react";
import { DeleteAction } from "./DeleteAction";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, TextArea, TextField, TripSheet } from "@/components/coord/viajes/form";
import { DOCUMENT_CATEGORIES, CATEGORY_LABEL, type DocumentCategory } from "@/hooks/useDocuments";
import {
  openTripDocument,
  useTripDocumentMutations,
  useTripDocuments,
  type TripDocument,
} from "@/hooks/useTripDocuments";
import { TimelineSection } from "./TimelineSection";

interface Props {
  tripId: string;
  clubId: string;
  teamId: string | null;
  userId: string;
  canEdit: boolean;
}

/** Documentos del viaje (itinerario, credenciales, lista de buena fe…). */
export function TripDocumentsSection({ tripId, clubId, teamId, userId, canEdit }: Props) {
  const docs = useTripDocuments(tripId).data ?? [];
  const [open, setOpen] = React.useState(false);
  const { remove } = useTripDocumentMutations(tripId, clubId, teamId);

  const openDoc = async (d: TripDocument) => {
    try {
      await openTripDocument(d.file_path);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo abrir el documento");
    }
  };

  return (
    <>
      <TimelineSection icon={FileText} title="Documentos" count={docs.length} emptyLabel="Sin documentos del viaje.">
        {docs.map((d) => (
          <article key={d.id} className="glass flex items-start gap-2 p-3">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openDoc(d)}>
              <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABEL[d.category]}
                {d.file_type ? ` · ${d.file_type.toUpperCase()}` : ""}
              </p>
              {d.description ? <p className="text-xs text-muted-foreground">{d.description}</p> : null}
            </button>
            {canEdit ? (
              <DeleteAction
                iconOnly
                label="Eliminar documento"
                title={`¿Eliminar "${d.title}"?`}
                successMessage="Documento eliminado"
                loading={remove.isPending}
                onDelete={() => remove.mutateAsync({ id: d.id, filePath: d.file_path })}
              />
            ) : null}
          </article>
        ))}

        {canEdit ? (
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Subir documento
          </Button>
        ) : null}
      </TimelineSection>

      {canEdit ? (
        <TripDocumentDialog
          open={open}
          onOpenChange={setOpen}
          tripId={tripId}
          clubId={clubId}
          teamId={teamId}
          userId={userId}
        />
      ) : null}
    </>
  );
}

function TripDocumentDialog({
  open,
  onOpenChange,
  tripId,
  clubId,
  teamId,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  clubId: string;
  teamId: string | null;
  userId: string;
}) {
  const { upload } = useTripDocumentMutations(tripId, clubId, teamId);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<DocumentCategory>("competicion");
  const [file, setFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setCategory("competicion");
    setFile(null);
  }, [open]);

  const submit = () => {
    if (!title.trim()) return toast.error("Ponle un título al documento");
    if (!file) return toast.error("Elige un archivo");
    upload.mutate(
      { input: { title: title.trim(), description: description.trim() || null, category, file }, userId },
      {
        onSuccess: () => {
          toast.success("Documento subido");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo subir el documento"),
      },
    );
  };

  return (
    <TripSheet open={open} onOpenChange={onOpenChange} title="Subir documento"
      primary={{ label: "Subir", onClick: submit, loading: upload.isPending, loadingLabel: "Subiendo…" }}>
      <Field label="Título"><TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lista de buena fe" /></Field>
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-muted-foreground">Categoría</span>
        <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
          <SelectTrigger className="h-11 rounded-xl border-0 bg-muted"><SelectValue /></SelectTrigger>
          <SelectContent>{DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-muted-foreground">Archivo</span>
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-muted px-3 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={file ? "truncate" : "truncate text-muted-foreground"}>{file ? file.name : "Elegir archivo"}</span>
          <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <Field label="Descripción"><TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
    </TripSheet>
  );
}
