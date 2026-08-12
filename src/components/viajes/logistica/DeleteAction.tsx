import * as React from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";

interface Props {
  /** Texto del botón ("Eliminar vuelo", "Eliminar hotel", …). */
  label: string;
  /** Título y descripción del diálogo de confirmación. */
  title: string;
  description?: React.ReactNode;
  /** Mensaje de éxito. */
  successMessage?: string;
  loading?: boolean;
  /** Muestra solo el ícono (para listas). */
  iconOnly?: boolean;
  onDelete: () => Promise<unknown> | void;
  /** Se ejecuta al terminar bien (cerrar la ficha, por ejemplo). */
  onDeleted?: () => void;
}

/**
 * Botón de eliminar con confirmación, compartido por todas las fichas del
 * módulo de Viajes. Solo debe renderizarse cuando la persona puede editar.
 */
export function DeleteAction({
  label,
  title,
  description = "Esta acción no se puede deshacer.",
  successMessage,
  loading,
  iconOnly = false,
  onDelete,
  onDeleted,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onDelete();
      toast.success(successMessage ?? "Eliminado");
      setOpen(false);
      onDeleted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {iconOnly ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={label}
          className="text-destructive hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" /> {label}
        </Button>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        loading={busy || loading}
        onConfirm={run}
      />
    </>
  );
}
