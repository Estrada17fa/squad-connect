import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Mismo alta de rol que la pantalla actual de Usuarios. */
export function CreateRoleDialog({
  open, onOpenChange, clubId, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; clubId: string; onCreated: (id: string) => void }) {
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
            <Label htmlFor="adm-role-name">Nombre</Label>
            <Input id="adm-role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Preparador físico" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-role-base">Basado en</Label>
            <Select value={baseRole} onValueChange={(v) => setBaseRole(v as any)}>
              <SelectTrigger id="adm-role-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="jugador">Jugador</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Define en qué páginas aparecerán los módulos del rol. No afecta permisos.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || saving}>{saving ? "Creando..." : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
