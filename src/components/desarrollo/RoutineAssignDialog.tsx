import * as React from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  useAssignRoutine,
  type DevelopmentRosterMember,
  type RoutineRow,
} from "@/hooks/useDevelopment";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  routine: RoutineRow | null;
  players: DevelopmentRosterMember[];
}

/** Asigna una rutina a uno o varios jugadores del equipo de la rutina. */
export function RoutineAssignDialog({ open, onOpenChange, clubId, userId, routine, players }: Props) {
  const assign = useAssignRoutine(clubId, userId);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setSelected([]);
    setDueDate("");
  }, [open]);

  if (!routine) return null;

  const candidates = players.filter((p) => p.teamId === routine.team_id);
  const alreadyAssigned = new Set((routine.assignments ?? []).map((a) => a.player_user_id));

  const toggle = (userIdToToggle: string) =>
    setSelected((prev) =>
      prev.includes(userIdToToggle)
        ? prev.filter((x) => x !== userIdToToggle)
        : [...prev, userIdToToggle],
    );

  const submit = () => {
    assign.mutate(
      { routine_id: routine.id, player_user_ids: selected, due_date: dueDate || null },
      {
        onSuccess: () => {
          toast.success("Rutina asignada");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo asignar"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>Asignar “{routine.name}”</EntitySheetTitle>
        <EntitySheetDescription>
          Elige a los jugadores del equipo que trabajarán esta rutina.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="ra-due">Fecha límite (opcional)</Label>
          <Input id="ra-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay jugadores registrados en este equipo.</p>
        ) : (
          <ul className="space-y-2">
            {candidates.map((p) => {
              const active = selected.includes(p.userId);
              const has = alreadyAssigned.has(p.userId);
              return (
                <li key={p.playerId}>
                  <button
                    type="button"
                    onClick={() => toggle(p.userId)}
                    className={cn(
                      "glass flex w-full items-center gap-3 p-3 text-left transition-colors",
                      active ? "border-primary/60 bg-primary/10" : "hover:bg-white/[0.06]",
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={p.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback>{(p.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.fullName ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {has ? "Ya tiene esta rutina" : (p.position ?? "—")}
                      </p>
                    </div>
                    {active ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="glow-primary"
          onClick={submit}
          disabled={selected.length === 0 || assign.isPending}
        >
          {assign.isPending ? "Asignando…" : `Asignar (${selected.length})`}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
