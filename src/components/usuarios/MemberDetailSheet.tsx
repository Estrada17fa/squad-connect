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
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { removeMembership } from "@/lib/members.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { EditMembershipDialog } from "./EditMembershipDialog";
import type { RoleRow } from "./AddMembershipDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  DetailSheet,
  DetailSection,
  DetailField,
  DetailGrid,
  DetailValue,
  DetailLink,
} from "@/components/squad/DetailSheet";
import { PersonDocumentsSection } from "@/components/documentos/PersonDocumentsSection";

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
import { usePlayerLatestAnthro } from "@/hooks/useNutrition";
import { formatShortDay } from "@/lib/nutricion";

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
  roles = [],
  onMembershipsChanged,
}: {
  roles?: RoleRow[];
  onMembershipsChanged?: () => void;
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
  const removeFn = useServerFn(removeMembership);
  const [editing, setEditing] = React.useState<MembershipLite | null>(null);
  const [removing, setRemoving] = React.useState<MembershipLite | null>(null);
  const [removeBusy, setRemoveBusy] = React.useState(false);
  const isLast = memberships.length <= 1;

  async function confirmRemove() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await removeFn({ data: { membership_id: removing.id } });
      toast.success("Membresía quitada");
      setRemoving(null);
      onMembershipsChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo quitar");
    } finally {
      setRemoveBusy(false);
    }
  }

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
  // Peso y talla: fuente única = último estudio antropométrico (Nutrición).
  const { data: anthro } = usePlayerLatestAnthro(player?.user_id ?? null);

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
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            {member.avatar_url ? <AvatarImage src={member.avatar_url} alt={name} /> : null}
            <AvatarFallback className="text-base font-semibold">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="break-words font-display text-lg font-semibold leading-tight [overflow-wrap:anywhere]">
              {name}
            </p>
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
            <DetailField label="Correo" icon={Mail} full>
              <DetailLink value={member.email} type="email" />
            </DetailField>
            <DetailField label="Teléfono" icon={Phone}>
              <DetailLink value={member.phone ?? null} type="tel" />
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
                <div key={m.id} className="glass flex items-start gap-3 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">
                      {m.teamName ?? "Todo el club"}
                    </p>
                    {m.job_title ? (
                      <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        {m.job_title}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <StatusBadge variant={roleVariant(m.roleName)}>{m.roleName ?? "—"}</StatusBadge>
                  </div>
                  {canManage ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Acciones de membresía">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(m)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Editar cargo/rol
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => setRemoving(m)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Quitar membresía
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
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
                <DetailValue value={anthro?.heightCm ? `${anthro.heightCm} cm` : null} />
              </DetailField>
              <DetailField label="Peso">
                <DetailValue value={anthro?.weightKg ? `${anthro.weightKg} kg` : null} />
                {anthro ? (
                  <p className="text-xs text-muted-foreground">
                    Medido el {formatShortDay(anthro.assessedAt)}
                  </p>
                ) : null}
              </DetailField>
            </DetailGrid>
          </DetailSection>
        ) : null}

        <PersonDocumentsSection
          clubId={clubId}
          userId={member.id}
          canEdit={canManage}
          title="Documentos personales"
        />



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
      {canManage ? (
        <>
          <EditMembershipDialog
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
            membership={editing}
            roles={roles}
            onSaved={() => onMembershipsChanged?.()}
          />
          <ConfirmDialog
            open={!!removing}
            onOpenChange={(o) => !o && setRemoving(null)}
            title="Quitar membresía"
            confirmLabel="Quitar"
            loading={removeBusy}
            description={
              isLast
                ? `Es la última membresía de ${name}. Si la quitas, se quedará sin acceso a ninguna categoría del club.`
                : `Se quitará la membresía de ${removing?.teamName ?? "Todo el club"} (${removing?.roleName ?? ""}). Las demás no cambian.`
            }
            onConfirm={confirmRemove}
          />
        </>
      ) : null}
    </DetailSheet>
  );
}
