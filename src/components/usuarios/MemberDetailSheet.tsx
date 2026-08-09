import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  RotateCcw,
  Shield,
  Trash2,
  UserMinus,
  Pencil,
  Plus,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DetailSheet,
  DetailSection,
  DetailField,
  DetailGrid,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { EmptyState } from "@/components/squad/EmptyState";
import { formatShortDate } from "@/lib/calendar-utils";
import { PLAYER_STATUS_LABEL, type PlayerStatus } from "@/lib/members.schemas";
import { UserAdvancedSettings, type MembershipCtx } from "./UserAdvancedSettings";
import {
  displayName,
  initials,
  roleVariant,
  type MemberProfile,
  type MembershipLite,
} from "./memberUtils";

/**
 * Ficha del miembro: SIEMPRE abre en lectura. Las acciones de gestión solo
 * aparecen para quien administra usuarios (editor global).
 */
export function MemberDetailSheet({
  open,
  onOpenChange,
  clubId,
  member,
  memberships,
  canManage,
  onEdit,
  onAddMembership,
  onDeactivate,
  onReactivate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  member: MemberProfile;
  memberships: MembershipLite[];
  canManage: boolean;
  onEdit: () => void;
  onAddMembership: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const name = displayName(member);
  const isBaja = (member.status ?? "activo") === "baja";
  const isPlayer = memberships.some((m) => (m.roleName ?? "").toLowerCase().includes("jugador"));

  const playerQ = useQuery({
    queryKey: ["member-player-profile", member.id],
    enabled: open && isPlayer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_profiles")
        .select(
          "jersey_number, position, secondary_position, preferred_foot, height_cm, weight_kg, nationality, player_status",
        )
        .eq("user_id", member.id)
        .is("archived_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const player = playerQ.data as any | null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description={member.email ?? undefined}
      headerActions={
        canManage ? (
          <>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={onAddMembership}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Membresía
            </Button>
            {isBaja ? (
              <Button size="sm" variant="ghost" onClick={onReactivate}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reactivar
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={onDeactivate}>
                <UserMinus className="mr-2 h-3.5 w-3.5" /> Dar de baja
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {member.avatar_url ? <AvatarImage src={member.avatar_url} alt={name} /> : null}
            <AvatarFallback className="text-base font-semibold">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1.5">
            <p className="truncate font-display text-lg font-semibold leading-tight">{name}</p>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge variant={isBaja ? "rejected" : "approved"}>
                {isBaja ? "Baja" : "Activo"}
              </StatusBadge>
              {Array.from(new Set(memberships.map((m) => m.roleName).filter(Boolean))).map((r) => (
                <StatusBadge key={r as string} variant={roleVariant(r as string)}>
                  {r}
                </StatusBadge>
              ))}
              {member.name_completed === false ? (
                <StatusBadge variant="pending">Completar nombre</StatusBadge>
              ) : null}
            </div>
          </div>
        </div>

        <DetailSection title="Contacto">
          <DetailGrid>
            <DetailField label="Correo" icon={Mail}>
              <DetailValue value={member.email} />
            </DetailField>
            <DetailField label="Teléfono" icon={Phone}>
              <DetailValue value={member.phone ?? null} />
            </DetailField>
            {member.created_at ? (
              <DetailField label="Alta" icon={CalendarDays}>
                {formatShortDate(member.created_at)}
              </DetailField>
            ) : null}
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Membresías">
          {memberships.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="Sin membresías"
              message="Esta persona aún no pertenece a ninguna categoría."
            />
          ) : (
            <div className="grid gap-2">
              {memberships.map((m) => (
                <div key={m.id} className="glass flex items-center gap-3 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.teamName ?? "Todo el club"}</p>
                    {m.job_title ? (
                      <p className="truncate text-xs text-muted-foreground">{m.job_title}</p>
                    ) : null}
                  </div>
                  <StatusBadge variant={roleVariant(m.roleName)}>{m.roleName ?? "—"}</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        {isPlayer && player ? (
          <DetailSection title="Datos deportivos">
            <DetailGrid>
              <DetailField label="Dorsal">
                <DetailValue value={player.jersey_number} />
              </DetailField>
              <DetailField label="Posición">
                <DetailValue value={player.position} />
              </DetailField>
              <DetailField label="Pie hábil">
                <DetailValue value={player.preferred_foot} />
              </DetailField>
              <DetailField label="Estatus">
                {player.player_status ? (
                  <StatusBadge variant={player.player_status === "activo" ? "approved" : "pending"}>
                    {PLAYER_STATUS_LABEL[player.player_status as PlayerStatus] ?? player.player_status}
                  </StatusBadge>
                ) : (
                  <DetailValue value={null} />
                )}
              </DetailField>
              <DetailField label="Estatura">
                <DetailValue value={player.height_cm ? `${player.height_cm} cm` : null} />
              </DetailField>
              <DetailField label="Peso">
                <DetailValue value={player.weight_kg ? `${player.weight_kg} kg` : null} />
              </DetailField>
            </DetailGrid>
          </DetailSection>
        ) : null}

        {canManage ? (
          <UserAdvancedSettings
            clubId={clubId}
            userId={member.id}
            canEdit
            memberships={memberships.map<MembershipCtx>((m) => ({
              id: m.id,
              teamId: m.team_id,
              roleId: m.role_id,
              label: `${m.teamName ?? "Todo el club"} · ${m.roleName ?? ""}`,
            }))}
          />
        ) : null}
      </div>
    </DetailSheet>
  );
}
