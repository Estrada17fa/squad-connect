import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Settings2, Sliders, Trash2, User as UserIcon, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { inferBaseRole, groupModulesByPage, type BaseRole } from "@/lib/rolePages";
import type { AccessLevel } from "@/hooks/useAccess";
import { legacyToLevel } from "@/lib/permissions";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MemberForm } from "./MemberForm";
import {
  deactivateClubMember,
  hardDeleteClubMember,
  reactivateClubMember,
} from "@/lib/members.functions";
import { useServerFn } from "@tanstack/react-start";
import { REQUEST_TYPE_MAP, type RequestType } from "@/lib/requestTypes";
import { useMemberApprovals, useSetApproverOverride } from "@/hooks/useRequestApprovers";



const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "Sin acceso" },
  { value: "read", label: "Solo ver" },
  { value: "editor", label: "Editar" },
  { value: "approver", label: "Aprobar" },
];

interface ProfileRow {
  id: string;
  full_name: string | null;
  first_name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  name_completed: boolean | null;
  email: string | null;
  avatar_url: string | null;
  status?: "activo" | "baja" | null;
}


function displayName(p: Pick<ProfileRow, "first_name" | "paternal_last_name" | "maternal_last_name" | "full_name" | "email">) {
  const composed = [p.first_name, p.paternal_last_name, p.maternal_last_name]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return composed || p.full_name || p.email || "Sin nombre";
}
interface RoleRow {
  id: string;
  name: string;
  is_system_default: boolean;
  allows_club_wide: boolean;
}
interface TeamRow {
  id: string;
  name: string;
  category: string | null;
}
interface MembershipRow {
  id: string;
  user_id: string;
  team_id: string | null;
  role_id: string;
  job_title: string | null;
  role: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
}

export function MembersTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUserId, setEditUserId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<"activo" | "baja">("activo");
  const [overrideCtx, setOverrideCtx] = React.useState<{
    userId: string;
    teamId: string | null;
    roleId: string;
    label: string;
  } | null>(null);

  const deactivateFn = useServerFn(deactivateClubMember);
  const reactivateFn = useServerFn(reactivateClubMember);
  const hardDeleteFn = useServerFn(hardDeleteClubMember);

  const membersQ = useQuery({
    queryKey: ["club-members", clubId],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, paternal_last_name, maternal_last_name, name_completed, email, avatar_url, status")
        .eq("club_id", clubId)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as ProfileRow[];
    },

  });

  const rolesQ = useQuery({
    queryKey: ["club-roles-min", clubId],
    queryFn: async (): Promise<RoleRow[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, is_system_default, allows_club_wide")
        .eq("club_id", clubId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const teamsQ = useQuery({
    queryKey: ["club-teams-min", clubId],
    queryFn: async (): Promise<TeamRow[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category")
        .eq("club_id", clubId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const membershipsQ = useQuery({
    queryKey: ["user-memberships", selectedUserId],
    enabled: !!selectedUserId,
    queryFn: async (): Promise<MembershipRow[]> => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("id, user_id, team_id, role_id, job_title, role:roles(id, name), team:teams(id, name)")
        .eq("user_id", selectedUserId!);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (membersQ.data ?? []).filter(
      (m) => (m.status ?? "activo") === statusFilter,
    );
    if (!q) return rows;
    return rows.filter(
      (m) =>
        (m.full_name ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q),
    );
  }, [membersQ.data, search, statusFilter]);


  const selected = (membersQ.data ?? []).find((m) => m.id === selectedUserId) ?? null;

  async function handleRemoveMembership(m: MembershipRow) {
    if (!confirm(`¿Quitar esta membresía (${m.team?.name ?? "Club"} · ${m.role?.name ?? ""})?`)) return;
    const { error } = await supabase.from("team_memberships").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Membresía eliminada");
    qc.invalidateQueries({ queryKey: ["user-memberships", selectedUserId] });
  }

  async function handleChangeRole(m: MembershipRow, roleId: string) {
    if (roleId === m.role_id) return;
    const { error } = await supabase
      .from("team_memberships")
      .update({ role_id: roleId })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Rol actualizado");
    qc.invalidateQueries({ queryKey: ["user-memberships", selectedUserId] });
  }

  async function handleDeactivate(m: ProfileRow) {
    if (!confirm(`¿Dar de baja a ${displayName(m)}? Pierde el acceso pero se conserva todo su historial.`)) return;
    try {
      await deactivateFn({ data: { user_id: m.id } });
      toast.success("Miembro dado de baja");
      qc.invalidateQueries({ queryKey: ["club-members", clubId] });
      qc.invalidateQueries({ queryKey: ["roster"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo dar de baja");
    }
  }

  async function handleReactivate(m: ProfileRow) {
    try {
      await reactivateFn({ data: { user_id: m.id } });
      toast.success("Miembro reactivado");
      qc.invalidateQueries({ queryKey: ["club-members", clubId] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo reactivar");
    }
  }

  async function handleHardDelete(m: ProfileRow) {
    const name = displayName(m);
    const typed = prompt(`Esto elimina la cuenta de forma permanente.\nEscribe "${name}" para confirmar:`);
    if (typed?.trim() !== name) return;
    try {
      await hardDeleteFn({ data: { user_id: m.id } });
      toast.success("Miembro eliminado");
      setSelectedUserId(null);
      qc.invalidateQueries({ queryKey: ["club-members", clubId] });
      qc.invalidateQueries({ queryKey: ["roster"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar");
    }
  }

  if (membersQ.isLoading) return <LoadingState />;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="space-y-3">
        {canEdit ? (
          <Button className="w-full" variant="secondary" onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Crear miembro
          </Button>
        ) : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border/60 p-1">
          {(["activo", "baja"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "activo" ? "Activos" : "Bajas"}
            </button>
          ))}
        </div>

        <div className="grid gap-2">
          {filtered.map((m) => (
            <StandardCard
              key={m.id}
              title={displayName(m)}
              subtitle={m.email ?? undefined}
              icon={UserIcon}
              interactive
              onClick={() => setSelectedUserId(m.id)}
              className={cn(selectedUserId === m.id && "border-primary/60 bg-white/[0.06]")}
            />
          ))}
          {filtered.length === 0 ? (
            <EmptyState title="Sin resultados" message="Ningún miembro coincide con la búsqueda." />
          ) : null}
        </div>
      </div>

      <div>
        {selected ? (
          <div className="glass p-4 space-y-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-lg font-semibold">
                    {displayName(selected)}
                  </h3>
                  {selected.name_completed === false ? (
                    <StatusBadge variant="pending">Completar nombre</StatusBadge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
              </div>
              {canEdit ? (
                <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Añadir membresía</span>
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Membresías</h4>
                <p className="text-[11px] text-muted-foreground">
                  Cada membresía = un equipo + un rol. "Alcance club" solo para roles con permiso.
                </p>
              </div>
              {membershipsQ.isLoading ? (
                <LoadingState />
              ) : (membershipsQ.data ?? []).length === 0 ? (
                <EmptyState title="Sin membresías" message="Este usuario aún no pertenece a ningún equipo." />
              ) : (
                <div className="grid gap-2">
                  {(membershipsQ.data ?? []).map((m) => (
                    <div
                      key={m.id}
                      className="glass rounded-lg p-3 space-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:space-y-0"
                    >
                      <div className="min-w-0 sm:flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {m.team?.name ?? "Todo el club"}
                          </p>
                          {!m.team_id ? (
                            <StatusBadge variant="info">Alcance club</StatusBadge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.role?.name ?? "—"}
                          {m.job_title ? ` · ${m.job_title}` : ""}
                        </p>
                      </div>
                      {canEdit ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={m.role_id}
                            onValueChange={(v) => handleChangeRole(m, v)}
                          >
                            <SelectTrigger className="flex-1 sm:w-[160px] sm:flex-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(rolesQ.data ?? []).map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Personalizar permisos"
                            onClick={() =>
                              setOverrideCtx({
                                userId: selected.id,
                                teamId: m.team_id,
                                roleId: m.role_id,
                                label: `${m.team?.name ?? "Club"} · ${m.role?.name ?? ""}`,
                              })
                            }
                          >
                            <Sliders className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Eliminar membresía"
                            onClick={() => handleRemoveMembership(m)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <StatusBadge variant="info">{m.role?.name ?? ""}</StatusBadge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <MemberApproverSection clubId={clubId} userId={selected.id} canEdit={canEdit} />
          </div>

        ) : (
          <EmptyState
            icon={Settings2}
            title="Selecciona un miembro"
            message="Elige a alguien para gestionar sus equipos, roles y permisos personalizados."
          />
        )}
      </div>

      {selected ? (
        <AddMembershipDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          userId={selected.id}
          teams={teamsQ.data ?? []}
          roles={rolesQ.data ?? []}
          onAdded={() => qc.invalidateQueries({ queryKey: ["user-memberships", selected.id] })}
        />
      ) : null}

      {overrideCtx ? (
        <OverridesDialog
          ctx={overrideCtx}
          onClose={() => setOverrideCtx(null)}
          canEdit={canEdit}
        />
      ) : null}

      <MemberForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        clubId={clubId}
        roles={rolesQ.data ?? []}
        teams={teamsQ.data ?? []}
        onSaved={(id: string, roleName: string | null) => {
          setSelectedUserId(id);
          const base = inferBaseRole(roleName);
          navigate({ to: "/m/plantel", search: { role: base } as any });
        }}
      />

      {editUserId ? (
        <MemberForm
          open={!!editUserId}
          onOpenChange={(o) => !o && setEditUserId(null)}
          clubId={clubId}
          roles={rolesQ.data ?? []}
          teams={teamsQ.data ?? []}
          userId={editUserId}
          onSaved={() => setEditUserId(null)}
        />
      ) : null}

    </div>
  );
}

function MemberApproverSection({
  clubId,
  userId,
  canEdit,
}: {
  clubId: string;
  userId: string;
  canEdit: boolean;
}) {
  const { rows, isLoading } = useMemberApprovals(clubId, userId);
  const setOverride = useSetApproverOverride(clubId);

  function apply(type: RequestType, mode: "grant" | "revoke" | null, msg: string) {
    setOverride.mutate(
      { userId, type, mode },
      {
        onSuccess: () => toast.success(msg),
        onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
      },
    );
  }

  if (!canEdit) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
          Aprobador de solicitudes
        </h4>
        <p className="text-[11px] text-muted-foreground">
          El rol define el default; aquí ajustas solo a esta persona.
        </p>
      </div>
      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => {
            const def = REQUEST_TYPE_MAP[r.type];
            const TIcon = def.icon;
            return (
              <div
                key={r.type}
                className="glass rounded-lg p-3 space-y-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      r.effective ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground",
                    )}
                  >
                    <TIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{def.label}</p>
                      {r.override ? (
                        <StatusBadge variant="pending">Ajustado manualmente</StatusBadge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.override === "grant"
                        ? "Aprueba (asignado a esta persona)"
                        : r.override === "revoke"
                          ? "No aprueba (quitado a esta persona)"
                          : r.byRole
                            ? "Aprueba (por su rol)"
                            : "No aprueba (su rol no lo cubre)"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.override ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setOverride.isPending}
                      onClick={() => apply(r.type, null, "Se restauró el comportamiento por rol")}
                    >
                      Volver al rol
                    </Button>
                  ) : r.effective ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setOverride.isPending}
                      onClick={() => apply(r.type, "revoke", "Se le quitó este tipo")}
                    >
                      Quitar a esta persona
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={setOverride.isPending}
                      onClick={() => apply(r.type, "grant", "Se le asignó este tipo")}
                    >
                      Dar a esta persona
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function AddMembershipDialog({
  open,
  onOpenChange,
  userId,
  teams,
  roles,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  teams: TeamRow[];
  roles: RoleRow[];
  onAdded: () => void;
}) {
  const [roleId, setRoleId] = React.useState<string>("");
  const [teamId, setTeamId] = React.useState<string>("");
  const [jobTitle, setJobTitle] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const selectedRole = roles.find((r) => r.id === roleId) ?? null;
  const clubWideAllowed = !!selectedRole?.allows_club_wide;

  React.useEffect(() => {
    if (!open) {
      setRoleId("");
      setTeamId("");
      setJobTitle("");
    }
  }, [open]);

  // If role changes and current selection is club-wide but not allowed, reset team.
  React.useEffect(() => {
    if (teamId === "__club__" && !clubWideAllowed) setTeamId("");
  }, [clubWideAllowed, teamId]);

  async function handleAdd() {
    if (!roleId || !teamId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("team_memberships").insert({
        user_id: userId,
        team_id: teamId === "__club__" ? null : teamId,
        role_id: roleId,
        job_title: jobTitle.trim() || null,
      });
      if (error) throw error;
      toast.success("Membresía añadida");
      onAdded();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo añadir");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir membresía</DialogTitle>
          <DialogDescription>
            Elige primero el rol, luego el equipo/categoría. "Todo el club" solo aparece si el rol tiene alcance de club.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.allows_club_wide ? " · alcance club" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Equipo / categoría</Label>
            <Select value={teamId} onValueChange={setTeamId} disabled={!roleId}>
              <SelectTrigger>
                <SelectValue placeholder={roleId ? "Selecciona categoría" : "Elige un rol primero"} />
              </SelectTrigger>
              <SelectContent>
                {clubWideAllowed ? (
                  <SelectItem value="__club__">Todo el club</SelectItem>
                ) : null}
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleId && !clubWideAllowed ? (
              <p className="text-[11px] text-muted-foreground">
                Este rol no admite alcance de club. Elige una categoría específica.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Puesto (opcional)</Label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ej. Utilero, Kinesiólogo, Portero"
            />
            <p className="text-[11px] text-muted-foreground">
              Solo informativo. No cambia los permisos.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={!roleId || !teamId || saving}>
            {saving ? "Añadiendo..." : "Añadir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PermRow {
  module_key: string;
  access_level: AccessLevel;
}

function OverridesDialog({
  ctx,
  onClose,
  canEdit,
}: {
  ctx: { userId: string; teamId: string | null; roleId: string; label: string };
  onClose: () => void;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const roleQ = useQuery({
    queryKey: ["role-info", ctx.roleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, base_role")
        .eq("id", ctx.roleId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; base_role: string | null } | null;
    },
  });

  const rolePermsQ = useQuery({
    queryKey: ["role-perms", ctx.roleId],
    queryFn: async (): Promise<PermRow[]> => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("module_key, access_level")
        .eq("role_id", ctx.roleId);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const overridesQ = useQuery({
    queryKey: ["user-overrides", ctx.userId, ctx.teamId ?? "club"],
    queryFn: async (): Promise<PermRow[]> => {
      let q = supabase
        .from("user_permission_overrides")
        .select("module_key, access_level")
        .eq("user_id", ctx.userId);
      q = ctx.teamId ? q.eq("team_id", ctx.teamId) : q.is("team_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const roleMap = React.useMemo(() => {
    const m: Record<string, AccessLevel> = {};
    for (const p of rolePermsQ.data ?? []) m[p.module_key] = p.access_level;
    return m;
  }, [rolePermsQ.data]);
  const overrideMap = React.useMemo(() => {
    const m: Record<string, AccessLevel> = {};
    for (const p of overridesQ.data ?? []) m[p.module_key] = p.access_level;
    return m;
  }, [overridesQ.data]);

  const effectiveLevel = React.useCallback(
    (mk: string): AccessLevel => overrideMap[mk] ?? roleMap[mk] ?? "none",
    [overrideMap, roleMap],
  );

  const pageGroups = React.useMemo(
    () => groupModulesByPage(roleQ.data?.base_role as BaseRole | null, MODULES.map((m) => m.key)),
    [roleQ.data?.base_role],
  );

  async function setOverride(moduleKey: string, level: AccessLevel) {
    const existing = (overridesQ.data ?? []).find((o) => o.module_key === moduleKey);
    let error;
    if (existing) {
      let q = supabase
        .from("user_permission_overrides")
        .update({ access_level: level, level: legacyToLevel(level) })
        .eq("user_id", ctx.userId)
        .eq("module_key", moduleKey);
      q = ctx.teamId ? q.eq("team_id", ctx.teamId) : q.is("team_id", null);
      ({ error } = await q);
    } else {
      ({ error } = await supabase.from("user_permission_overrides").insert({
        user_id: ctx.userId,
        team_id: ctx.teamId,
        module_key: moduleKey,
        access_level: level,
        level: legacyToLevel(level),
      }));
    }
    return error;
  }

  async function resetOverride(moduleKey: string) {
    let q = supabase
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", ctx.userId)
      .eq("module_key", moduleKey);
    q = ctx.teamId ? q.eq("team_id", ctx.teamId) : q.is("team_id", null);
    return (await q).error;
  }

  async function handleSetOne(moduleKey: string, level: AccessLevel) {
    const err = await setOverride(moduleKey, level);
    if (err) return toast.error(err.message);
    toast.success("Permiso actualizado");
    qc.invalidateQueries({ queryKey: ["user-overrides", ctx.userId, ctx.teamId ?? "club"] });
  }

  async function handleResetOne(moduleKey: string) {
    const err = await resetOverride(moduleKey);
    if (err) return toast.error(err.message);
    toast.success("Restablecido al rol");
    qc.invalidateQueries({ queryKey: ["user-overrides", ctx.userId, ctx.teamId ?? "club"] });
  }

  async function togglePage(modules: ModuleKey[], on: boolean) {
    const errors: string[] = [];
    for (const mk of modules) {
      if (on) {
        if (effectiveLevel(mk) === "none") {
          const err = await setOverride(mk, "read");
          if (err) errors.push(err.message);
        }
      } else {
        if (effectiveLevel(mk) !== "none") {
          const err = await setOverride(mk, "none");
          if (err) errors.push(err.message);
        }
      }
    }
    qc.invalidateQueries({ queryKey: ["user-overrides", ctx.userId, ctx.teamId ?? "club"] });
    if (errors.length) toast.error(errors[0]);
    else toast.success(on ? "Página activada" : "Página desactivada");
  }

  async function handleResetPage(modules: ModuleKey[]) {
    for (const mk of modules) await resetOverride(mk);
    qc.invalidateQueries({ queryKey: ["user-overrides", ctx.userId, ctx.teamId ?? "club"] });
    toast.success("Página restablecida al rol");
  }

  const loading = rolePermsQ.isLoading || overridesQ.isLoading || roleQ.isLoading;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Permisos personalizados</DialogTitle>
          <DialogDescription>{ctx.label} — los cambios solo afectan a este usuario en este contexto.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <LoadingState />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {pageGroups.map(({ page, modules }) => {
              const PageIcon = page.icon;
              const activeCount = modules.filter((mk) => effectiveLevel(mk) !== "none").length;
              const isActive = activeCount > 0;
              const hasOverride = modules.some((mk) => overrideMap[mk] !== undefined);
              return (
                <div key={page.key + page.label} className="glass rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5">
                      <PageIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{page.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {isActive ? `${activeCount} de ${modules.length} activos` : "Página desactivada"}
                      </p>
                    </div>
                    {canEdit && hasOverride ? (
                      <Button size="sm" variant="ghost" onClick={() => handleResetPage(modules)}>
                        Restablecer
                      </Button>
                    ) : null}
                    <Switch
                      checked={isActive}
                      disabled={!canEdit}
                      onCheckedChange={(on) => togglePage(modules, on)}
                    />
                  </div>
                  {isActive ? (
                    <div className="divide-y divide-border/50 border-t border-border/50 px-3">
                      {modules.map((mk) => {
                        const m = MODULE_MAP[mk];
                        if (!m) return null;
                        const Icon = m.icon;
                        const roleLvl: AccessLevel = roleMap[mk] ?? "none";
                        const overrideLvl: AccessLevel | undefined = overrideMap[mk];
                        const effective: AccessLevel = overrideLvl ?? roleLvl;
                        return (
                          <div
                            key={mk}
                            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{m.label}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                Rol: {LEVELS.find((l) => l.value === roleLvl)?.label}
                                {overrideLvl ? " · Personalizado" : ""}
                              </p>
                            </div>
                            <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                              <Select
                                value={effective}
                                onValueChange={(v) => handleSetOne(mk, v as AccessLevel)}
                                disabled={!canEdit}
                              >
                                <SelectTrigger
                                  className={cn("flex-1 sm:w-[140px] sm:flex-none", overrideLvl && "border-primary/60")}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LEVELS.map((l) => (
                                    <SelectItem key={l.value} value={l.value}>
                                      {l.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {canEdit && overrideLvl ? (
                                <Button size="sm" variant="ghost" onClick={() => handleResetOne(mk)}>
                                  Restablecer
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
