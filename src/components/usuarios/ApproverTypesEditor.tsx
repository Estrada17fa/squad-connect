import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { LoadingState } from "@/components/squad/LoadingState";
import { MODULE_MAP } from "@/lib/modules";
import { cn } from "@/lib/utils";
import {
  REQUEST_TYPES,
  REQUEST_TYPE_MAP,
  approverModuleFor,
  type RequestType,
} from "@/lib/requestTypes";
import { useMemberApprovals, useSetApproverOverride } from "@/hooks/useRequestApprovers";
import { canEdit as levelCanEdit, type PermissionLevel } from "@/lib/permissions";

/**
 * Tipos de solicitud que aprueba un ROL (default). Controlado: el padre
 * guarda el borrador junto con el resto de la matriz.
 * Aprobar exige ser EDITOR del módulo del tipo, así que avisamos cuando el
 * nivel del rol no alcanza.
 */
export function RoleApproverTypes({
  value,
  onChange,
  levels,
  canEdit,
}: {
  value: RequestType[];
  onChange: (next: RequestType[]) => void;
  /** Niveles del rol por módulo, para detectar incompatibilidades. */
  levels: Record<string, PermissionLevel>;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Aprueba solicitudes de</p>
        <p className="text-[11px] text-muted-foreground">
          Default del rol. En la ficha de cada miembro puedes darle o quitarle tipos sin afectar a
          los demás. Nadie aprueba su propia solicitud.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {REQUEST_TYPES.map((t) => {
          const TIcon = t.icon;
          const checked = value.includes(t.key);
          const moduleKey = approverModuleFor(t.key);
          const needsEditor = checked && !levelCanEdit(levels[moduleKey]);
          return (
            <label
              key={t.key}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2 transition-colors",
                checked ? "border-primary/50 bg-primary/5" : "border-border/60",
                canEdit ? "cursor-pointer hover:bg-white/[0.04]" : "opacity-80",
              )}
            >
              <Checkbox
                className="mt-0.5"
                checked={checked}
                disabled={!canEdit}
                onCheckedChange={(v) =>
                  onChange(v ? [...value, t.key] : value.filter((k) => k !== t.key))
                }
              />
              <TIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{t.label}</span>
                {needsEditor ? (
                  <span className="mt-1 flex items-start gap-1 text-[11px] text-amber-400">
                    <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                    Requiere nivel de edición en {MODULE_MAP[moduleKey]?.label ?? moduleKey}.
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Tipos que aprueba una PERSONA concreta (grant/revoke sobre el default del rol). */
export function MemberApproverTypes({
  clubId,
  userId,
  canEdit,
}: {
  clubId: string;
  userId: string;
  canEdit: boolean;
}) {
  const { rows, isLoading } = useMemberApprovals(clubId, userId);
  const setOverride = useSetApproverOverride(clubId);

  function apply(type: RequestType, mode: "grant" | "revoke" | null, msg: string) {
    setOverride.mutate(
      { userId, type, mode },
      {
        onSuccess: () => toast.success(msg),
        onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
      },
    );
  }

  if (!canEdit) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
          Aprobador de solicitudes
        </h4>
        <p className="text-[11px] text-muted-foreground">
          El rol define el default; aquí ajustas solo a esta persona.
        </p>
      </div>
      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => {
            const def = REQUEST_TYPE_MAP[r.type];
            const TIcon = def.icon;
            return (
              <div
                key={r.type}
                className="glass rounded-lg p-3 space-y-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      r.effective ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground",
                    )}
                  >
                    <TIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{def.label}</p>
                      {r.override ? (
                        <StatusBadge variant="pending">Ajustado manualmente</StatusBadge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.override === "grant"
                        ? "Aprueba (asignado a esta persona)"
                        : r.override === "revoke"
                          ? "No aprueba (quitado a esta persona)"
                          : r.byRole
                            ? "Aprueba (por su rol)"
                            : "No aprueba (su rol no lo cubre)"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.override ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setOverride.isPending}
                      onClick={() => apply(r.type, null, "Se restauró el comportamiento por rol")}
                    >
                      Volver al rol
                    </Button>
                  ) : r.effective ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setOverride.isPending}
                      onClick={() => apply(r.type, "revoke", "Se le quitó este tipo")}
                    >
                      Quitar a esta persona
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={setOverride.isPending}
                      onClick={() => apply(r.type, "grant", "Se le asignó este tipo")}
                    >
                      Dar a esta persona
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
