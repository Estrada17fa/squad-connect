import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { updateMembership } from "@/lib/members.functions";
import { PLAYER_POSITIONS } from "@/lib/members.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RoleRow } from "./AddMembershipDialog";
import type { MembershipLite } from "./memberUtils";

const isPlayerName = (n?: string | null) => (n ?? "").toLowerCase().includes("jugador");

/** Edita UNA membresía (por id): rol, cargo y, si es de jugador, dorsal/posición de esa categoría. */
export function EditMembershipDialog({
  open,
  onOpenChange,
  membership,
  roles,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  membership: MembershipLite | null;
  roles: RoleRow[];
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateMembership);
  const [roleId, setRoleId] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [jersey, setJersey] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [position2, setPosition2] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const playerQ = useQuery({
    queryKey: ["membership-player-row", membership?.user_id, membership?.team_id],
    enabled: open && !!membership?.team_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("player_profiles")
        .select("jersey_number, position, secondary_position")
        .eq("user_id", membership!.user_id)
        .eq("team_id", membership!.team_id!)
        .is("archived_at", null)
        .maybeSingle();
      return data;
    },
  });

  React.useEffect(() => {
    if (!open || !membership) return;
    setRoleId(membership.role_id);
    setJobTitle(membership.job_title ?? "");
  }, [open, membership]);

  React.useEffect(() => {
    const p = playerQ.data;
    setJersey(p?.jersey_number != null ? String(p.jersey_number) : "");
    setPosition(p?.position ?? "");
    setPosition2(p?.secondary_position ?? "");
  }, [playerQ.data]);

  const role = roles.find((r) => r.id === roleId);
  const isPlayer = isPlayerName(role?.name);
  const clubWide = !membership?.team_id;
  const invalid = !roleId || (isPlayer && clubWide);

  async function handleSave() {
    if (!membership || invalid) return;
    setSaving(true);
    try {
      await updateFn({
        data: {
          membership_id: membership.id,
          role_id: roleId,
          job_title: jobTitle.trim() || null,
          ...(isPlayer
            ? {
                jersey_number: jersey.trim() ? Number(jersey) : null,
                position: position || null,
                secondary_position: position2.trim() || null,
              }
            : {}),
        },
      });
      toast.success("Membresía actualizada");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar membresía</DialogTitle>
          <DialogDescription>{membership?.teamName ?? "Todo el club"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles
                  .filter((r) => !clubWide || r.allows_club_wide || r.id === membership?.role_id)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {isPlayer && clubWide ? (
              <p className="text-[11px] text-destructive">Un jugador necesita una categoría concreta.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Cargo (opcional)</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={60} />
          </div>
          {isPlayer && !clubWide ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Dorsal</Label>
                <Input type="number" value={jersey} onChange={(e) => setJersey(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Posición</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_POSITIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Posición secundaria</Label>
                <Input value={position2} onChange={(e) => setPosition2(e.target.value)} />
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={invalid || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
