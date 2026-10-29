import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Sliders } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { groupPermissionModulesByPage } from "@/lib/rolePages";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/squad/LoadingState";
import { cn } from "@/lib/utils";
import {
  levelToLegacy,
  normalizeLevel,
  simpleLevelOptions,
  toSimpleLevel,
  type PermissionLevel,
} from "@/lib/permissions";
import { MemberApproverTypes } from "./ApproverTypesEditor";

export interface MembershipCtx {
  id: string;
  teamId: string | null;
  roleId: string;
  label: string;
}

/**
 * Ajustes avanzados de una persona: excepciones de permisos por membresía
 * (sobre la escala de 6 niveles) y tipos de solicitud que aprueba.
 */
export function UserAdvancedSettings({
  clubId,
  userId,
  memberships,
  canEdit,
}: {
  clubId: string;
  userId: string;
  memberships: MembershipCtx[];
  canEdit: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const columns = memberships.filter((m) => !!m.teamId);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="glass rounded-lg">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5">
            <Sliders className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Ajustes avanzados</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              Excepciones por categoría y aprobación de solicitudes solo para esta persona.
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-border/50 p-3">
        {columns.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Añade una categoría para poder personalizar sus permisos.
          </p>
        ) : open ? (
          <OverridesGrid userId={userId} columns={columns} canEdit={canEdit} />
        ) : null}
        <MemberApproverTypes clubId={clubId} userId={userId} canEdit={canEdit} />
      </CollapsibleContent>
    </Collapsible>
  );
}

interface OverrideRow {
  module_key: string;
  level: PermissionLevel | null;
  team_id: string | null;
}

/**
 * Columnas = categorías de la persona; filas = módulos. Cada celda parte del
 * nivel de su rol en esa categoría. Cambiarla guarda una excepción SOLO para
 * esa categoría (override con team_id). Las excepciones viejas sin categoría
 * se muestran en todas las columnas.
 */
function OverridesGrid({
  userId,
  columns,
  canEdit,
}: {
  userId: string;
  columns: MembershipCtx[];
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const roleIds = React.useMemo(() => [...new Set(columns.map((c) => c.roleId))].sort(), [columns]);

  const rolePermsQ = useQuery({
    queryKey: ["role-perms-many", roleIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role_id, module_key, level")
        .in("role_id", roleIds);
      if (error) throw error;
      return (data ?? []) as { role_id: string; module_key: string; level: PermissionLevel | null }[];
    },
  });

  const overridesQ = useQuery({
    queryKey: ["user-overrides-all", userId],
    queryFn: async (): Promise<OverrideRow[]> => {
      const { data, error } = await supabase
        .from("user_permission_overrides")
        .select("module_key, level, team_id")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const roleLevel = React.useCallback(
    (roleId: string, mk: string): PermissionLevel =>
      normalizeLevel(
        (rolePermsQ.data ?? []).find((p) => p.role_id === roleId && p.module_key === mk)?.level ?? "sin_acceso",
      ),
    [rolePermsQ.data],
  );
  const teamOverride = (teamId: string, mk: string) =>
    (overridesQ.data ?? []).find((o) => o.team_id === teamId && o.module_key === mk);
  const generalOverride = (mk: string) =>
    (overridesQ.data ?? []).find((o) => o.team_id === null && o.module_key === mk);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["user-overrides-all", userId] });
    qc.invalidateQueries({ queryKey: ["user-overrides", userId] });
    qc.invalidateQueries({ queryKey: ["squad-access", userId] });
  }

  async function setCell(teamId: string, mk: string, level: PermissionLevel) {
    const existing = teamOverride(teamId, mk);
    const { error } = existing
      ? await supabase
          .from("user_permission_overrides")
          .update({ level, access_level: levelToLegacy(level) } as any)
          .eq("user_id", userId)
          .eq("module_key", mk)
          .eq("team_id", teamId)
      : await supabase.from("user_permission_overrides").insert({
          user_id: userId,
          team_id: teamId,
          module_key: mk,
          level,
          access_level: levelToLegacy(level),
        } as any);
    if (error) return toast.error(error.message);
    toast.success("Excepción guardada para esta categoría");
    invalidate();
  }

  async function resetCell(teamId: string, mk: string) {
    const { error } = await supabase
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", userId)
      .eq("module_key", mk)
      .eq("team_id", teamId);
    if (error) return toast.error(error.message);
    toast.success("Vuelve al rol");
    invalidate();
  }

  const pageGroups = React.useMemo(() => groupPermissionModulesByPage(), []);
  if (rolePermsQ.isLoading || overridesQ.isLoading) return <LoadingState />;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Cada cambio aplica solo a esa persona en esa categoría.{" "}
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> excepción de categoría
        </span>
      </p>
      {pageGroups.map(({ page, modules }) => (
        <div key={page.key + page.label} className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">{page.label}</th>
                {columns.map((c) => (
                  <th key={c.id} className="px-2 py-2 font-semibold">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {modules.map((mk) => {
                const m = MODULE_MAP[mk as ModuleKey];
                if (!m) return null;
                const general = generalOverride(mk);
                return (
                  <tr key={mk}>
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium">{m.label}</p>
                      {general ? (
                        <p className="text-[10px] text-muted-foreground">Excepción en todas las categorías</p>
                      ) : null}
                    </td>
                    {columns.map((c) => {
                      const own = teamOverride(c.teamId!, mk);
                      const stored = normalizeLevel(own?.level ?? general?.level ?? roleLevel(c.roleId, mk));
                      const value = toSimpleLevel(stored);
                      return (
                        <td key={c.id} className="px-2 py-2 align-top">
                          <div className="flex items-center gap-1.5">
                            {own ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                            <Select
                              value={value}
                              onValueChange={(v) => setCell(c.teamId!, mk, v as PermissionLevel)}
                              disabled={!canEdit}
                            >
                              <SelectTrigger className={cn("h-8 w-[130px]", own && "border-primary/60")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {simpleLevelOptions(mk as ModuleKey, stored).map((l) => (
                                  <SelectItem key={l.value} value={l.value}>
                                    {l.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {canEdit && own ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-6 px-2 text-[11px]"
                              onClick={() => resetCell(c.teamId!, mk)}
                            >
                              Volver al rol
                            </Button>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
