import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuickActions({ actions }: { actions: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => (
        <button
          key={a}
          onClick={() => toast("Próximamente")}
          className={cn(
            "coord-press inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold",
            i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          <Plus className="h-4 w-4" /> {a}
        </button>
      ))}
    </div>
  );
}
