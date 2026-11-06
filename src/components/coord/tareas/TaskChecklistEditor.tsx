import * as React from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChecklist, useChecklistMutations } from "@/hooks/useCoordinacion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Checklist de la ficha: palomear (responsables o editores); agregar, quitar y reordenar (editores). */
export function TaskChecklistEditor({ taskId, clubId, canToggle, canManage }: { taskId: string; clubId: string | null; canToggle: boolean; canManage: boolean }) {
  const qc = useQueryClient();
  const itemsQ = useChecklist(taskId);
  const { add, toggle, remove } = useChecklistMutations(taskId);
  const [draft, setDraft] = React.useState("");
  const items = itemsQ.data ?? [];
  const done = items.filter((i) => i.done).length;
  const refreshList = () => qc.invalidateQueries({ queryKey: ["coord-tasks", clubId ?? "none"] });

  async function move(i: number, dir: -1 | 1) {
    const a = items[i], b = items[i + dir];
    if (!a || !b) return;
    const ra = await supabase.from("task_checklist_items").update({ order_index: i + dir }).eq("id", a.id);
    const rb = await supabase.from("task_checklist_items").update({ order_index: i }).eq("id", b.id);
    if (ra.error || rb.error) toast.error("No se pudo reordenar");
    qc.invalidateQueries({ queryKey: ["coord-checklist", taskId] });
  }

  function submit() {
    const content = draft.trim();
    if (!content) return;
    add.mutate({ content, order_index: items.length }, { onSuccess: refreshList, onError: (e: any) => toast.error(e.message) });
    setDraft("");
  }

  if (!items.length && !canManage) return null;
  return (
    <section>
      <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground">Checklist{items.length ? ` · ${done}/${items.length}` : ""}</h2>
      <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
        {items.map((it, i) => (
          <li key={it.id} className="flex items-center gap-3 px-3 py-2">
            <button type="button" disabled={!canToggle} aria-label={it.done ? "Desmarcar paso" : "Marcar paso"}
              onClick={() => toggle.mutate({ id: it.id, done: !it.done }, { onSuccess: refreshList, onError: (e: any) => toast.error(e.message) })}
              className={cn("coord-press flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 disabled:opacity-50", it.done ? "border-area-general bg-area-general text-background" : "border-muted-foreground/50")}>
              {it.done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </button>
            <span className={cn("min-w-0 flex-1 text-sm", it.done && "text-muted-foreground line-through")}>{it.content}</span>
            {canManage ? (
              <span className="flex shrink-0 items-center">
                <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 text-muted-foreground disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Bajar" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="p-1.5 text-muted-foreground disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Quitar paso" onClick={() => remove.mutate(it.id, { onSuccess: refreshList })} className="p-1.5 text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </span>
            ) : null}
          </li>
        ))}
        {canManage ? (
          <li className="flex items-center gap-2 px-3 py-2">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
              placeholder="Agregar paso" className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
            <button type="button" aria-label="Agregar paso" onClick={submit} className="coord-press flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Plus className="h-4 w-4" /></button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
