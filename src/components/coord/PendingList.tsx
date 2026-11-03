import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";
import type { MockPending } from "@/lib/coordMockData";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-xs font-semibold text-muted-foreground">{children}</h2>;
}

export function PendingList({ area, items }: { area: CoordArea; items: MockPending[] }) {
  return (
    <section>
      <SectionTitle>Pendientes</SectionTitle>
      <ul className="divide-y divide-border/40">
        {items.map((p) => {
          const I = p.icon;
          return (
            <li key={p.text}>
              <button
                onClick={() => toast("Próximamente")}
                className="coord-press -mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left hover:bg-muted/50"
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", area.bgSoft)}>
                  <I className={cn("h-[18px] w-[18px]", area.text)} />
                </span>
                <span className="flex-1 text-sm">{p.text}</span>
                <span className="text-sm font-bold">{p.value}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
