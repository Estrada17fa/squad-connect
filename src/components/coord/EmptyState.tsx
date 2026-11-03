import { Plus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";

export function CoordEmptyState({
  icon: Icon, text, action, area,
}: { icon: LucideIcon; text: string; action?: string; area: CoordArea }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <Icon className={cn("h-8 w-8", area.text)} />
      <p className="mt-3 max-w-xs text-sm text-muted-foreground">{text}</p>
      {action && (
        <button
          onClick={() => toast("Próximamente")}
          className={cn("coord-press mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-background", area.bg)}
        >
          <Plus className="h-4 w-4" /> {action}
        </button>
      )}
    </div>
  );
}
