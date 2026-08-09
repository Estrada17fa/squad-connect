import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

export interface RoleRow {
  id: string;
  name: string;
  is_system_default: boolean;
  allows_club_wide: boolean;
}
export interface TeamRow {
  id: string;
  name: string;
  category: string | null;
}

export function AddMembershipDialog({
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
            Elige primero el rol, luego el equipo/categoría. "Todo el club" solo aparece si el rol
            tiene alcance de club.
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
                {clubWideAllowed ? <SelectItem value="__club__">Todo el club</SelectItem> : null}
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
