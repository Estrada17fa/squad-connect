import { Check, Circle } from "lucide-react";
import { checkPassword } from "@/lib/password";
import { cn } from "@/lib/utils";

/**
 * Checklist en vivo de la regla única de contraseña.
 * Siempre visible (también con el campo vacío) para que el usuario sepa qué se pide.
 */
export function PasswordRequirements({ value, className }: { value: string; className?: string }) {
  const { requirements } = checkPassword(value);
  return (
    <div className={cn("space-y-1.5", className)}>
      <ul className="grid gap-1 sm:grid-cols-2">
        {requirements.map((r) => (
          <li
            key={r.key}
            className={cn(
              "flex items-center gap-1.5 text-[11px] transition-colors",
              r.met ? "text-primary" : "text-muted-foreground",
            )}
          >
            {r.met ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <Circle className="h-3 w-3 shrink-0" aria-hidden />
            )}
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Puedes usar símbolos (!@#$%&amp;*), acentos o espacios: se aceptan, pero no son obligatorios.
      </p>
    </div>
  );
}
