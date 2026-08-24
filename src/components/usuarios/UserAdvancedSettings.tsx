import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Sliders } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { groupModulesByPage, type BaseRole } from "@/lib/rolePages";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  coerceLevelFor,
  levelOptionsFor,
  levelToLegacy,
  LEVEL_LABEL,
  normalizeLevel,
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
  const [ctxId, setCtxId] = React.useState<string | null>(memberships[0]?.id ?? null);

  React.useEffect(() => {
    if (!ctxId || !memberships.find((m) => m.id === ctxId)) {
      setCtxId(memberships[0]?.id ?? null);
    }
  }, [memberships, ctxId]);

  const ctx = memberships.find((m) => m.id === ctxId) ?? null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="glass rounded-lg">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5">
            <Sliders className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Ajustes avanzados</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              Excepciones de permisos y aprobación de solicitudes solo para esta persona.
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-border/50 p-3">
        {memberships.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Añade una membresía para poder personalizar sus permisos.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Contexto</p>
              <Select value={ctxId ?? undefined} onValueChange={setCtxId}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Los cambios solo afectan a esta persona en esta membresía.
              </p>
            </div>
            {ctx ? <OverridesEditor userId={userId} ctx={ctx} canEdit={canEdit} /> : null}
          </>
        )}

        <MemberApproverTypes clubId={clubId} userId={userId} canEdit={canEdit} />
      </CollapsibleContent>
    </Collapsible>
  );
}

interface LevelRow {
  module_key: string;
  level: PermissionLevel | null;
}

function OverridesEditor({
  userId,
  ctx,
  canEdit,
}: {
  userId: string;
  ctx: MembershipCtx;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const teamKey = ctx.teamId ?? "club";

  const roleQ = useQuery({
    queryKey: ["role-info", ctx.roleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, base_role")
        .eq("id", ctx.roleId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; base_role: string | null } | null;
    },
  });

  const rolePermsQ = useQuery({
    queryKey: ["role-perms", ctx.roleId],
    queryFn: async (): Promise<LevelRow[]> => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("module_key, level")
        .eq("role_id", ctx.roleId);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const overridesQ = useQuery({
    queryKey: ["user-overrides", userId, teamKey],
    queryFn: async (): Promise<LevelRow[]> => {
      let q = supabase
        .from("user_permission_overrides")
        .select("module_key, level")
        .eq("user_id", userId);
      q = ctx.teamId ? q.eq("team_id", ctx.teamId) : q.is("team_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const roleMap = React.useMemo(() => {
    const m: Record<string, PermissionLevel> = {};
    for (const p of rolePermsQ.data ?? []) m[p.module_key] = normalizeLevel(p.level);
    return m;
  }, [rolePermsQ.data]);

  const overrideMap = React.useMemo(() => {
    const m: Record<string, PermissionLevel> = {};
    for (const p of overridesQ.data ?? []) m[p.module_key] = normalizeLevel(p.level);
    return m;
  }, [overridesQ.data]);

  const effectiveLevel = React.useCallback(
    (mk: ModuleKey): PermissionLevel =>
      coerceLevelFor(mk, overrideMap[mk] ?? roleMap[mk] ?? "sin_acceso"),
    [overrideMap, roleMap],
  );

  const pageGroups = React.useMemo(
    () => groupModulesByPage(roleQ.data?.base_role as BaseRole | null, MODULES.map((m) => m.key)),
    [roleQ.data?.base_role],
  );

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["user-overrides", userId, teamKey] });
  }

  async function setOverride(moduleKey: string, level: PermissionLevel) {
    const existing = (overridesQ.data ?? []).find((o) => o.module_key === moduleKey);
    if (existing) {
      let q = supabase
        .from("user_permission_overrides")
        .update({ level, access_level: levelToLegacy(level) } as any)
        .eq("user_id", userId)
        .eq("module_key", moduleKey);
      q = ctx.teamId ? q.eq("team_id", ctx.teamId) : q.is("team_id", null);
      return (await q).error;
    }
    return (
      await supabase.from("user_permission_overrides").insert({
        user_id: userId,
        team_id: ctx.teamId,
        module_key: moduleKey,
        level,
        access_level: levelToLegacy(level),
      } as any)
    ).error;
  }

  async function resetOverride(moduleKey: string) {
    let q = supabase
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", userId)
      .eq("module_key", moduleKey);
    q = ctx.teamId ? q.eq("team_id", ctx.teamId) : q.is("team_id", null);
    return (await q).error;
  }

  async function handleSetOne(moduleKey: string, level: PermissionLevel) {
    const err = await setOverride(moduleKey, level);
    if (err) return toast.error(err.message);
    toast.success("Permiso actualizado");
    invalidate();
  }

  async function handleResetOne(moduleKey: string) {
    const err = await resetOverride(moduleKey);
    if (err) return toast.error(err.message);
    toast.success("Restablecido al rol");
    invalidate();
  }

  async function togglePage(modules: ModuleKey[], on: boolean) {
    const errors: string[] = [];
    for (const mk of modules) {
      const eff = effectiveLevel(mk);
      if (on && eff === "sin_acceso") {
        const err = await setOverride(mk, coerceLevelFor(mk, "lector_categoria"));
        if (err) errors.push(err.message);
      } else if (!on && eff !== "sin_acceso") {
        const err = await setOverride(mk, "sin_acceso");
        if (err) errors.push(err.message);
      }
    }
    invalidate();
    if (errors.length) toast.error(errors[0]);
    else toast.success(on ? "Página activada" : "Página desactivada");
  }

  async function handleResetPage(modules: ModuleKey[]) {
    for (const mk of modules) await resetOverride(mk);
    invalidate();
    toast.success("Página restablecida al rol");
  }

  if (rolePermsQ.isLoading || overridesQ.isLoading || roleQ.isLoading) return <LoadingState />;

  return (
    <div className="space-y-3">
      {pageGroups.map(({ page, modules }) => {
        const PageIcon = page.icon;
        const activeCount = modules.filter((mk) => effectiveLevel(mk) !== "sin_acceso").length;
        const isActive = activeCount > 0;
        const hasOverride = modules.some((mk) => overrideMap[mk] !== undefined);
        return (
          <div key={page.key + page.label} className="rounded-lg border border-border/60 overflow-hidden">
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
              {canEdit && hasOverride ? (
                <Button size="sm" variant="ghost" onClick={() => handleResetPage(modules)}>
                  Restablecer
                </Button>
              ) : null}
              <Switch
                checked={isActive}
                disabled={!canEdit}
                onCheckedChange={(on) => togglePage(modules, on)}
              />
            </div>
            {/* Las filas SIEMPRE se muestran: una página apagada también debe
                poder configurarse módulo por módulo. */}
            <div className="divide-y divide-border/50 border-t border-border/50 px-3">

                {modules.map((mk) => {
                  const m = MODULE_MAP[mk];
                  if (!m) return null;
                  const Icon = m.icon;
                  const roleLvl = coerceLevelFor(mk, roleMap[mk] ?? "sin_acceso");
                  const overrideLvl = overrideMap[mk] ? coerceLevelFor(mk, overrideMap[mk]) : undefined;
                  const effective = overrideLvl ?? roleLvl;
                  return (
                    <div
                      key={mk}
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Rol: {LEVEL_LABEL[roleLvl]}
                          {overrideLvl ? " · Personalizado" : ""}
                        </p>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                        <Select
                          value={effective}
                          onValueChange={(v) => handleSetOne(mk, v as PermissionLevel)}
                          disabled={!canEdit}
                        >
                          <SelectTrigger
                            className={cn(
                              "flex-1 sm:w-[200px] sm:flex-none",
                              overrideLvl && "border-primary/60",
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {levelOptionsFor(mk).map((l) => (
                              <SelectItem key={l.value} value={l.value}>
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {canEdit && overrideLvl ? (
                          <Button size="sm" variant="ghost" onClick={() => handleResetOne(mk)}>
                            Restablecer
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>

          </div>
        );
      })}
      {pageGroups.length === 0 ? (
        <p className="text-xs text-muted-foreground">Este rol no tiene páginas configurables.</p>
      ) : null}
    </div>
  );
}
