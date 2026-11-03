import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";
import type { MockHero } from "@/lib/coordMockData";

export function HeroCard({ area, hero }: { area: CoordArea; hero: MockHero }) {
  return (
    <div className={cn("rounded-2xl p-3.5", area.bgSoft)}>
      <div className={cn("text-[11px] font-bold tracking-wider", area.text)}>{hero.label}</div>
      <div className="mt-1 text-lg font-bold leading-snug">{hero.title}</div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <span className="text-[13px] text-muted-foreground">{hero.support}</span>
        <button
          onClick={() => toast("Próximamente")}
          className={cn("coord-press h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold text-background outline-none focus-visible:ring-2 focus-visible:ring-foreground/60", area.bg)}
        >
          {hero.cta}
        </button>
      </div>
    </div>
  );
}
