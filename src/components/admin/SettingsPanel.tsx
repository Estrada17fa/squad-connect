import * as React from "react";
import { Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bloque de ajustes con el mismo patrón que las hojas de Usuarios:
 * abre en modo LECTURA y "Editar" habilita el formulario con Guardar/Cancelar.
 */
export function SettingsPanel({
  title,
  description,
  icon: Icon,
  canEdit,
  saving,
  onSave,
  onCancel,
  read,
  edit,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  canEdit?: boolean;
  saving?: boolean;
  onSave: () => Promise<boolean | void> | boolean | void;
  onCancel?: () => void;
  read: React.ReactNode;
  edit: React.ReactNode;
  className?: string;
}) {
  const [editing, setEditing] = React.useState(false);

  async function handleSave() {
    const ok = await onSave();
    if (ok !== false) setEditing(false);
  }

  return (
    <div className={cn("glass overflow-hidden", className)}>
      <div className="flex items-start gap-3 border-b border-white/10 p-4">
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-foreground">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold leading-tight text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">{description}</p>
          ) : null}
        </div>
        {canEdit && !editing ? (
          <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
          </Button>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        {editing ? edit : read}

        {editing ? (
          <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => {
                onCancel?.();
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="glow-primary">
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
