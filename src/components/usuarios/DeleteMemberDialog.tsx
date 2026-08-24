import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkMemberReferences, hardDeleteClubMember } from "@/lib/members.functions";
import { displayName, type MemberProfile } from "./memberUtils";

/**
 * Confirmación de eliminación permanente: muestra el resumen de registros
 * personales que se borrarán y exige escribir el nombre del miembro.
 */
export function DeleteMemberDialog({
  member,
  open,
  onOpenChange,
  onDeleted,
}: {
  member: MemberProfile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const checkFn = useServerFn(checkMemberReferences);
  const deleteFn = useServerFn(hardDeleteClubMember);
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const name = member ? displayName(member) : "";

  React.useEffect(() => {
    if (open) setTyped("");
  }, [open, member?.id]);

  const refsQ = useQuery({
    queryKey: ["member-refs", member?.id],
    enabled: open && !!member?.id,
    queryFn: async () => checkFn({ data: { user_id: member!.id } }),
  });

  async function handleDelete() {
    if (!member) return;
    setBusy(true);
    try {
      const res = await deleteFn({ data: { user_id: member.id, force: true } });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      toast.success("Miembro eliminado permanentemente");
      onOpenChange(false);
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  const items = refsQ.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Eliminar permanentemente
          </DialogTitle>
          <DialogDescription>
            Se eliminará la cuenta de {name} y sus datos personales. Esta acción no se puede
            deshacer. Si prefieres conservar su historial, usa "Dar de baja".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Registros que se eliminarán
            </p>
            {refsQ.isLoading ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Revisando…
              </p>
            ) : items.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No tiene registros asociados.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {items.map((i) => (
                  <li key={i.label} className="flex justify-between gap-3">
                    <span className="capitalize text-muted-foreground">{i.label}</span>
                    <span className="font-semibold">{i.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Los registros del club creados por esta persona (gastos, tareas, documentos,
              publicaciones) se conservan y quedan sin autor.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-name">
              Escribe <span className="font-semibold text-foreground">{name}</span> para confirmar
            </Label>
            <Input
              id="confirm-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={busy || typed.trim() !== name}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Eliminar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
