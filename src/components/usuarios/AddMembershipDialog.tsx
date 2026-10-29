import * as React from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { addMembership } from "@/lib/members.functions";
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
  const addFn = useServerFn(addMembership);


  React.useEffect(() => {
    if (!open) {
      setRoleId("");
      setTeamId("");
      setJobTitle("");
    }
  }, [open]);


  async function handleAdd() {
    if (!roleId || !teamId) return;
    setSaving(true);
    try {
      await addFn({
        data: {
          user_id: userId,
          team_id: teamId,
          role_id: roleId,
          job_title: jobTitle.trim() || null,
        },
      });
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
            Elige el rol y la categoría. Cada membresía aplica solo a esa categoría.
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
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
