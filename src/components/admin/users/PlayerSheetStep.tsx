import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldCls } from "@/components/admin/users/PersonFields";
import { BirthDatePicker, MoreFields } from "@/components/admin/users/FormParts";

/** Posiciones guardadas igual que en Plantel. */
export const POSITION_OPTIONS = [
  { short: "POR", value: "Portero" },
  { short: "DEF", value: "Defensa" },
  { short: "MED", value: "Mediocampista" },
  { short: "DEL", value: "Delantero" },
] as const;

const FEET = [
  { label: "Izquierdo", value: "izquierdo" },
  { label: "Derecho", value: "derecho" },
  { label: "Ambos", value: "ambos" },
] as const;

export interface TeamSheet { jersey: string; position: string; secondary: string }
export interface SharedSheet {
  foot: string; height: string; weight: string; shirt: string; pants: string; shoe: string;
  affiliation: string; previous_club: string; joined_at: string;
}
export const EMPTY_TEAM_SHEET: TeamSheet = { jersey: "", position: "", secondary: "" };
export const EMPTY_SHARED: SharedSheet = { foot: "", height: "", weight: "", shirt: "", pants: "", shoe: "", affiliation: "", previous_club: "", joined_at: "" };

export interface TakenNumber { team_id: string; number: number; name: string }

/** Errores por categoría: dorsal repetido o fuera de rango. */
export function sheetErrors(teamIds: string[], sheets: Record<string, TeamSheet>, taken: TakenNumber[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of teamIds) {
    const j = (sheets[t]?.jersey ?? "").trim();
    if (!j) continue;
    const n = Number(j);
    if (!Number.isInteger(n) || n < 0 || n > 999) { out[t] = "Dorsal inválido"; continue; }
    const who = taken.find((x) => x.team_id === t && x.number === n);
    if (who) out[t] = `El ${n} ya lo usa ${who.name}`;
  }
  return out;
}

export function sheetIsEmpty(teamIds: string[], sheets: Record<string, TeamSheet>) {
  return teamIds.every((t) => !(sheets[t]?.jersey ?? "").trim() && !sheets[t]?.position);
}

const toInt = (s: string) => (s.trim() && Number.isFinite(Number(s)) ? Math.round(Number(s)) : null);
const txt = (s: string) => (s.trim() ? s.trim() : null);

export function sharedPayload(s: SharedSheet) {
  return {
    preferred_foot: (s.foot || null) as any,
    height_cm: toInt(s.height),
    weight_kg: toInt(s.weight),
    shirt_size: txt(s.shirt),
    pants_size: txt(s.pants),
    shoe_size: txt(s.shoe),
    affiliation_number: txt(s.affiliation),
    previous_club: txt(s.previous_club),
    joined_at: txt(s.joined_at),
  };
}
export function teamPayload(t: TeamSheet | undefined) {
  return {
    jersey_number: toInt(t?.jersey ?? ""),
    position: txt(t?.position ?? ""),
    secondary_position: txt(t?.secondary ?? ""),
  };
}

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-[11px] font-medium text-muted-foreground">{children}</label>;
}

function Segmented({ label, options, value, onChange }: { label: string; options: readonly { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? "" : o.value)}
            className={cn("coord-press min-h-9 flex-1 rounded-lg text-xs font-semibold", on ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const POS_OPTS = POSITION_OPTIONS.map((p) => ({ label: p.short, value: p.value }));

export function PlayerSheetStep({
  teams, sheets, onSheets, shared, onShared, errors,
}: {
  teams: { id: string; name: string }[];
  sheets: Record<string, TeamSheet>;
  onSheets: (v: Record<string, TeamSheet>) => void;
  shared: SharedSheet;
  onShared: (v: SharedSheet) => void;
  errors: Record<string, string>;
}) {
  const setT = (id: string, patch: Partial<TeamSheet>) => onSheets({ ...sheets, [id]: { ...EMPTY_TEAM_SHEET, ...sheets[id], ...patch } });
  const setS = (k: keyof SharedSheet) => (v: string) => onShared({ ...shared, [k]: v });
  const multi = teams.length > 1;
  const inp = (k: keyof SharedSheet, id: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} className={fieldCls} value={shared[k]} onChange={(e) => setS(k)(e.target.value)} {...extra} />
  );

  return (
    <div className="space-y-4">
      {teams.map((t) => {
        const s = sheets[t.id] ?? EMPTY_TEAM_SHEET;
        return (
          <section key={t.id} className="space-y-2.5">
            {multi ? <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.name}</p> : null}
            <div className="grid grid-cols-[88px_1fr] items-end gap-2.5">
              <div className="space-y-0.5">
                <Label htmlFor={`ps-j-${t.id}`}>Dorsal</Label>
                <input
                  id={`ps-j-${t.id}`}
                  inputMode="numeric"
                  enterKeyHint="next"
                  maxLength={3}
                  className={fieldCls}
                  value={s.jersey}
                  onChange={(e) => setT(t.id, { jersey: e.target.value.replace(/\D/g, "") })}
                />
              </div>
              <div className="space-y-0.5">
                <Label>Posición</Label>
                <Segmented label={`Posición ${t.name}`} options={POS_OPTS} value={s.position} onChange={(v) => setT(t.id, { position: v })} />
              </div>
            </div>
            {errors[t.id] ? <p className="text-[11px] text-urgency-red">{errors[t.id]}</p> : null}
          </section>
        );
      })}

      <div className="space-y-0.5">
        <Label>Pie</Label>
        <Segmented label="Pie" options={FEET} value={shared.foot} onChange={setS("foot")} />
      </div>

      <MoreFields>
        {teams.map((t) => (
          <div key={t.id} className="space-y-0.5">
            <Label>Posición secundaria{multi ? ` · ${t.name}` : ""}</Label>
            <Segmented label={`Posición secundaria ${t.name}`} options={POS_OPTS} value={(sheets[t.id] ?? EMPTY_TEAM_SHEET).secondary} onChange={(v) => setT(t.id, { secondary: v })} />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-0.5"><Label htmlFor="ps-h">Estatura (cm)</Label>{inp("height", "ps-h", { inputMode: "numeric" })}</div>
          <div className="space-y-0.5"><Label htmlFor="ps-w">Peso (kg)</Label>{inp("weight", "ps-w", { inputMode: "numeric" })}</div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="space-y-0.5"><Label htmlFor="ps-sh">Camiseta</Label>{inp("shirt", "ps-sh", { placeholder: "M" })}</div>
          <div className="space-y-0.5"><Label htmlFor="ps-pa">Short</Label>{inp("pants", "ps-pa", { placeholder: "M" })}</div>
          <div className="space-y-0.5"><Label htmlFor="ps-sz">Calzado</Label>{inp("shoe", "ps-sz", { placeholder: "27" })}</div>
        </div>
        <div className="space-y-0.5"><Label htmlFor="ps-af">Número de afiliación</Label>{inp("affiliation", "ps-af")}</div>
        <div className="space-y-0.5"><Label htmlFor="ps-pc">Club anterior</Label>{inp("previous_club", "ps-pc", { autoCapitalize: "words" })}</div>
        <div className="space-y-0.5">
          <Label htmlFor="ps-ji">Fecha de ingreso al club</Label>
          <BirthDatePicker id="ps-ji" value={shared.joined_at} onChange={setS("joined_at")} filled />
        </div>
      </MoreFields>
    </div>
  );
}
