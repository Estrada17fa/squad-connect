import * as React from "react";
import { HeartPulse, Pencil, Pill, Stethoscope } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  INJURY_STATUS_LABEL,
  SEVERITY_LABEL,
  usePlayerHealth,
  type InjuryRow,
} from "@/hooks/useHealth";
import { INJURY_STATUS_VARIANT } from "./InjuryDetailSheet";
import { MedicalProfileDialog } from "./MedicalProfileDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  player: {
    userId: string;
    teamId: string;
    fullName: string | null;
    avatarUrl: string | null;
    teamName?: string | null;
  } | null;
  /** Editor de 'salud' en el equipo del jugador. */
  canEdit: boolean;
  onOpenInjury?: (i: InjuryRow) => void;
}

/** Expediente médico completo de un jugador (médico con acceso, o el propio jugador). */
export function PlayerMedicalSheet({ open, onOpenChange, clubId, player, canEdit, onOpenInjury }: Props) {
  const q = usePlayerHealth(open && player ? player.userId : null);
  const [profileOpen, setProfileOpen] = React.useState(false);

  if (!player) return null;
  const data = q.data;

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
        <EntitySheetHeader>
          <EntitySheetTitle>{player.fullName ?? "Jugador"}</EntitySheetTitle>
          <EntitySheetDescription>
            Expediente médico{player.teamName ? ` · ${player.teamName}` : ""}
          </EntitySheetDescription>
        </EntitySheetHeader>

        <EntitySheetBody>
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={player.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>{(player.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">
              Esta información solo la ven el cuerpo médico del equipo y el propio jugador.
            </p>
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Datos base
              </h3>
              {canEdit ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setProfileOpen(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
              ) : null}
            </div>
            <div className="glass grid grid-cols-2 gap-x-4 gap-y-1 p-4 text-sm">
              <Row label="Tipo de sangre" value={data?.profile?.blood_type} />
              <Row label="Alergias" value={data?.profile?.allergies} />
              <Row label="Padecimientos" value={data?.profile?.chronic_conditions} />
              <Row label="Contacto de emergencia" value={data?.profile?.emergency_contact_name} />
              <Row label="Teléfono" value={data?.profile?.emergency_contact_phone} />
              <Row label="Notas" value={data?.profile?.notes} />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Stethoscope className="mr-1 inline h-4 w-4" /> Revisiones
            </h3>
            {(data?.checkups ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin revisiones registradas.</p>
            ) : (
              <ul className="space-y-2">
                {(data?.checkups ?? []).map((c) => (
                  <li key={c.id} className="glass space-y-1 p-3 text-sm">
                    <p className="font-medium text-foreground">{c.reason}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(c.checkup_date)}</p>
                    {c.findings ? <p className="text-muted-foreground">Hallazgos: {c.findings}</p> : null}
                    {c.diagnosis ? <p className="text-muted-foreground">Diagnóstico: {c.diagnosis}</p> : null}
                    {c.notes ? <p className="text-muted-foreground">{c.notes}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Pill className="mr-1 inline h-4 w-4" /> Recetas y tratamientos
            </h3>
            {(data?.prescriptions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin recetas registradas.</p>
            ) : (
              <ul className="space-y-2">
                {(data?.prescriptions ?? []).map((p) => (
                  <li key={p.id} className="glass space-y-1 p-3 text-sm">
                    <p className="font-medium text-foreground">{p.medication}</p>
                    <p className="text-muted-foreground">
                      {[p.dosage, p.duration].filter(Boolean).join(" · ") || "Sin dosis especificada"}
                    </p>
                    {p.instructions ? <p className="text-muted-foreground">{p.instructions}</p> : null}
                    <p className="text-xs text-muted-foreground">{formatDateTime(p.prescribed_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <HeartPulse className="mr-1 inline h-4 w-4" /> Lesiones
            </h3>
            {(data?.injuries ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin lesiones registradas.</p>
            ) : (
              <ul className="space-y-2">
                {(data?.injuries ?? []).map((i) => (
                  <li
                    key={i.id}
                    className="glass space-y-1 p-3 text-sm"
                    role={onOpenInjury ? "button" : undefined}
                    onClick={onOpenInjury ? () => onOpenInjury(i) : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">
                        {i.injury_type} · {i.body_part}
                      </p>
                      <StatusBadge variant={INJURY_STATUS_VARIANT[i.status]}>
                        {INJURY_STATUS_LABEL[i.status]}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {SEVERITY_LABEL[i.severity]} ·{" "}
                      {new Date(`${i.occurred_at}T12:00:00`).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </EntitySheetBody>

        <EntitySheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </EntitySheetFooter>
      </EntitySheet>

      {canEdit ? (
        <MedicalProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          clubId={clubId}
          teamId={player.teamId}
          playerUserId={player.userId}
          profile={data?.profile ?? null}
        />
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value || "—"}</dd>
    </>
  );
}
