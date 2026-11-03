import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";
import type { MockHero } from "@/lib/coordMockData";

export function HeroCard({ area, hero }: { area: CoordArea; hero: MockHero }) {
  return (
    <div className={cn("rounded-2xl p-3.5", area.bgSoft)}>
      <div className={cn("text-[11px] font-bold tracking-wider", area.text)}>{hero.label}</div>
      <div className="mt-1 text-lg font-bold leading-snug">{hero.title}</div>
      <div className="mt-0.5 flex items-center justify-between gap-3">
        <span className="text-[13px] text-muted-foreground">{hero.support}</span>
        <button
          onClick={() => toast("Próximamente")}
          className={cn("coord-press shrink-0 py-1 text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded", area.text)}
        >
          {hero.cta} ›
        </button>
      </div>
    </div>
  );
}
