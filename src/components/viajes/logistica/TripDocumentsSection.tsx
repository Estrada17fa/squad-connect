import * as React from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
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
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  remove.mutate(
                    { id: d.id, filePath: d.file_path },
                    {
                      onSuccess: () => toast.success("Documento eliminado"),
                      onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
                    },
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>Documento del viaje</EntitySheetTitle>
        <EntitySheetDescription>
          También aparecerá en el módulo Documentos, etiquetado con este viaje.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="d-title">Título *</Label>
          <Input
            id="d-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lista de buena fe"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-file">Archivo *</Label>
          <Input id="d-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-desc">Descripción</Label>
          <Textarea id="d-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={upload.isPending} onClick={submit}>
          Subir
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
