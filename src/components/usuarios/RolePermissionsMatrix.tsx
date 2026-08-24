import * as React from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, MODULE_MAP, type ModuleKey } from "@/lib/modules";
import { groupModulesByPage, type BaseRole } from "@/lib/rolePages";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { cn } from "@/lib/utils";
import {
  coerceLevelFor,
  defaultLevelsFor,
  levelOptionsFor,
  levelToLegacy,
  normalizeLevel,
  type PermissionLevel,
} from "@/lib/permissions";
import type { RequestType } from "@/lib/requestTypes";
import { useSaveRoleApprovals } from "@/hooks/useRequestApprovers";
import { RoleApproverTypes } from "./ApproverTypesEditor";

export interface RolePermRow {
  role_id: string;
  module_key: string;
  level: PermissionLevel | null;
}

/**
 * Matriz de permisos de un rol con la escala nueva de 6 niveles.
 * Escribe `level` y, por compatibilidad, la cubeta vieja en `access_level`.
 */
export function RolePermissionsMatrix({
  clubId,
  role,
  perms,
  approvalTypes,
  canEdit,
  onSaved,
}: {
  clubId: string;
  role: { id: string; name: string; base_role: string | null };
  perms: RolePermRow[];
  approvalTypes: RequestType[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const initial = React.useMemo(() => {
    const map: Record<string, PermissionLevel> = {};
    for (const m of MODULES) map[m.key] = "sin_acceso";
    for (const p of perms) map[p.module_key] = coerceLevelFor(p.module_key as ModuleKey, normalizeLevel(p.level));
    return map;
  }, [perms]);

  const initialApprovals = React.useMemo(() => [...approvalTypes].sort().join(","), [approvalTypes]);

  const [draft, setDraft] = React.useState<Record<string, PermissionLevel>>(initial);
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

  const defaults = defaultLevelsFor(role.base_role);

  async function handleSave() {
    setSaving(true);
    try {
      const rows = MODULES.map((m) => ({
        role_id: role.id,
        module_key: m.key,
        level: draft[m.key],
        access_level: levelToLegacy(draft[m.key]),
      }));
      const { error } = await supabase
        .from("role_permissions")
        .upsert(rows as any, { onConflict: "role_id,module_key" });
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
      for (const mk of modules) {
        if (on) {
          if (!next[mk] || next[mk] === "sin_acceso") {
            next[mk] = defaults?.[mk] && defaults[mk] !== "sin_acceso"
              ? defaults[mk]
              : coerceLevelFor(mk, "lector_categoria");
          }
        } else {
          next[mk] = "sin_acceso";
        }
      }
      return next;
    });
  }

  function restoreDefaults() {
    if (!defaults) return;
    setDraft(() => {
      const next: Record<string, PermissionLevel> = {};
      for (const m of MODULES) next[m.key] = coerceLevelFor(m.key, defaults[m.key] ?? "sin_acceso");
      return next;
    });
    toast.info("Valores por defecto cargados. Guarda para aplicarlos.");
  }

  return (
    <div className="glass p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">{role.name}</h3>
          <p className="text-xs text-muted-foreground">
            Define qué ve y qué edita este rol en cada módulo, y hasta dónde llega su alcance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && defaults ? (
            <Button variant="ghost" size="sm" onClick={restoreDefaults}>
              <RotateCcw className="mr-2 h-4 w-4" /> Valores por defecto
            </Button>
          ) : null}
          {canEdit ? (
            <Button onClick={handleSave} disabled={!dirty || saving} className="glow-primary">
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          ) : (
            <StatusBadge variant="info">Solo lectura</StatusBadge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {pageGroups.map(({ page, modules }) => {
          const PageIcon = page.icon;
          const activeCount = modules.filter((mk) => draft[mk] && draft[mk] !== "sin_acceso").length;
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
              {/* Las filas SIEMPRE se muestran: una página apagada también debe
                  poder configurarse módulo por módulo. */}
              <div className="divide-y divide-border/50 border-t border-border/50 px-3">

                  {modules.map((mk) => {
                    const m = MODULE_MAP[mk];
                    if (!m) return null;
                    const Icon = m.icon;
                    const options = levelOptionsFor(mk);
                    const current = draft[mk] ?? "sin_acceso";
                    const hint = options.find((o) => o.value === current)?.hint;
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
                          <p className="truncate text-xs text-muted-foreground">{hint}</p>
                        </div>
                        <Select
                          value={current}
                          onValueChange={(v) => setDraft((d) => ({ ...d, [mk]: v as PermissionLevel }))}
                          disabled={!canEdit}
                        >
                          <SelectTrigger
                            className={cn(
                              "col-span-2 w-full sm:col-span-1 sm:w-[210px]",
                              current !== "sin_acceso" && "border-primary/40",
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((l) => (
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
            </div>

          );
        })}
        {pageGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">Este rol no tiene páginas configurables.</p>
        ) : null}
      </div>

      <div className="glass rounded-lg p-3">
        <RoleApproverTypes
          value={approvalDraft}
          onChange={setApprovalDraft}
          levels={draft}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
