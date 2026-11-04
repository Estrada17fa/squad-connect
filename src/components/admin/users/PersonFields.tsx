import * as React from "react";
import { Camera, Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { BirthDatePicker, PhotoCircle } from "./FormParts";
import { cn } from "@/lib/utils";

export interface PersonData {
  first_name: string;
  paternal_last_name: string;
  maternal_last_name: string;
  email: string;
  phone: string;
  birthdate: string;
  birthplace: string;
  nationality: string;
  avatar_url: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export const EMPTY_PERSON: PersonData = {
  first_name: "", paternal_last_name: "", maternal_last_name: "", email: "", phone: "", birthdate: "",
  birthplace: "", nationality: "Mexicana", avatar_url: "", emergency_contact_name: "", emergency_contact_phone: "",
};

export type PersonKey = keyof PersonData;
export const PERSONA_KEYS: PersonKey[] = ["first_name", "paternal_last_name", "birthdate", "birthplace", "nationality"];
export const CONTACTO_KEYS: PersonKey[] = ["email", "phone", "emergency_contact_name", "emergency_contact_phone"];
const OPTIONAL: PersonKey[] = ["maternal_last_name", "avatar_url"];

const MSG: Partial<Record<PersonKey, string>> = {
  first_name: "Escribe el nombre",
  paternal_last_name: "Escribe el apellido",
  email: "Escribe un correo válido",
  phone: "Escribe un teléfono válido",
  birthdate: "Elige la fecha",
  birthplace: "Escribe el lugar",
  nationality: "Elige la nacionalidad",
  emergency_contact_name: "Escribe el nombre",
  emergency_contact_phone: "Escribe un teléfono válido",
};

/* ---------- Teléfono: lada + número con formato ---------- */
export function splitPhone(v: string): { lada: string; num: string } {
  const s = v.trim();
  if (!s) return { lada: "+52", num: "" };
  const m = s.match(/^(\+\d{1,4})\s*(.*)$/);
  if (m) return { lada: m[1]!, num: m[2]!.replace(/\D/g, "") };
  return { lada: "+52", num: s.replace(/\D/g, "") };
}
export function formatNum(d: string) {
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 12)}`;
}
export function joinPhone(lada: string, num: string) {
  return num ? `${lada} ${formatNum(num)}` : "";
}
export function phoneValid(v: string) {
  const { lada, num } = splitPhone(v);
  return lada === "+52" ? num.length === 10 : num.length >= 7 && num.length <= 12;
}

function fieldValid(k: PersonKey, p: PersonData): boolean {
  const v = (p[k] ?? "").trim();
  if (k === "email") return /^\S+@\S+\.\S+$/.test(v);
  if (k === "phone" || k === "emergency_contact_phone") return phoneValid(v);
  return v.length > 0;
}

/**
 * Errores por campo. En modo "edit" un campo que estaba vacío desde antes no bloquea
 * (se muestra "Falta completar"); solo es error si tenía dato y se borró o es inválido.
 */
export function fieldErrors(
  p: PersonData,
  keys: PersonKey[],
  opts?: { mode?: "create" | "edit"; initial?: PersonData },
): Partial<Record<PersonKey, string>> {
  const out: Partial<Record<PersonKey, string>> = {};
  for (const k of keys) {
    if (OPTIONAL.includes(k)) continue;
    const empty = !(p[k] ?? "").trim();
    if (opts?.mode === "edit" && empty && !(opts.initial?.[k] ?? "").trim()) continue;
    if (!fieldValid(k, p)) out[k] = MSG[k] ?? "Completa este dato";
  }
  return out;
}

/** Compatibilidad: lista de errores de todos los obligatorios. */
export function personErrors(p: PersonData, withEmail: boolean, opts?: { mode?: "create" | "edit"; initial?: PersonData }): string[] {
  const keys = [...PERSONA_KEYS, ...CONTACTO_KEYS].filter((k) => withEmail || k !== "email");
  return Object.values(fieldErrors(p, keys, opts)) as string[];
}

export function personPayload(p: PersonData) {
  const n = (s: string) => (s.trim() ? s.trim() : null);
  const ph = (s: string) => (splitPhone(s).num ? s.trim() : null);
  return {
    first_name: p.first_name.trim(),
    paternal_last_name: p.paternal_last_name.trim(),
    maternal_last_name: n(p.maternal_last_name),
    phone: ph(p.phone),
    birthdate: n(p.birthdate),
    birthplace: n(p.birthplace),
    nationality: n(p.nationality),
    avatar_url: n(p.avatar_url),
    emergency_contact_name: n(p.emergency_contact_name),
    emergency_contact_phone: ph(p.emergency_contact_phone),
  };
}

/* ---------- Piezas visuales ---------- */
export const fieldCls =
  "h-11 w-full rounded-xl border-0 bg-card px-3 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring";

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="block text-[11px] font-medium text-muted-foreground">{label}</label>
      {children}
      {error ? <p className="text-[11px] text-urgency-red">{error}</p> : hint ? <p className="text-[11px] text-urgency-amber">{hint}</p> : null}
    </div>
  );
}

const NATIONALITIES = [
  "Mexicana", "Estadounidense", "Canadiense", "Argentina", "Brasileña", "Chilena", "Colombiana", "Costarricense",
  "Cubana", "Dominicana", "Ecuatoriana", "Española", "Guatemalteca", "Hondureña", "Nicaragüense", "Panameña",
  "Paraguaya", "Peruana", "Puertorriqueña", "Salvadoreña", "Uruguaya", "Venezolana", "Boliviana", "Francesa",
  "Italiana", "Alemana", "Inglesa", "Portuguesa", "Neerlandesa", "Belga", "Japonesa", "Coreana", "China",
  "Nigeriana", "Camerunesa", "Ghanesa", "Marfileña", "Senegalesa", "Australiana", "Otra",
];

function NationalityPicker({ id, value, onChange, onBlur }: { id: string; value: string; onChange: (v: string) => void; onBlur?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const opts = value && !NATIONALITIES.includes(value) ? [value, ...NATIONALITIES] : NATIONALITIES;
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) onBlur?.(); }}>
      <PopoverTrigger asChild>
        <button id={id} type="button" className={cn(fieldCls, "flex items-center justify-between text-left", !value && "text-muted-foreground")}>
          <span className="truncate">{value || "Elegir"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar…" />
          <CommandList className="max-h-56">
            <CommandEmpty>Sin resultados</CommandEmpty>
            {opts.map((n) => (
              <CommandItem key={n} value={n} onSelect={() => { onChange(n); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", value === n ? "opacity-100" : "opacity-0")} /> {n}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function PhoneInput({ id, value, onChange, onBlur, enterHint = "next" }: { id: string; value: string; onChange: (v: string) => void; onBlur?: () => void; enterHint?: "next" | "done" }) {
  const { lada, num } = splitPhone(value);
  return (
    <div className="flex gap-2">
      <input
        aria-label="Lada"
        className={cn(fieldCls, "w-[68px] shrink-0 px-2 text-center")}
        inputMode="tel"
        value={lada}
        onChange={(e) => {
          const d = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
          onChange(num ? joinPhone(`+${d}`, num) : `+${d}`);
        }}
        onBlur={onBlur}
      />
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        enterKeyHint={enterHint}
        className={fieldCls}
        placeholder="612 123 4567"
        value={formatNum(num)}
        onChange={(e) => onChange(joinPhone(lada, e.target.value.replace(/\D/g, "").slice(0, 12)))}
        onBlur={onBlur}
      />
    </div>
  );
}

/** Foto en fila: círculo de 72 px + "Agregar foto (opcional)". */
function PhotoRow({ value, onChange, userId }: { value: string; onChange: (v: string) => void; userId: string }) {
  return (
    <div className="flex items-center gap-3">
      <PhotoCircle value={value || null} onChange={(u) => onChange(u ?? "")} userId={userId} size={72} hideCaption />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{value ? "Foto lista" : "Agregar foto"} <span className="font-normal text-muted-foreground">(opcional)</span></p>
        {value ? <button type="button" onClick={() => onChange("")} className="text-xs text-muted-foreground">Quitar foto</button> : <p className="flex items-center gap-1 text-xs text-muted-foreground"><Camera className="h-3 w-3" /> Toca el círculo</p>}
      </div>
    </div>
  );
}

export function PersonFields({
  value, onChange, section = "all", withEmail, userId, showAll, mode = "create", initial,
}: {
  value: PersonData;
  onChange: (v: PersonData) => void;
  section?: "persona" | "contacto" | "all";
  withEmail: boolean;
  userId?: string;
  /** Forzar mostrar errores (al intentar avanzar/guardar). */
  showAll?: boolean;
  mode?: "create" | "edit";
  initial?: PersonData;
}) {
  const [touched, setTouched] = React.useState<Partial<Record<PersonKey, boolean>>>({});
  const rootRef = React.useRef<HTMLDivElement>(null);
  const keys = [...PERSONA_KEYS, ...CONTACTO_KEYS, "maternal_last_name" as PersonKey];
  const errs = fieldErrors(value, keys, { mode, initial });
  const err = (k: PersonKey) => (showAll || touched[k] ? errs[k] : undefined);
  const hint = (k: PersonKey) => (mode === "edit" && !(value[k] ?? "").trim() && !(initial?.[k] ?? "").trim() ? "Falta completar" : undefined);
  const touch = (k: PersonKey) => () => setTouched((t) => ({ ...t, [k]: true }));
  const set = (k: PersonKey) => (v: string) => onChange({ ...value, [k]: v });

  // "Siguiente" del teclado pasa al próximo campo de texto.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement)) return;
    const inputs = Array.from(rootRef.current?.querySelectorAll<HTMLInputElement>("input[data-nav]") ?? []);
    const i = inputs.indexOf(e.target);
    if (i >= 0) {
      e.preventDefault();
      const nxt = inputs[i + 1];
      if (nxt) nxt.focus(); else e.target.blur();
    }
  }

  const txt = (k: PersonKey, id: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      id={id}
      data-nav
      enterKeyHint="next"
      className={fieldCls}
      value={value[k]}
      onChange={(e) => set(k)(e.target.value)}
      onBlur={touch(k)}
      aria-invalid={!!err(k)}
      {...extra}
    />
  );

  const persona = (
    <div className="space-y-3">
      <PhotoRow value={value.avatar_url} onChange={set("avatar_url")} userId={userId ?? "nuevos"} />
      <Field id="pf-fn" label="Nombre" error={err("first_name")} hint={hint("first_name")}>{txt("first_name", "pf-fn", { autoComplete: "given-name", autoCapitalize: "words" })}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="pf-ap" label="Apellido paterno" error={err("paternal_last_name")} hint={hint("paternal_last_name")}>{txt("paternal_last_name", "pf-ap", { autoComplete: "family-name", autoCapitalize: "words" })}</Field>
        <Field id="pf-am" label="Apellido materno (opcional)">{txt("maternal_last_name", "pf-am", { autoCapitalize: "words" })}</Field>
      </div>
      <Field id="pf-bd" label="Fecha de nacimiento" error={err("birthdate")} hint={hint("birthdate")}>
        <BirthDatePicker id="pf-bd" value={value.birthdate} onChange={(v) => { onChange({ ...value, birthdate: v }); touch("birthdate")(); }} filled />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="pf-bp" label="Lugar de nacimiento" error={err("birthplace")} hint={hint("birthplace")}>{txt("birthplace", "pf-bp", { placeholder: "Ciudad, estado", autoCapitalize: "words", enterKeyHint: "done" })}</Field>
        <Field id="pf-nat" label="Nacionalidad" error={err("nationality")} hint={hint("nationality")}>
          <NationalityPicker id="pf-nat" value={value.nationality} onChange={set("nationality")} onBlur={touch("nationality")} />
        </Field>
      </div>
    </div>
  );

  const contacto = (
    <div className="space-y-3">
      {withEmail ? (
        <Field id="pf-em" label="Correo" error={err("email")}>
          {txt("email", "pf-em", { type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "none", placeholder: "nombre@correo.com" })}
        </Field>
      ) : null}
      <Field id="pf-ph" label="Teléfono" error={err("phone")} hint={hint("phone")}>
        <PhoneInput id="pf-ph" value={value.phone} onChange={set("phone")} onBlur={touch("phone")} />
      </Field>
      <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contacto de emergencia</p>
      <Field id="pf-en" label="Nombre" error={err("emergency_contact_name")} hint={hint("emergency_contact_name")}>
        {txt("emergency_contact_name", "pf-en", { autoCapitalize: "words", placeholder: "ej. Mamá, papá, pareja" })}
      </Field>
      <Field id="pf-ep" label="Teléfono" error={err("emergency_contact_phone")} hint={hint("emergency_contact_phone")}>
        <PhoneInput id="pf-ep" value={value.emergency_contact_phone} onChange={set("emergency_contact_phone")} onBlur={touch("emergency_contact_phone")} enterHint="done" />
      </Field>
    </div>
  );

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="space-y-5">
      {section !== "contacto" ? persona : null}
      {section !== "persona" ? contacto : null}
    </div>
  );
}
