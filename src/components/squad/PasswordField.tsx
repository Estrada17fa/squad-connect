import * as React from "react";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordRequirements } from "./PasswordRequirements";
import { checkPassword, suggestPassword } from "@/lib/password";

/**
 * Campo de contraseña unificado: ver/ocultar, sugerencia segura de un toque
 * y checklist en vivo. Se usa en los 3 lugares donde se define una contraseña.
 */
export function PasswordField({
  id,
  value,
  onChange,
  onSuggested,
  hint,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  /** Se llama con la contraseña sugerida (para llenar también la confirmación). */
  onSuggested?: (v: string) => void;
  hint?: React.ReactNode;
  autoFocus?: boolean;
}) {
  const [show, setShow] = React.useState(false);
  const check = checkPassword(value);

  const suggest = () => {
    const p = suggestPassword();
    setShow(true);
    onChange(p);
    onSuggested?.(p);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type={show ? "text" : "password"}
            autoComplete="new-password"
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShow((v) => !v)}
            tabIndex={-1}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button type="button" variant="outline" onClick={suggest} className="shrink-0">
          <Wand2 className="mr-1.5 h-4 w-4" /> Sugerir
        </Button>
      </div>
      {hint}
      <PasswordRequirements value={value} />
      {value.length > 0 && check.missing.length > 0 ? (
        <p className="text-[11px] text-destructive">{check.missing.join(" · ")}</p>
      ) : null}
    </div>
  );
}
