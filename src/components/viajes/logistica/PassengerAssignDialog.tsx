import * as React from "react";
import { Check, Search, Users } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { personInitials, personLabel, type MiniProfile } from "@/lib/tripLogistics";

export interface AssignCandidate {
  user_id: string;
  profile: MiniProfile | null;
  note?: string | null;
}

export interface ImportSource {
  label: string;
  userIds: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  /** SOLO convocados del viaje (trip_travelers). Nadie fuera de la convocatoria. */
  candidates: AssignCandidate[];
  selectedIds: string[];
  /** Otras unidades/tramos desde donde copiar la selección. */
  importSources?: ImportSource[];
  saving?: boolean;
  onSave: (userIds: string[]) => void;
}

/**
 * Asignación de personas (pasajeros, ocupantes) a partir de la convocatoria del
 * viaje. Si alguien no está convocado no aparece aquí: primero debe agregarse a
 * la convocatoria del viaje.
 */
export function PassengerAssignDialog({
  open,
  onOpenChange,
  title,
  description,
  candidates,
  selectedIds,
  importSources = [],
  saving = false,
  onSave,
}: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set(selectedIds));
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(selectedIds));
      setQ("");
    }
  }, [open, selectedIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = [...candidates].sort((a, b) => personLabel(a.profile).localeCompare(personLabel(b.profile), "es"));
    if (!term) return list;
    return list.filter((c) => personLabel(c.profile).toLowerCase().includes(term));
  }, [candidates, q]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const importFrom = (source: ImportSource) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allowed = new Set(candidates.map((c) => c.user_id));
      source.userIds.filter((id) => allowed.has(id)).forEach((id) => next.add(id));
      return next;
    });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{title}</EntitySheetTitle>
        <EntitySheetDescription>
          {description ?? "Solo aparecen las personas convocadas al viaje."}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {candidates.length === 0 ? (
          <div className="glass flex flex-col items-center gap-2 p-6 text-center">
            <Users className="h-6 w-6 text-primary" />
            <p className="text-sm text-foreground">Este viaje aún no tiene convocados.</p>
            <p className="text-xs text-muted-foreground">
              Agrega personas a la convocatoria del viaje para poder asignarlas aquí.
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar convocado…"
                className="pl-9"
              />
            </div>

            {importSources.length ? (
              <div className="flex flex-wrap gap-2">
                {importSources.map((s) => (
                  <Button key={s.label} type="button" size="sm" variant="outline" onClick={() => importFrom(s)}>
                    Importar de {s.label}
                  </Button>
                ))}
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {selected.size} de {candidates.length} seleccionados
            </p>

            <ul className="space-y-1">
              {filtered.map((c) => {
                const active = selected.has(c.user_id);
                return (
                  <li key={c.user_id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.user_id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                        active ? "border-primary/60 bg-primary/10" : "border-border/60 hover:bg-white/5",
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={c.profile?.avatar_url ?? undefined} alt="" />
                        <AvatarFallback className="text-xs">{personInitials(c.profile)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">{personLabel(c.profile)}</span>
                        {c.note ? <span className="block truncate text-xs text-muted-foreground">{c.note}</span> : null}
                      </span>
                      {active ? <Check className="h-4 w-4 text-primary" /> : null}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? (
                <li className="py-4 text-center text-sm text-muted-foreground">Sin coincidencias.</li>
              ) : null}
            </ul>
          </>
        )}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="glow-primary"
          disabled={saving || candidates.length === 0}
          onClick={() => onSave([...selected])}
        >
          Guardar asignación
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
