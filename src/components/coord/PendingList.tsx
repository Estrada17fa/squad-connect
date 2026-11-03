import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";
import type { MockPending } from "@/lib/coordMockData";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-1 text-xs font-semibold text-muted-foreground">{children}</h2>;
}

const rowCls =
  "coord-press -mx-2 flex h-11 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PendingList({ area, items }: { area: CoordArea; items: MockPending[] }) {
  const shown = items.slice(0, 3);
  return (
    <section>
      <SectionTitle>Pendientes</SectionTitle>
      <ul className="divide-y divide-border/40">
        {shown.map((p) => {
          const I = p.icon;
          return (
            <li key={p.text}>
              <button onClick={() => toast("Próximamente")} className={rowCls}>
                <I className={cn("h-[18px] w-[18px] shrink-0", area.text)} />
                <span className="flex-1 truncate text-sm">{p.text}</span>
                <span className="text-sm font-bold">{p.value}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </button>
            </li>
          );
        })}
        {items.length > 3 && (
          <li>
            <button onClick={() => toast("Próximamente")} className={cn(rowCls, "text-sm font-semibold", area.text)}>
              Ver todos ›
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
