import { Trophy } from "lucide-react";
import { useCrestUrl } from "@/hooks/useTournaments";
import { cn } from "@/lib/utils";

/** Logo del torneo; sin marco, respeta la transparencia del archivo. */
export function TournamentLogo({
  path,
  name,
  className,
}: {
  path: string | null | undefined;
  name: string;
  className?: string;
}) {
  const { data: url } = useCrestUrl(path);
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className ?? "h-12 w-12")}>
      {url ? (
        <img src={url} alt={`Logo de ${name}`} loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <Trophy className="h-2/3 w-2/3 text-muted-foreground/60" />
      )}
    </span>
  );
}
