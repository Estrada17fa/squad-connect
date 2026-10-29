import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { previewAllCategories, setAllCategories } from "@/lib/members.functions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import type { RoleRow } from "./AddMembershipDialog";

/**
 * Interruptor "Todas las categorías" de una persona. No es un nivel ni un
 * alcance: al encenderlo crea su membresía en cada categoría con el rol elegido
 * (y en las que se creen después). Al apagarlo conserva las membresías.
 */
export function AllCategoriesToggle({
  clubId,
  userId,
  roles,
  canManage,
  onChanged,
}: {
  clubId: string;
  userId: string;
  roles: RoleRow[];
  canManage: boolean;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const previewFn = useServerFn(previewAllCategories);
  const setFn = useServerFn(setAllCategories);
  const [roleId, setRoleId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [conflicts, setConflicts] = React.useState<{ team: string; role: string }[] | null>(null);

  const q = useQuery({
    queryKey: ["member-all-categories", clubId, userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("member_all_categories")
        .select("role_id")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .maybeSingle();
      return (data?.role_id as string | undefined) ?? null;
    },
  });
  const onRoleId = q.data ?? null;
  const eligibleRoles = roles.filter((r) => !/jugador/i.test(r.name));

  async function apply(on: boolean, replace = false) {
    setBusy(true);
    try {
      await setFn({ data: { user_id: userId, role_id: on ? roleId : null, on, replace_conflicts: replace } });
      toast.success(on ? "Asignado a todas las categorías" : "Interruptor apagado; se conservan sus categorías");
      setConflicts(null);
      qc.invalidateQueries({ queryKey: ["member-all-categories", clubId, userId] });
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function turnOn() {
    if (!roleId) return;
    setBusy(true);
    try {
      const res = await previewFn({ data: { user_id: userId, role_id: roleId } });
      setBusy(false);
      if (res.conflicts.length) setConflicts(res.conflicts);
      else await apply(true);
    } catch (e: any) {
      setBusy(false);
      toast.error(e?.message ?? "No se pudo revisar");
    }
  }

  const onRoleName = roles.find((r) => r.id === onRoleId)?.name;

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Todas las categorías</p>
          <p className="text-[11px] text-muted-foreground">
            {onRoleId
              ? `Encendido como ${onRoleName ?? "rol"} · incluye las categorías nuevas`
              : "Apagado · sus categorías se eligen una por una"}
          </p>
        </div>
        {canManage && onRoleId ? (
          <Switch checked disabled={busy} onCheckedChange={(v) => !v && apply(false)} />
        ) : null}
      </div>
      {canManage && !onRoleId ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label className="text-[11px]">Rol en todas</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Elige un rol" />
              </SelectTrigger>
              <SelectContent>
                {eligibleRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={!roleId || busy} onClick={turnOn}>
            Encender
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={!!conflicts}
        onOpenChange={(v) => !v && setConflicts(null)}
        title="Reemplazar roles"
        description={`Ya tiene otro rol en: ${(conflicts ?? [])
          .map((c) => `${c.team} (${c.role})`)
          .join(", ")}. Se reemplazará por el rol elegido.`}
        confirmLabel="Reemplazar"
        onConfirm={() => apply(true, true)}
        loading={busy}
      />
    </div>
  );
}
