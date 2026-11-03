import { Plus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";

export function CoordEmptyState({
  icon: Icon, text, action, area,
}: { icon: LucideIcon; text: string; action: string; area: CoordArea }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card px-6 py-12 text-center">
      <span className={cn("flex h-20 w-20 items-center justify-center rounded-3xl", area.bgSoft)}>
        <Icon className={cn("h-10 w-10", area.text)} />
      </span>
      <p className="mt-5 max-w-xs text-sm text-muted-foreground">{text}</p>
      <button
        onClick={() => toast("Próximamente")}
        className={cn("coord-press mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-background", area.bg)}
      >
        <Plus className="h-4 w-4" /> {action}
      </button>
    </div>
  );
}
