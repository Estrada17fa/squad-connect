import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Check, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/squad/PageHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

export const Route = createFileRoute("/_authenticated/admin/clubs")({
  head: () => ({
    meta: [
      { title: "Squad — Administrar clubes" },
      { name: "description", content: "Alta de clubes e invitaciones para administradores." },
    ],
  }),
  component: AdminClubsPage,
});

interface ClubRow {
  id: string;
  name: string;
  league_name: string | null;
  created_at: string;
}
interface InviteRow {
  id: string;
  club_id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  club: { name: string } | null;
  role: { name: string } | null;
  team: { name: string } | null;
}

function AdminClubsPage() {
  const { isSuperAdmin } = useApp();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState<null | ClubRow>(null);

  const clubsQ = useQuery({
    queryKey: ["admin-clubs"],
    enabled: isSuperAdmin,
    queryFn: async (): Promise<ClubRow[]> => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, league_name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invitesQ = useQuery({
    queryKey: ["admin-invitations"],
    enabled: isSuperAdmin,
    queryFn: async (): Promise<InviteRow[]> => {
      const { data, error } = await supabase
        .from("club_invitations")
        .select("*, club:clubs(name), role:roles(name), team:teams(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InviteRow[];
    },
  });

  if (!isSuperAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Acceso restringido"
        message="Solo los Super Admins de plataforma pueden administrar clubes."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrar clubes"
        subtitle="Alta de clubes e invitaciones a administradores"
        action={
          <Button onClick={() => setCreateOpen(true)} className="glow-primary">
            <Plus className="mr-2 h-4 w-4" /> Nuevo club
          </Button>
        }
      />

      <section className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-wide text-muted-foreground">Clubes</h2>
        {clubsQ.isLoading ? (
          <LoadingState />
        ) : (clubsQ.data ?? []).length === 0 ? (
          <EmptyState title="Sin clubes" message="Crea el primer club para empezar." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubsQ.data!.map((c, i) => (
              <div
                key={c.id}
                className="glass animate-card-in flex flex-col gap-2 p-4"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display font-semibold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.league_name ?? "Sin liga"}</div>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setInviteOpen(c)}>
                  <Mail className="mr-2 h-4 w-4" /> Invitar Admin
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-wide text-muted-foreground">
          Invitaciones
        </h2>
        {invitesQ.isLoading ? (
          <LoadingState />
        ) : (invitesQ.data ?? []).length === 0 ? (
          <EmptyState title="Sin invitaciones" message="Genera una invitación desde un club." />
        ) : (
          <div className="space-y-2">
            {invitesQ.data!.map((inv) => (
              <InviteRowItem key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </section>

      <CreateClubDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["admin-clubs"] })}
      />
      <InviteDialog
        club={inviteOpen}
        onOpenChange={(o) => !o && setInviteOpen(null)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["admin-invitations"] })}
      />
    </div>
  );
}

function InviteRowItem({ inv }: { inv: InviteRow }) {
  const [copied, setCopied] = React.useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${inv.token}`
      : `/invite/${inv.token}`;
  const expired = new Date(inv.expires_at).getTime() < Date.now();
  const status = inv.accepted_at ? "accepted" : expired ? "expired" : "pending";

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="glass flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium text-foreground">{inv.email}</span>
          {status === "accepted" ? (
            <StatusBadge variant="info">Aceptada</StatusBadge>
          ) : status === "expired" ? (
            <StatusBadge variant="rejected">Caducada</StatusBadge>
          ) : (
            <StatusBadge variant="pending">Pendiente</StatusBadge>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {inv.club?.name ?? "—"} · {inv.role?.name ?? "Sin rol"}
          {inv.team?.name ? ` · ${inv.team.name}` : " · Club-wide"}
        </div>
      </div>
      {status === "pending" ? (
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copiar link
        </Button>
      ) : null}
    </div>
  );
}

function CreateClubDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [league, setLeague] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data: club, error } = await supabase
        .from("clubs")
        .insert({ name: name.trim(), league_name: league.trim() || null })
        .select("id")
        .single();
      if (error) throw error;
      // Seed system roles for the new club
      const systemRoles = [
        { name: "Admin", is_system_default: true },
        { name: "Técnico", is_system_default: true },
        { name: "Médico", is_system_default: true },
        { name: "Staff", is_system_default: true },
        { name: "Jugador", is_system_default: true },
      ];
      const { data: roles, error: rolesErr } = await supabase
        .from("roles")
        .insert(systemRoles.map((r) => ({ ...r, club_id: club!.id })))
        .select("id, name");
      if (rolesErr) throw rolesErr;
      const adminId = roles?.find((r) => r.name === "Admin")?.id;
      if (adminId) {
        // Admin: editor en todos los módulos
        const moduleKeys = [
          "calendario","plantel","viajes","inventario","coordinacion_interna","solicitudes",
          "documentos","usuarios","comunicados","multimedia","torneo","tacticas","salud",
          "desarrollo","nutricion",
        ];
        await supabase.from("role_permissions").insert(
          moduleKeys.map((k) => ({ role_id: adminId, module_key: k, access_level: "editor" as const })),
        );
      }
      toast.success("Club creado");
      onCreated();
      setName("");
      setLeague("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear el club");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo club</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nombre del club</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Deportivo Sur" />
          </div>
          <div>
            <Label>Liga (opcional)</Label>
            <Input value={league} onChange={(e) => setLeague(e.target.value)} placeholder="Ej. Liga MX Femenil" />
          </div>
          <p className="text-xs text-muted-foreground">
            Se crearán los roles de sistema (Admin, Técnico, Médico, Staff, Jugador) y Admin tendrá
            acceso editor a todos los módulos. Después podrás invitar al Admin del club.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !name.trim()} className="glow-primary">
            {saving ? "Creando…" : "Crear club"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  club,
  onOpenChange,
  onCreated,
}: {
  club: ClubRow | null;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const open = !!club;
  const [email, setEmail] = React.useState("");
  const [roleId, setRoleId] = React.useState<string>("");
  const [teamId, setTeamId] = React.useState<string>("__club__");
  const [saving, setSaving] = React.useState(false);

  const rolesQ = useQuery({
    queryKey: ["admin-invite-roles", club?.id ?? "none"],
    enabled: !!club,
    queryFn: async () => {
      const { data } = await supabase
        .from("roles")
        .select("id, name")
        .eq("club_id", club!.id)
        .order("name");
      return data ?? [];
    },
  });
  const teamsQ = useQuery({
    queryKey: ["admin-invite-teams", club?.id ?? "none"],
    enabled: !!club,
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("id, name")
        .eq("club_id", club!.id)
        .order("name");
      return data ?? [];
    },
  });

  React.useEffect(() => {
    if (!club) {
      setEmail("");
      setRoleId("");
      setTeamId("__club__");
    } else if (rolesQ.data?.length && !roleId) {
      const admin = rolesQ.data.find((r) => r.name === "Admin");
      setRoleId(admin?.id ?? rolesQ.data[0].id);
    }
  }, [club, rolesQ.data, roleId]);

  async function save() {
    if (!club || !email.trim() || !roleId) return;
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("club_invitations").insert({
        club_id: club.id,
        email: email.trim().toLowerCase(),
        role_id: roleId,
        team_id: teamId === "__club__" ? null : teamId,
        created_by: user.user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Invitación creada");
      onCreated();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al invitar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar a {club?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Correo</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@club.com"
            />
          </div>
          <div>
            <Label>Rol</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
              <SelectContent>
                {(rolesQ.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__club__">Todo el club</SelectItem>
                {(teamsQ.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            La invitación caduca en 14 días. Al aceptarla, el usuario queda asignado al club, rol y
            categoría indicados.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !email.trim() || !roleId} className="glow-primary">
            {saving ? "Generando…" : "Generar invitación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
