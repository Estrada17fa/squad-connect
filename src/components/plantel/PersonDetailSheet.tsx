import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  Flag,
  Footprints,
  Layers,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Shirt,
  Weight,
} from "lucide-react";
import {
  DetailSheet,
  DetailSection,
  DetailField,
  DetailGrid,
  DetailValue,
  DetailLink,
} from "@/components/squad/DetailSheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { formatShortDate } from "@/lib/calendar-utils";
import { initials } from "@/components/usuarios/memberUtils";
import type { RosterMember } from "@/hooks/useRoster";
import { AVAILABILITY_META, PREFERRED_FOOT_LABEL } from "@/lib/plantel";

/**
 * Ficha de Plantel: SIEMPRE lectura. Editar se hace en Usuarios; aquí solo
 * ofrecemos el atajo para quien administra usuarios.
 */
export function PersonDetailSheet({
  open,
  onOpenChange,
  member,
  canEditUsers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: RosterMember;
  canEditUsers: boolean;
}) {
  const navigate = useNavigate();
  const name = member.fullName ?? "Sin nombre";
  const isPlayer = member.baseRole === "jugador";
  const meta = member.availability ? AVAILABILITY_META[member.availability] : null;
  const foot = member.preferredFoot ? PREFERRED_FOOT_LABEL[member.preferredFoot] ?? member.preferredFoot : null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description={isPlayer ? member.position ?? "Sin posición" : member.jobTitle ?? member.roleName ?? undefined}
      headerActions={
        <>
          {isPlayer && member.playerId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                navigate({ to: "/m/plantel/$playerId", params: { playerId: member.playerId! } })
              }
            >
              <ClipboardList className="mr-2 h-3.5 w-3.5" /> Ver expediente
            </Button>
          ) : null}
          {canEditUsers ? (
            <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/m/usuarios" })}>
              <ArrowUpRight className="mr-2 h-3.5 w-3.5" /> Editar en Usuarios
            </Button>
          ) : null}
        </>
      }

    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20">
              {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={name} /> : null}
              <AvatarFallback className="text-lg font-semibold">{initials(name)}</AvatarFallback>
            </Avatar>
            {isPlayer && member.jerseyNumber != null ? (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-primary px-2 py-0.5 font-display text-xs font-bold text-primary-foreground">
                {member.jerseyNumber}
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="break-words font-display text-lg font-semibold leading-tight [overflow-wrap:anywhere]">
              {name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {member.roleName ? <StatusBadge variant="info">{member.roleName}</StatusBadge> : null}
              {isPlayer && meta ? <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge> : null}
              {member.teamName ? <StatusBadge variant="pending">{member.teamName}</StatusBadge> : null}
            </div>
          </div>
        </div>

        {isPlayer ? (
          <DetailSection title="Datos deportivos">
            <DetailGrid>
              <DetailField label="Dorsal" icon={Shirt}>
                <DetailValue value={member.jerseyNumber} />
              </DetailField>
              <DetailField label="Posición">
                <DetailValue value={member.position} />
              </DetailField>
              <DetailField label="Posición secundaria">
                <DetailValue value={member.secondaryPosition} />
              </DetailField>
              <DetailField label="Pie hábil" icon={Footprints}>
                <DetailValue value={foot} />
              </DetailField>
              <DetailField label="Estatura" icon={Ruler}>
                <DetailValue value={member.heightCm ? `${member.heightCm} cm` : null} />
              </DetailField>
              <DetailField label="Peso" icon={Weight}>
                <DetailValue value={member.weightKg ? `${member.weightKg} kg` : null} />
              </DetailField>
            </DetailGrid>
          </DetailSection>
        ) : null}

        <DetailSection title="Perfil">
          <DetailGrid>
            <DetailField label="Categoría" icon={Layers}>
              <DetailValue value={member.teamName ?? "Todo el club"} />
            </DetailField>
            <DetailField label="Puesto" icon={Briefcase}>
              <DetailValue value={member.jobTitle ?? member.roleName} />
            </DetailField>
            {isPlayer ? (
              <>
                <DetailField label="Nacionalidad" icon={Flag}>
                  <DetailValue value={member.nationality} />
                </DetailField>
                <DetailField label="Lugar de nacimiento" icon={MapPin}>
                  <DetailValue value={member.birthplace} />
                </DetailField>
              </>
            ) : null}
            {member.birthdate ? (
              <DetailField label="Nacimiento" icon={CalendarDays}>
                {formatShortDate(member.birthdate)}
              </DetailField>
            ) : null}
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Contacto">
          <DetailGrid>
            <DetailField label="Correo" icon={Mail} full>
              <DetailLink value={member.email} type="email" />
            </DetailField>
            <DetailField label="Teléfono" icon={Phone}>
              <DetailLink value={member.phone} type="tel" />
            </DetailField>
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailSheet>
  );
}
