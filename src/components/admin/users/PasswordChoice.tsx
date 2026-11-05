import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getClubPasswordStatus } from "@/lib/members.functions";
import { generateTempPassword } from "@/hooks/useAdminUsers";
import { checkPassword } from "@/lib/password";

export type PasswordMode = "club" | "custom" | "random";
export interface PasswordValue { mode: PasswordMode; custom: string; random: string }

export function initialPasswordValue(): PasswordValue {
  return { mode: "club", custom: "", random: generateTempPassword() };
}

/** Datos a enviar al servidor: con "club" nunca se envía contraseña. */
export function passwordPayload(v: PasswordValue) {
  if (v.mode === "club") return { password_mode: "club" as const, password: null };
  return { password_mode: v.mode, password: v.mode === "custom" ? v.custom : v.random };
}

export function passwordErrors(v: PasswordValue, clubConfigured: boolean): string[] {
  if (v.mode === "club") return clubConfigured ? [] : ["Configura la contraseña del club"];
  if (v.mode === "custom") return checkPassword(v.custom).missing;
  return [];
}

export function useClubPasswordStatus() {
  const fn = useServerFn(getClubPasswordStatus);
  return useQuery({ queryKey: ["club-password-status"], queryFn: () => fn(), staleTime: 60_000 });
}

const OPTIONS: { id: PasswordMode; label: string }[] = [
  { id: "club", label: "Del club" },
  { id: "custom", label: "Escribir una" },
  { id: "random", label: "Aleatoria" },
];

export function PasswordChoice({ value, onChange }: { value: PasswordValue; onChange: (v: PasswordValue) => void }) {
  const status = useClubPasswordStatus();
  const configured = status.data?.configured ?? false;
  const [show, setShow] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  // Si el servidor no tiene contraseña del club, cambiar a aleatoria.
  React.useEffect(() => {
    if (status.isSuccess && !configured && value.mode === "club") onChange({ ...value, mode: "random" });
  }, [status.isSuccess, configured]); // eslint-disable-line react-hooks/exhaustive-deps

  const customErr = value.mode === "custom" && touched ? checkPassword(value.custom).missing[0] : undefined;

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Contraseña inicial" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {OPTIONS.map((o) => {
          const disabled = o.id === "club" && !configured;
          const active = value.mode === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange({ ...value, mode: o.id })}
              className={"coord-press min-h-10 rounded-full text-xs font-semibold transition-colors disabled:opacity-40 " + (active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {value.mode === "club" || (!configured && status.isSuccess) ? (
        value.mode === "club" ? (
          <div className="rounded-[14px] bg-card p-3">
            <p className="text-sm font-semibold">Contraseña del club</p>
            <p className="text-xs text-muted-foreground">Se usará la contraseña común del club. La verás al terminar.</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Configura la contraseña del club para usar esa opción.</p>
        )
      ) : null}

      {value.mode === "custom" ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2 rounded-[14px] bg-card p-1.5">
            <Input
              aria-label="Contraseña"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={value.custom}
              onChange={(e) => onChange({ ...value, custom: e.target.value })}
              onBlur={() => setTouched(true)}
              placeholder="Mínimo 8 caracteres"
              className="h-11 flex-1 border-0 bg-transparent font-mono shadow-none focus-visible:ring-0"
            />
            <button aria-label={show ? "Ocultar" : "Mostrar"} onClick={() => setShow(!show)} className="coord-press flex h-10 w-10 items-center justify-center rounded-xl">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {customErr ? <p className="text-xs text-urgency-red">{customErr}</p> : <p className="text-xs text-muted-foreground">Mínimo 8, con número, minúscula y mayúscula.</p>}
        </div>
      ) : null}

      {value.mode === "random" ? (
        <div className="flex items-center gap-2 rounded-[14px] bg-card p-3">
          <span className="min-w-0 flex-1 truncate font-mono text-base font-semibold">{value.random}</span>
          <button aria-label="Generar otra" onClick={() => onChange({ ...value, random: generateTempPassword() })} className="coord-press flex h-10 w-10 items-center justify-center rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">La persona deberá cambiarla al entrar.</p>
    </div>
  );
}
