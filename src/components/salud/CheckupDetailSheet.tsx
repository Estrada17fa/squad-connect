import * as React from "react";
import { CalendarClock, Pencil, Pill } from "lucide-react";
import {
  DetailSheet,
  DetailField,
  DetailGrid,
  DetailSection,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { formatDateTime } from "@/lib/calendar-utils";
import { CHECKUP_TYPE_LABEL, type CheckupType } from "@/lib/salud";
import { HealthCard, HealthEmpty, HealthPersonHeader } from "./HealthPieces";
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

  const type = (checkup.checkup_type ?? "valoracion") as CheckupType;
  const prescriptions = checkup.prescriptions ?? [];

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={checkup.reason}
      description={`Revisión · ${checkup.player?.full_name ?? "Jugador"}`}
      headerActions={
        canEdit ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(checkup)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <HealthPersonHeader
          name={checkup.player?.full_name ?? "Jugador"}
          avatarUrl={checkup.player?.avatar_url}
          subtitle={checkup.team?.name ?? undefined}
          badges={<StatusBadge variant="info">{CHECKUP_TYPE_LABEL[type]}</StatusBadge>}
        />

        <DetailSection title="Revisión">
          <div className="glass rounded-lg p-4">
            <DetailGrid>
              <DetailField label="Fecha y hora" icon={CalendarClock}>
                {formatDateTime(checkup.checkup_date)}
              </DetailField>
              <DetailField label="Tipo">{CHECKUP_TYPE_LABEL[type]}</DetailField>
              <DetailField label="Motivo" full>
                <DetailValue value={checkup.reason} />
              </DetailField>
              <DetailField label="Hallazgos" full>
                <DetailValue value={checkup.findings} />
              </DetailField>
              <DetailField label="Diagnóstico" full>
                <DetailValue value={checkup.diagnosis} />
              </DetailField>
              <DetailField label="Notas" full>
                <DetailValue value={checkup.notes} />
              </DetailField>
            </DetailGrid>
          </div>
        </DetailSection>

        <DetailSection title="Recetas y tratamiento">
          {prescriptions.length === 0 ? (
            <HealthEmpty icon={Pill} title="Sin recetas" message="Esta revisión no tiene tratamiento asociado." />
          ) : (
            <div className="grid gap-2">
              {prescriptions.map((p) => (
                <HealthCard
                  key={p.id}
                  title={p.medication}
                  badge={
                    <StatusBadge variant="neutral">
                      {[p.dosage, p.duration].filter(Boolean).join(" · ") || "Sin dosis"}
                    </StatusBadge>
                  }
                  metaIcon={CalendarClock}
                  meta={formatDateTime(p.prescribed_at)}
                  note={p.instructions ?? undefined}
                />
              ))}
            </div>
          )}
        </DetailSection>
      </div>
    </DetailSheet>
  );
}
