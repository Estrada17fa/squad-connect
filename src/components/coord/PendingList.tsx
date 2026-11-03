import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";
import { sortByUrgency, type MockPending, type Urgency } from "@/lib/coordMockData";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-1 text-xs font-semibold text-muted-foreground">{children}</h2>;
}

const PILL: Record<Urgency, string> = {
  red: "bg-urgency-red-soft text-urgency-red",
  amber: "bg-urgency-amber-soft text-urgency-amber",
  gray: "bg-urgency-gray-soft text-urgency-gray",
};

export function PendingList({ area, items }: { area: CoordArea; items: MockPending[] }) {
  const shown = sortByUrgency(items).slice(0, 3);
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground">Pendientes</h2>
        <button
          onClick={() => toast("Próximamente")}
          className={cn("text-xs font-semibold outline-none focus-visible:underline", area.text)}
        >
          Ver todos
        </button>
      </div>
      <ul className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-card">
        {shown.map((p) => {
          const I = p.icon;
          return (
            <li key={p.text}>
              <button
                onClick={() => toast("Próximamente")}
                className="coord-press flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none hover:bg-muted/40 focus-visible:bg-muted/50"
              >
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", area.bgSoft)}>
                  <I className={cn("h-[15px] w-[15px]", area.text)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.text}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{p.context}</span>
                </span>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold", PILL[p.urgency])}>
                  {p.value}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
