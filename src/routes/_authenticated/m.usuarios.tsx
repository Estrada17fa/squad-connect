import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, Trash2, Pencil } from "lucide-react";
import { MembersTab } from "@/components/usuarios/MembersTab";
import { RolePermissionsMatrix } from "@/components/usuarios/RolePermissionsMatrix";



import { toast } from "sonner";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import type { RequestType } from "@/lib/requestTypes";
import { useRoleApprovals } from "@/hooks/useRequestApprovers";
import { canManageUsers, canSeeUsers, type PermissionLevel } from "@/lib/permissions";


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
  level: PermissionLevel | null;
}

function UsuariosPage() {
  const { profile, isSuperAdmin, permissions } = useApp();
  // Gestionar personas es sensible: solo tiene sentido en ámbito global.
  const puedeVer = isSuperAdmin || canSeeUsers(permissions["usuarios"]);
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);

  if (!puedeVer) {
    return (
      <div className="space-y-6">
        <PageHeader title="Usuarios" subtitle="Miembros del club, roles y permisos" />
        <EmptyState
          icon={ShieldCheck}
          title="Sin acceso"
          message="No tienes permiso para ver la administración de usuarios."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="usuarios" />
      <PageHeader hideTitle title="Usuarios" subtitle="Miembros del club, roles y permisos" />

      <Tabs defaultValue="miembros" className="space-y-4">
        <TabsList className="glass w-full sm:w-auto">
          <TabsTrigger value="miembros" className="flex-1 sm:flex-none">Miembros</TabsTrigger>
          <TabsTrigger value="roles" className="flex-1 sm:flex-none">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="miembros">
          {profile?.club_id ? (
            <MembersTab clubId={profile.club_id} canEdit={canEdit} />
          ) : (
            <EmptyState title="Sin club" message="Tu perfil aún no está asociado a un club." />
          )}
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab clubId={profile?.club_id ?? null} canEdit={canEdit} />
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
        .select("role_id, module_key, level")
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
          <RolePermissionsMatrix
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
