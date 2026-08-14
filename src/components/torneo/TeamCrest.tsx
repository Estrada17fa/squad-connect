import { Shield } from "lucide-react";
import { useCrestUrl } from "@/hooks/useTournaments";
import { cn } from "@/lib/utils";

/** Escudo del equipo (bucket privado); si no hay, muestra un icono neutro. */
export function TeamCrest({
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
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/5 ring-1 ring-inset ring-white/10",
        className ?? "h-10 w-10",
      )}
    >
      {url ? (
        <img src={url} alt={`Escudo de ${name}`} loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <Shield className="h-1/2 w-1/2 text-muted-foreground" />
      )}
    </span>
  );
}
