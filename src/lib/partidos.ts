/** Reglas puras del módulo Partidos (Coordinación › Técnica). */

export type FormationKey = "4-4-2" | "4-3-3" | "4-2-3-1" | "3-5-2" | "5-3-2";
export const FORMATIONS: FormationKey[] = ["4-4-2", "4-3-3", "4-2-3-1", "3-5-2", "5-3-2"];
export const DEFAULT_FORMATION: FormationKey = "4-3-3";

export interface Slot { key: string; label: string; group: PosGroup; x: number; y: number }
export type PosGroup = "POR" | "DEF" | "MED" | "DEL";

const row = (group: PosGroup, y: number, labels: string[]): Slot[] =>
  labels.map((label, i) => ({ key: label, label: label.replace(/-\w$/, ""), group, y, x: ((i + 1) * 100) / (labels.length + 1) }));

const GK: Slot = { key: "POR", label: "POR", group: "POR", x: 50, y: 90 };

const LAYOUT: Record<FormationKey, Slot[]> = {
  "4-4-2": [GK, ...row("DEF", 72, ["LI", "DFC-I", "DFC-D", "LD"]), ...row("MED", 48, ["MI", "MC-I", "MC-D", "MD"]), ...row("DEL", 22, ["DC-I", "DC-D"])],
  "4-3-3": [GK, ...row("DEF", 72, ["LI", "DFC-I", "DFC-D", "LD"]), ...row("MED", 48, ["MC-I", "MCD", "MC-D"]), ...row("DEL", 22, ["EI", "DC", "ED"])],
  "4-2-3-1": [GK, ...row("DEF", 74, ["LI", "DFC-I", "DFC-D", "LD"]), ...row("MED", 56, ["MCD-I", "MCD-D"]), ...row("MED", 36, ["MI", "MP", "MD"]), ...row("DEL", 16, ["DC"])],
  "3-5-2": [GK, ...row("DEF", 72, ["DFC-I", "DFC", "DFC-D"]), ...row("MED", 48, ["CI", "MC-I", "MCD", "MC-D", "CD"]), ...row("DEL", 22, ["DC-I", "DC-D"])],
  "5-3-2": [GK, ...row("DEF", 72, ["CI", "DFC-I", "DFC", "DFC-D", "CD"]), ...row("MED", 48, ["MC-I", "MCD", "MC-D"]), ...row("DEL", 22, ["DC-I", "DC-D"])],
};

export function formationSlots(f: string | null | undefined): Slot[] {
  return LAYOUT[(FORMATIONS as string[]).includes(f ?? "") ? (f as FormationKey) : DEFAULT_FORMATION];
}

/** Grupo de posición desde el texto del plantel ("Portero", "Defensa"…). */
export function posGroup(position: string | null | undefined): PosGroup | null {
  const p = (position ?? "").toLowerCase();
  if (p.startsWith("port")) return "POR";
  if (p.startsWith("def")) return "DEF";
  if (p.startsWith("med")) return "MED";
  if (p.startsWith("del")) return "DEL";
  return null;
}

/** "2 POR · 6 DEF · 7 MED · 5 DEL" (omite grupos vacíos). */
export function positionCounts(positions: (string | null)[]): string {
  const c: Record<PosGroup, number> = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
  for (const p of positions) { const g = posGroup(p); if (g) c[g]++; }
  return (Object.keys(c) as PosGroup[]).filter((k) => c[k] > 0).map((k) => `${c[k]} ${k}`).join(" · ");
}

/** Altas y bajas entre lo guardado y lo nuevo. */
export function callupDiff(current: string[], next: string[]) {
  const a = new Set(current), b = new Set(next);
  return { added: next.filter((id) => !a.has(id)), removed: current.filter((id) => !b.has(id)) };
}

/** Cuántas personas recibirán aviso al guardar (solo si ya está publicada). */
export function noticeCount(published: boolean, current: string[], next: string[]) {
  if (!published) return 0;
  const d = callupDiff(current, next);
  return d.added.length + d.removed.length;
}

export const MIN_LINEUP = 11;
export const canBuildLineup = (callups: number) => callups >= MIN_LINEUP;

/** Asignación slot → user. Los convocados sin puesto quedan como suplentes. */
export function substitutes(callupIds: string[], assigned: Record<string, string>): string[] {
  const used = new Set(Object.values(assigned));
  return callupIds.filter((id) => !used.has(id));
}

/** Quita de la alineación a quien ya no esté convocado o puestos que no existen en la formación. */
export function cleanLineup(assigned: Record<string, string>, callupIds: string[], formation: string | null): Record<string, string> {
  const ok = new Set(callupIds);
  const slots = new Set(formationSlots(formation).map((s) => s.key));
  const out: Record<string, string> = {};
  for (const [slot, uid] of Object.entries(assigned)) if (ok.has(uid) && slots.has(slot)) out[slot] = uid;
  return out;
}

/** Asignar un jugador a un puesto: si ya estaba en otro, intercambian. */
export function assignSlot(assigned: Record<string, string>, slot: string, userId: string): Record<string, string> {
  const out = { ...assigned };
  const prevSlot = Object.keys(out).find((k) => out[k] === userId);
  const prevUser = out[slot];
  if (prevSlot) { if (prevUser) out[prevSlot] = prevUser; else delete out[prevSlot]; }
  out[slot] = userId;
  return out;
}

/** "Copiar alineación del partido anterior" solo si todos sus titulares siguen convocados. */
export function canCopyLineup(prev: Record<string, string>, callupIds: string[]) {
  const ok = new Set(callupIds);
  const vals = Object.values(prev);
  return vals.length > 0 && vals.every((u) => ok.has(u));
}

export type MyMatchState = "pendiente" | "convocado" | "no_convocado";
export const MY_STATE_LABEL: Record<MyMatchState, string> = {
  pendiente: "Convocatoria pendiente",
  convocado: "Convocado",
  no_convocado: "No convocado",
};

/** "Titular · DEF" / "Suplente" para la vista del jugador. */
export function lineupLabel(role: string | null | undefined, slot: string | null | undefined, formation?: string | null): string | null {
  if (!role) return null;
  if (role !== "titular") return "Suplente";
  const s = formationSlots(formation).find((x) => x.key === slot);
  return `Titular${s ? ` · ${s.group}` : ""}`;
}

export type CallupStatusLabel = "Sin convocatoria" | "Borrador" | "Publicada";
export function callupStatus(count: number, publishedAt: string | null | undefined): CallupStatusLabel {
  if (publishedAt) return "Publicada";
  return count > 0 ? "Borrador" : "Sin convocatoria";
}
