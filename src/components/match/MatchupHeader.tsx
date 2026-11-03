import { cn } from "@/lib/utils";
import { TeamCrest, type CrestTeam } from "./TeamCrest";

/** Local · vs · visitante, con fecha/hora y sede. `large` para tarjetas, `compact` para listas. */
export function MatchupHeader({
  home, away, when, venue, variant = "large", className,
}: {
  home: CrestTeam;
  away: CrestTeam;
  when?: string;
  venue?: string;
  variant?: "large" | "compact";
  className?: string;
}) {
  const meta = [when, venue].filter(Boolean).join(" · ");
  if (variant === "compact") {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        <TeamCrest team={home} size="sm" />
        <span className="text-[11px] font-semibold text-muted-foreground">vs</span>
        <TeamCrest team={away} size="sm" />
        <span className="min-w-0 truncate text-xs text-muted-foreground">{meta}</span>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <TeamCrest team={home} size="lg" />
          <span className="text-[11px] font-semibold">{home.shortName}</span>
        </div>
        <span className="text-sm font-bold text-muted-foreground">vs</span>
        <div className="flex flex-col items-center gap-1">
          <TeamCrest team={away} size="lg" />
          <span className="text-[11px] font-semibold">{away.shortName}</span>
        </div>
      </div>
      {meta && <div className="mt-1.5 text-sm font-semibold">{meta}</div>}
    </div>
  );
}
