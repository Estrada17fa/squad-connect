import * as React from "react";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useDocuments, type DocumentRow } from "@/hooks/useDocuments";
import { DocumentCard } from "./DocumentCard";
import { DocumentDetailSheet } from "./DocumentDetailSheet";
import { DocumentFormDialog } from "./DocumentFormDialog";

/**
 * Documentos PERSONALES de una persona (contrato, credencial, INE…).
 * Se muestran en su perfil, no en el módulo Documentos.
 */
export function PersonDocumentsSection({
  clubId,
  userId,
  canEdit,
  title = "Documentos asignados",
}: {
  clubId: string | null;
  userId: string;
  canEdit?: boolean;
  title?: string;
}) {
  const { data, isLoading } = useDocuments({ clubId, relatedUserId: userId, scope: "personal" });
  const [selected, setSelected] = React.useState<DocumentRow | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);

  const docs = data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {canEdit ? (
          <Button size="sm" variant="secondary" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Agregar
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <CardGridSkeleton count={2} />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos"
          message="Cuando el club asigne documentos personales, aparecerán aquí."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {docs.map((d) => (
            <DocumentCard
              key={d.id}
              doc={d}
              onOpen={(doc) => {
                setSelected(doc);
                setDetailOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <DocumentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        doc={selected}
        canEdit={canEdit}
        lockPerson
      />
      <DocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        presetRelatedUserId={userId}
        lockPerson
      />
    </section>
  );
}
