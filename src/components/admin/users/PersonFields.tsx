import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUploadField } from "@/components/perfil/AvatarUploadField";

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
  birthplace: "", nationality: "", avatar_url: "", emergency_contact_name: "", emergency_contact_phone: "",
};

export function personErrors(p: PersonData, withEmail: boolean): string[] {
  const e: string[] = [];
  if (!p.first_name.trim()) e.push("Escribe el nombre");
  if (!p.paternal_last_name.trim()) e.push("Escribe el apellido paterno");
  if (withEmail && !/^\S+@\S+\.\S+$/.test(p.email.trim())) e.push("Escribe un correo válido");
  return e;
}

export function personPayload(p: PersonData) {
  const n = (s: string) => (s.trim() ? s.trim() : null);
  return {
    first_name: p.first_name.trim(),
    paternal_last_name: p.paternal_last_name.trim(),
    maternal_last_name: n(p.maternal_last_name),
    phone: n(p.phone),
    birthdate: n(p.birthdate),
    birthplace: n(p.birthplace),
    nationality: n(p.nationality),
    avatar_url: n(p.avatar_url),
    emergency_contact_name: n(p.emergency_contact_name),
    emergency_contact_phone: n(p.emergency_contact_phone),
  };
}

function F({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function PersonFields({
  value, onChange, withEmail, userId,
}: { value: PersonData; onChange: (v: PersonData) => void; withEmail: boolean; userId?: string }) {
  const set = (k: keyof PersonData) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const cls = "h-11 rounded-xl";
  return (
    <div className="space-y-4">
      <AvatarUploadField
        label="Foto"
        value={value.avatar_url || null}
        onChange={(url) => onChange({ ...value, avatar_url: url ?? "" })}
        userId={userId ?? "nuevos"}
        name={`${value.first_name} ${value.paternal_last_name}`.trim() || null}
      />
      <F id="pf-fn" label="Nombre *"><Input id="pf-fn" className={cls} value={value.first_name} onChange={set("first_name")} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F id="pf-ap" label="Apellido paterno *"><Input id="pf-ap" className={cls} value={value.paternal_last_name} onChange={set("paternal_last_name")} /></F>
        <F id="pf-am" label="Apellido materno"><Input id="pf-am" className={cls} value={value.maternal_last_name} onChange={set("maternal_last_name")} /></F>
      </div>
      {withEmail ? (
        <F id="pf-em" label="Correo *"><Input id="pf-em" type="email" inputMode="email" className={cls} value={value.email} onChange={set("email")} /></F>
      ) : null}
      <F id="pf-ph" label="Teléfono"><Input id="pf-ph" type="tel" inputMode="tel" className={cls} value={value.phone} onChange={set("phone")} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F id="pf-bd" label="Fecha de nacimiento"><Input id="pf-bd" type="date" className={cls} value={value.birthdate} onChange={set("birthdate")} /></F>
        <F id="pf-nat" label="Nacionalidad"><Input id="pf-nat" className={cls} value={value.nationality} onChange={set("nationality")} /></F>
      </div>
      <F id="pf-bp" label="Lugar de nacimiento"><Input id="pf-bp" className={cls} value={value.birthplace} onChange={set("birthplace")} placeholder="ej. Guadalajara, Jalisco" /></F>
      <div className="grid grid-cols-2 gap-3">
        <F id="pf-en" label="Contacto de emergencia"><Input id="pf-en" className={cls} value={value.emergency_contact_name} onChange={set("emergency_contact_name")} /></F>
        <F id="pf-ep" label="Teléfono de emergencia"><Input id="pf-ep" type="tel" className={cls} value={value.emergency_contact_phone} onChange={set("emergency_contact_phone")} /></F>
      </div>
    </div>
  );
}
