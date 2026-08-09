import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChecklist, useChecklistMutations } from "@/hooks/useCoordinacion";
import { cn } from "@/lib/utils";

/** Subtareas estilo Notion con barra de progreso. */
export function TaskChecklist({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const itemsQ = useChecklist(taskId);
  const { add, toggle, remove } = useChecklistMutations(taskId);
  const [draft, setDraft] = React.useState("");

  const items = itemsQ.data ?? [];
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  function submit() {
    const content = draft.trim();
    if (!content) return;
    add.mutate({ content, order_index: items.length });
    setDraft("");
  }

  return (
    <div className="space-y-2">
      {items.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {done}/{items.length}
          </span>
        </div>
      ) : null}

      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-white/[0.03]">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => toggle.mutate({ id: i.id, done: !i.done })}
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                i.done ? "border-primary bg-primary" : "border-border",
                !canEdit && "opacity-60",
              )}
              aria-label={i.done ? "Marcar como pendiente" : "Marcar como hecha"}
            />
            <span
              className={cn(
                "min-w-0 flex-1 text-sm [overflow-wrap:anywhere]",
                i.done ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {i.content}
            </span>
            {canEdit ? (
              <button
                type="button"
                onClick={() => remove.mutate(i.id)}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Eliminar subtarea"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Agregar subtarea"
          />
          <Button type="button" variant="secondary" onClick={submit} disabled={!draft.trim() || add.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin subtareas</p>
      ) : null}
    </div>
  );
}
