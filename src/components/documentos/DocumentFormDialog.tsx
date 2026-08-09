import * as React from "react";
import {
  EntitySheet,
  EntitySheetHeader,
  EntitySheetTitle,
  EntitySheetDescription,
} from "@/components/squad/EntitySheet";
import { DocumentForm } from "./DocumentForm";
import type { DocumentRow } from "@/hooks/useDocuments";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: DocumentRow | null;
  presetRelatedUserId?: string | null;
  presetTeamId?: string | null;
  lockPerson?: boolean;
}

/** Alta (o edición desde una lista) de un documento. */
export function DocumentFormDialog({
  open,
  onOpenChange,
  existing,
  presetRelatedUserId,
  presetTeamId,
  lockPerson,
}: Props) {
  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{existing ? "Editar documento" : "Subir documento"}</EntitySheetTitle>
        <EntitySheetDescription>
          Archivo, tipo, categoría y vigencia. Los documentos con persona asignada van a su perfil.
        </EntitySheetDescription>
      </EntitySheetHeader>
      {open ? (
        <DocumentForm
          key={existing?.id ?? "new"}
          existing={existing}
          presetRelatedUserId={presetRelatedUserId}
          presetTeamId={presetTeamId}
          lockPerson={lockPerson}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </EntitySheet>
  );
}
