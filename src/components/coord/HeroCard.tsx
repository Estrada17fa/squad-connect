import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoordArea } from "@/lib/coordAreas";
import type { MockHero } from "@/lib/coordMockData";

export function HeroCard({ area, hero }: { area: CoordArea; hero: MockHero }) {
  return (
    <div className={cn("flex flex-col rounded-2xl p-5", area.bgSoft)}>
      <div className={cn("text-[11px] font-bold tracking-wider", area.text)}>{hero.label}</div>
      <div className="mt-2 text-xl font-bold leading-snug">{hero.title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hero.support}</div>
      <button
        onClick={() => toast("Próximamente")}
        className={cn("coord-press mt-5 inline-flex min-h-11 w-fit items-center rounded-full px-5 text-sm font-semibold text-background", area.bg)}
      >
        {hero.cta}
      </button>
    </div>
  );
}
