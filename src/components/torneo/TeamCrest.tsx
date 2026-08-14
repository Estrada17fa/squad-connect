import { Shield } from "lucide-react";
import { useCrestUrl } from "@/hooks/useTournaments";
import { cn } from "@/lib/utils";

/**
 * Escudo del equipo (bucket privado).
 * Caja cuadrada, sin fondo ni marco: respeta la transparencia del PNG y nunca recorta.
 */
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
        "inline-flex shrink-0 items-center justify-center",
        className ?? "h-10 w-10",
      )}
    >
      {url ? (
        <img
          src={url}
          alt={`Escudo de ${name}`}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <Shield className="h-2/3 w-2/3 text-muted-foreground/60" />
      )}
    </span>
  );
}
