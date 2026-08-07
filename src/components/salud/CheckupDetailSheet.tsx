import * as React from "react";
import { Pencil } from "lucide-react";
import { DetailSheet, DetailField, DetailSection, DetailEmpty } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/squad/TeamFilter";
import { formatDateTime } from "@/lib/calendar-utils";
import type { CheckupRow } from "@/hooks/useHealth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  checkup: CheckupRow | null;
  canEdit: boolean;
  onEdit: (c: CheckupRow) => void;
}

/** Ficha de lectura de una revisión médica. Editar abre el CheckupFormDialog existente. */
export function CheckupDetailSheet({ open, onOpenChange, checkup, canEdit, onEdit }: Props) {
  if (!checkup) return null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={checkup.player?.full_name ?? "Jugador"}
      description={checkup.reason}
      headerActions={
        canEdit ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(checkup)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
          </Button>
        ) : null
      }
    >
      <div className="flex items-center gap-2">
        <TeamBadge name={checkup.team?.name} />
      </div>

      <DetailField label="Fecha y hora">{formatDateTime(checkup.checkup_date)}</DetailField>
      <DetailField label="Motivo">{checkup.reason}</DetailField>
      <DetailField label="Hallazgos">
        {checkup.findings ? <span className="whitespace-pre-wrap">{checkup.findings}</span> : <DetailEmpty />}
      </DetailField>
      <DetailField label="Diagnóstico">
        {checkup.diagnosis ? <span className="whitespace-pre-wrap">{checkup.diagnosis}</span> : <DetailEmpty />}
      </DetailField>
      <DetailField label="Notas">
        {checkup.notes ? <span className="whitespace-pre-wrap">{checkup.notes}</span> : <DetailEmpty />}
      </DetailField>

      {(checkup.prescriptions ?? []).length ? (
        <DetailSection title="Recetas y tratamientos">
          <ul className="space-y-2">
            {(checkup.prescriptions ?? []).map((p) => (
              <li key={p.id} className="glass space-y-1 p-3 text-sm">
                <p className="font-medium text-foreground">{p.medication}</p>
                <p className="text-muted-foreground">
                  {[p.dosage, p.duration].filter(Boolean).join(" · ") || "Sin dosis especificada"}
                </p>
                {p.instructions ? <p className="text-muted-foreground">{p.instructions}</p> : null}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
    </DetailSheet>
  );
}
