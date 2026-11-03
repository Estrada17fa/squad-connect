import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";

export function CoordHeader({ area, category, actions }: { area: CoordArea; category: string; actions: string[] }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold leading-tight tracking-tight">Coordinación</h1>
        <div className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
          {category} <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button aria-label="Crear" className="coord-press -mr-2 -mt-1.5 flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Plus className="h-6 w-6" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1.5">
          {actions.map((a) => (
            <button
              key={a}
              onClick={() => toast("Próximamente")}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted"
            >
              <Plus className={cn("h-4 w-4", area.text)} /> {a}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
