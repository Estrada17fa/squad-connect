import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Settings2, Sliders, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, type ModuleKey } from "@/lib/modules";
import type { AccessLevel } from "@/hooks/useAccess";
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
import { cn } from "@/lib/utils";

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "Sin acceso" },
  { value: "read", label: "Solo ver" },
  { value: "editor", label: "Editar" },
  { value: "approver", label: "Aprobar" },
];

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
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
  role: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
}

export function MembersTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [overrideCtx, setOverrideCtx] = React.useState<{
    userId: string;
    teamId: string | null;
    roleId: string;
    label: string;
  } | null>(null);

  const membersQ = useQuery({
    queryKey: ["club-members", clubId],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("club_id", clubId)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
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
        .select("id, user_id, team_id, role_id, role:roles(id, name), team:teams(id, name)")
        .eq("user_id", selectedUserId!);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = membersQ.data ?? [];
    if (!q) return rows;
    return rows.filter(
      (m) =>
        (m.full_name ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q),
    );
  }, [membersQ.data, search]);

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

  if (membersQ.isLoading) return <LoadingState />;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email"
            className="pl-9"
          />
        </div>
        <div className="grid gap-2">
          {filtered.map((m) => (
            <StandardCard
              key={m.id}
              title={m.full_name ?? m.email ?? "Sin nombre"}
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  {selected.full_name ?? selected.email}
                </h3>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
              </div>
              {canEdit ? (
                <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Añadir membresía
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Membresías</h4>
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
  const [teamId, setTeamId] = React.useState<string>("__club__");
  const [roleId, setRoleId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTeamId("__club__");
      setRoleId("");
    }
  }, [open]);

  async function handleAdd() {
    if (!roleId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("team_memberships").insert({
        user_id: userId,
        team_id: teamId === "__club__" ? null : teamId,
        role_id: roleId,
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
          <DialogDescription>Asigna a este usuario a un equipo (o al club entero) con un rol.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Equipo</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__club__">Todo el club</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={!roleId || saving}>
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

  async function setOverride(moduleKey: string, level: AccessLevel) {
    const payload = {
      user_id: ctx.userId,
      team_id: ctx.teamId,
      module_key: moduleKey,
      access_level: level,
    };
    // upsert manual: buscar existente
    const existing = (overridesQ.data ?? []).find((o) => o.module_key === moduleKey);
    let error;
    if (existing) {
      let q = supabase
        .from("user_permission_overrides")
        .update({ access_level: level })
        .eq("user_id", ctx.userId)
        .eq("module_key", moduleKey);
      q = ctx.teamId ? q.eq("team_id", ctx.teamId) : q.is("team_id", null);
      ({ error } = await q);
    } else {
      ({ error } = await supabase.from("user_permission_overrides").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success("Permiso actualizado");
    qc.invalidateQueries({ queryKey: ["user-overrides", ctx.userId, ctx.teamId ?? "club"] });
  }

  async function resetOverride(moduleKey: string) {
    let q = supabase
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", ctx.userId)
      .eq("module_key", moduleKey);
    q = ctx.teamId ? q.eq("team_id", ctx.teamId) : q.is("team_id", null);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Restablecido al rol");
    qc.invalidateQueries({ queryKey: ["user-overrides", ctx.userId, ctx.teamId ?? "club"] });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Permisos personalizados</DialogTitle>
          <DialogDescription>{ctx.label} — los cambios solo afectan a este usuario en este contexto.</DialogDescription>
        </DialogHeader>
        {rolePermsQ.isLoading || overridesQ.isLoading ? (
          <LoadingState />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/50">
            {MODULES.map((m) => {
              const Icon = m.icon;
              const roleLvl: AccessLevel = roleMap[m.key] ?? "none";
              const overrideLvl: AccessLevel | undefined = overrideMap[m.key];
              const effective: AccessLevel = overrideLvl ?? roleLvl;
              return (
                <div key={m.key} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Rol: {LEVELS.find((l) => l.value === roleLvl)?.label}
                      {overrideLvl ? " · Personalizado" : ""}
                    </p>
                  </div>
                  <Select
                    value={effective}
                    onValueChange={(v) => setOverride(m.key as ModuleKey, v as AccessLevel)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className={cn("w-[140px]", overrideLvl && "border-primary/60")}>
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
                    <Button size="sm" variant="ghost" onClick={() => resetOverride(m.key)}>
                      Restablecer
                    </Button>
                  ) : (
                    <div className="w-[90px]" />
                  )}
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
