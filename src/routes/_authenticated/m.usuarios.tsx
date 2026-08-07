import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, Trash2, Pencil } from "lucide-react";
import { MembersTab } from "@/components/usuarios/MembersTab";
import { CategoriesTab } from "@/components/usuarios/CategoriesTab";

import { toast } from "sonner";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/components/squad/AppLayout";
import { MODULES, MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { groupModulesByPage, type BaseRole } from "@/lib/rolePages";
import { cn } from "@/lib/utils";
import type { AccessLevel } from "@/hooks/useAccess";
import { REQUEST_TYPES, type RequestType } from "@/lib/requestTypes";
import { useRoleApprovals, useSaveRoleApprovals } from "@/hooks/useRequestApprovers";
import { Checkbox } from "@/components/ui/checkbox";


export const Route = createFileRoute("/_authenticated/m/usuarios")({
  head: () => ({
    meta: [
      { title: "Squad — Usuarios" },
      { name: "description", content: "Roles, permisos y miembros del club." },
    ],
  }),
  component: UsuariosPage,
});

interface RoleRow {
  id: string;
  club_id: string;
  name: string;
  is_system_default: boolean;
  base_role: string | null;
}
interface PermRow {
  role_id: string;
  module_key: string;
  access_level: AccessLevel;
}

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "Sin acceso" },
  { value: "read", label: "Solo ver" },
  { value: "editor", label: "Editar" },
  { value: "approver", label: "Aprobar" },
];

function UsuariosPage() {
  const { user, profile, isSuperAdmin, permissions } = useApp();
  const canEdit = isSuperAdmin || permissions["usuarios"] === "editor" || permissions["usuarios"] === "approver";

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="usuarios" />
      <PageHeader hideTitle title="Usuarios" subtitle="Miembros del club, roles y permisos" />

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="glass w-full sm:w-auto">
          <TabsTrigger value="roles" className="flex-1 sm:flex-none">Roles</TabsTrigger>
          <TabsTrigger value="miembros" className="flex-1 sm:flex-none">Miembros</TabsTrigger>
          <TabsTrigger value="categorias" className="flex-1 sm:flex-none">Categorías</TabsTrigger>
          <TabsTrigger value="ubicaciones" className="flex-1 sm:flex-none">Ubicaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <RolesTab clubId={profile?.club_id ?? null} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="miembros">
          {profile?.club_id ? (
            <MembersTab clubId={profile.club_id} canEdit={canEdit} />
          ) : (
            <EmptyState title="Sin club" message="Tu perfil aún no está asociado a un club." />
          )}
        </TabsContent>
        <TabsContent value="categorias">
          {profile?.club_id ? (
            <CategoriesTab clubId={profile.club_id} canEdit={canEdit} />
          ) : (
            <EmptyState title="Sin club" message="Tu perfil aún no está asociado a un club." />
          )}
        </TabsContent>
        <TabsContent value="ubicaciones">
          {profile?.club_id ? (
            <LocationsTab clubId={profile.club_id} userId={user.id} canEdit={canEdit} />
          ) : (
            <EmptyState title="Sin club" message="Tu perfil aún no está asociado a un club." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


function RolesTab({ clubId, canEdit }: { clubId: string | null; canEdit: boolean }) {
  const qc = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState<RoleRow | null>(null);

  const rolesQ = useQuery({
    queryKey: ["club-roles", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<RoleRow[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, club_id, name, is_system_default, base_role")
        .eq("club_id", clubId!)
        .order("is_system_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const permsQ = useQuery({
    queryKey: ["club-role-permissions", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<PermRow[]> => {
      const roleIds = (rolesQ.data ?? []).map((r) => r.id);
      if (roleIds.length === 0) return [];
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role_id, module_key, access_level")
        .in("role_id", roleIds);
      if (error) throw error;
      return (data ?? []) as PermRow[];
    },
  });

  const approvalsQ = useRoleApprovals(clubId);


  React.useEffect(() => {
    if (rolesQ.data && rolesQ.data.length > 0) {
      qc.invalidateQueries({ queryKey: ["club-role-permissions", clubId] });
      if (!selectedRoleId || !rolesQ.data.find((r) => r.id === selectedRoleId)) {
        setSelectedRoleId(rolesQ.data[0].id);
      }
    }
  }, [rolesQ.data, clubId, qc, selectedRoleId]);

  if (!clubId) {
    return <EmptyState title="Sin club" message="Tu perfil aún no está asociado a un club." />;
  }
  if (rolesQ.isLoading) return <LoadingState />;

  const roles = rolesQ.data ?? [];
  const perms = permsQ.data ?? [];
  const selected = roles.find((r) => r.id === selectedRoleId) ?? null;

  async function handleDelete(role: RoleRow) {
    if (role.is_system_default) return;
    if (!confirm(`¿Eliminar el rol "${role.name}"? Los usuarios asignados perderán acceso.`)) return;
    const { error } = await supabase.from("roles").delete().eq("id", role.id);
    if (error) return toast.error(error.message);
    toast.success("Rol eliminado");
    if (selectedRoleId === role.id) setSelectedRoleId(null);
    qc.invalidateQueries({ queryKey: ["club-roles", clubId] });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <div className="space-y-3">
        {canEdit ? (
          <Button onClick={() => setCreateOpen(true)} className="w-full glow-primary">
            <Plus className="mr-2 h-4 w-4" /> Nuevo rol
          </Button>
        ) : null}

        <div className="grid gap-2">
          {roles.map((r) => (
            <StandardCard
              key={r.id}
              title={r.name}
              icon={ShieldCheck}
              interactive
              onClick={() => setSelectedRoleId(r.id)}
              className={cn(selectedRoleId === r.id && "border-primary/60 bg-white/[0.06]")}
              status={r.is_system_default ? { label: "Sistema", variant: "info" } : undefined}
              action={
                canEdit && !r.is_system_default ? (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameOpen(r);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(r);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ))}
          {roles.length === 0 ? (
            <EmptyState title="Sin roles" message="Crea el primer rol del club." />
          ) : null}
        </div>
      </div>

      <div>
        {selected ? (
          <PermissionsMatrix
            key={selected.id}
            clubId={clubId}
            role={selected}
            perms={perms.filter((p) => p.role_id === selected.id)}
            approvalTypes={(approvalsQ.data ?? [])
              .filter((a) => a.role_id === selected.id)
              .map((a) => a.request_type)}
            canEdit={canEdit}
            onSaved={() => qc.invalidateQueries({ queryKey: ["club-role-permissions", clubId] })}
          />

        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="Selecciona un rol"
            message="Elige un rol para revisar o ajustar sus permisos por módulo."
          />
        )}
      </div>

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clubId={clubId}
        onCreated={(id) => {
          qc.invalidateQueries({ queryKey: ["club-roles", clubId] });
          setSelectedRoleId(id);
        }}
      />
      <RenameRoleDialog
        role={renameOpen}
        onOpenChange={(o) => !o && setRenameOpen(null)}
        onRenamed={() => qc.invalidateQueries({ queryKey: ["club-roles", clubId] })}
      />
    </div>
  );
}

function PermissionsMatrix({
  clubId,
  role,
  perms,
  approvalTypes,
  canEdit,
  onSaved,
}: {
  clubId: string;
  role: RoleRow;
  perms: PermRow[];
  approvalTypes: RequestType[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const initial = React.useMemo(() => {
    const map: Record<string, AccessLevel> = {};
    for (const m of MODULES) map[m.key] = "none";
    for (const p of perms) map[p.module_key] = p.access_level;
    return map;
  }, [perms]);

  const initialApprovals = React.useMemo(
    () => [...approvalTypes].sort().join(","),
    [approvalTypes],
  );

  const [draft, setDraft] = React.useState<Record<string, AccessLevel>>(initial);
  const [approvalDraft, setApprovalDraft] = React.useState<RequestType[]>(approvalTypes);
  const [saving, setSaving] = React.useState(false);
  const saveApprovals = useSaveRoleApprovals(clubId);

  React.useEffect(() => setDraft(initial), [initial]);
  React.useEffect(() => setApprovalDraft(approvalTypes), [initialApprovals]); // eslint-disable-line react-hooks/exhaustive-deps

  const approvalsDirty = React.useMemo(
    () => [...approvalDraft].sort().join(",") !== initialApprovals,
    [approvalDraft, initialApprovals],
  );

  const dirty = React.useMemo(
    () => MODULES.some((m) => draft[m.key] !== initial[m.key]) || approvalsDirty,
    [draft, initial, approvalsDirty],
  );

  async function handleSave() {
    setSaving(true);
    try {
      const rows = MODULES.map((m) => ({
        role_id: role.id,
        module_key: m.key,
        access_level: draft[m.key],
      }));
      const { error } = await supabase
        .from("role_permissions")
        .upsert(rows, { onConflict: "role_id,module_key" });
      if (error) throw error;
      if (approvalsDirty) {
        await saveApprovals.mutateAsync({ roleId: role.id, types: approvalDraft });
      }
      toast.success("Permisos actualizados");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }


  const pageGroups = React.useMemo(
    () => groupModulesByPage(role.base_role as BaseRole | null, MODULES.map((m) => m.key)),
    [role.base_role],
  );

  function togglePage(modules: ModuleKey[], on: boolean) {
    setDraft((d) => {
      const next = { ...d };
      if (on) {
        for (const mk of modules) if (!next[mk] || next[mk] === "none") next[mk] = "read";
      } else {
        for (const mk of modules) next[mk] = "none";
      }
      return next;
    });
  }

  return (
    <div className="glass p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{role.name}</h3>
          <p className="text-xs text-muted-foreground">
            Define qué puede ver o editar este rol en cada módulo.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        ) : (
          <StatusBadge variant="info">Solo lectura</StatusBadge>
        )}
      </div>

      <div className="space-y-3">
        {pageGroups.map(({ page, modules }) => {
          const PageIcon = page.icon;
          const activeCount = modules.filter((mk) => draft[mk] && draft[mk] !== "none").length;
          const isActive = activeCount > 0;
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
                    return (
                      <div
                        key={mk}
                        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.label}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.scope === "club" ? "Nivel club" : m.scope === "team" ? "Por categoría" : "Club + categoría"}
                          </p>
                        </div>
                        <Select
                          value={draft[mk]}
                          onValueChange={(v) => setDraft((d) => ({ ...d, [mk]: v as AccessLevel }))}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className="col-span-2 w-full sm:col-span-1 sm:w-[140px]">
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
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        {pageGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">Este rol no tiene páginas configurables.</p>
        ) : null}
      </div>

      <div className="glass rounded-lg p-3 space-y-3">
        <div>
          <p className="text-sm font-semibold">Aprueba solicitudes de</p>
          <p className="text-[11px] text-muted-foreground">
            Default del rol. En la ficha de cada miembro puedes darle o quitarle tipos sin afectar a
            los demás. Nadie aprueba su propia solicitud.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {REQUEST_TYPES.map((t) => {
            const TIcon = t.icon;
            const checked = approvalDraft.includes(t.key);
            return (
              <label
                key={t.key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                  checked ? "border-primary/50 bg-primary/5" : "border-border/60",
                  canEdit ? "cursor-pointer hover:bg-white/[0.04]" : "opacity-80",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={!canEdit}
                  onCheckedChange={(v) =>
                    setApprovalDraft((prev) =>
                      v ? [...prev, t.key] : prev.filter((k) => k !== t.key),
                    )
                  }
                />
                <TIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate text-sm">{t.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}



function CreateRoleDialog({
  open,
  onOpenChange,
  clubId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubId: string;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [baseRole, setBaseRole] = React.useState<"admin" | "tecnico" | "medico" | "staff" | "jugador">("staff");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setBaseRole("staff");
    }
  }, [open]);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("roles")
        .insert({ club_id: clubId, name: name.trim(), is_system_default: false, base_role: baseRole } as any)
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Rol creado");
      onCreated(data.id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo crear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo rol</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="role-name">Nombre</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Preparador físico"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-base">Basado en</Label>
            <Select value={baseRole} onValueChange={(v) => setBaseRole(v as any)}>
              <SelectTrigger id="role-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="jugador">Jugador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define en qué páginas de la navegación aparecerán los módulos del rol. No afecta permisos.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || saving}>
            {saving ? "Creando..." : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameRoleDialog({
  role,
  onOpenChange,
  onRenamed,
}: {
  role: RoleRow | null;
  onOpenChange: (o: boolean) => void;
  onRenamed: () => void;
}) {
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(role?.name ?? "");
  }, [role]);

  async function handleSave() {
    if (!role || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("roles").update({ name: name.trim() }).eq("id", role.id);
      if (error) throw error;
      toast.success("Rol renombrado");
      onRenamed();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo renombrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!role} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renombrar rol</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="role-rename">Nombre</Label>
          <Input id="role-rename" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
