import * as React from "react";
import { ArrowDown, ArrowUp, Check, ClipboardList, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCrestUrl } from "@/hooks/useTournaments";
import {
  ALL_TIEBREAKERS, POINTS_PRESETS, TIEBREAKER_LABEL, groupLabels, PLAYOFF_ROUNDS, PLAYOFF_ROUND_LABEL,
  type PointsConfig, type TiebreakerKey, type TournamentFormat, type TournamentType,
} from "@/lib/torneo";
import { formatSentence, parsePastedTeams } from "@/lib/torneoAdmin";
import { MoreFields } from "@/components/admin/users/FormParts";

export const fieldCls = "h-11 border-0 bg-card text-[15px]";

export interface DataDraft { name: string; season: string; team_id: string; type: TournamentType; logo_path: string | null; logoFile: File | null }
export interface FormatDraft { format: TournamentFormat; groups_count: number; has_playoffs: boolean; playoff_start_round: number; playoff_two_legs: boolean }
export interface TeamDraft { key: string; name: string; short_name: string; group_label: string | null; file: File | null; crest_path: string | null; is_our_team: boolean; preview_url?: string | null }

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-foreground">{children}</label>;
}

export function Segmented<T extends string | number>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-xl bg-card p-1">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn("coord-press min-h-10 flex-1 rounded-lg text-sm font-semibold transition-colors", value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Imagen completa (sin recortar): archivo local o ruta guardada. */
export function CrestImage({ file, path, url, alt, className, fallback }: { file?: File | null; path?: string | null; url?: string | null; alt: string; className?: string; fallback?: React.ReactNode }) {
  const [local, setLocal] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) { setLocal(null); return; }
    const u = URL.createObjectURL(file); setLocal(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const { data: remote } = useCrestUrl(file ? null : path);
  const src = local ?? remote ?? url ?? null;
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-contain" /> : fallback}
    </span>
  );
}

function PickFile({ onPick, children, className, label }: { onPick: (f: File) => void; children: React.ReactNode; className?: string; label: string }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" aria-label={label} onClick={() => ref.current?.click()} className={className}>{children}</button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
    </>
  );
}

export function LogoBox({ file, path, onPick, name }: { file: File | null; path: string | null; onPick: (f: File) => void; name: string }) {
  const has = !!file || !!path;
  return (
    <PickFile label={has ? "Cambiar logo" : "Subir logo"} onPick={onPick} className="coord-press mx-auto flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-[20px] bg-card p-3">
      {has ? <CrestImage file={file} path={path} alt={`Logo de ${name || "torneo"}`} className="h-full w-full" /> : (
        <><ImagePlus className="h-8 w-8 text-muted-foreground" /><span className="text-xs text-muted-foreground">Subir logo</span></>
      )}
    </PickFile>
  );
}

export function DataFields({ value, onChange, teams }: { value: DataDraft; onChange: (p: Partial<DataDraft>) => void; teams: { id: string; name: string }[] }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <LogoBox file={value.logoFile} path={value.logo_path} name={value.name} onPick={(f) => onChange({ logoFile: f })} />
        <p className="mt-1 text-[11px] text-muted-foreground">Logo (opcional) · se muestra completo</p>
      </div>
      <div><Label htmlFor="t-name">Nombre</Label><Input id="t-name" className={fieldCls} value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Ej. Liga Premier" enterKeyHint="next" /></div>
      <div><Label htmlFor="t-season">Temporada</Label><Input id="t-season" className={fieldCls} value={value.season} onChange={(e) => onChange({ season: e.target.value })} placeholder="Ej. 2026-27" /></div>
      <div>
        <Label>Categoría del club</Label>
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <button key={t.id} type="button" onClick={() => onChange({ team_id: t.id })} aria-pressed={value.team_id === t.id}
              className={cn("coord-press min-h-10 rounded-full px-4 text-sm font-semibold", value.team_id === t.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <div><Label>Tipo</Label><Segmented ariaLabel="Tipo de torneo" value={value.type} onChange={(v) => onChange({ type: v })} options={[{ value: "liga", label: "Liga" }, { value: "copa", label: "Copa" }, { value: "otro", label: "Amistoso" }]} /></div>
    </div>
  );
}

export function FormatFields({ value, onChange }: { value: FormatDraft; onChange: (p: Partial<FormatDraft>) => void }) {
  return (
    <div className="space-y-4">
      <div><Label>Fase regular</Label><Segmented ariaLabel="Fase regular" value={value.format} onChange={(v) => onChange({ format: v })} options={[{ value: "sin_grupos", label: "Todos contra todos" }, { value: "grupos", label: "Grupos" }]} /></div>
      {value.format === "grupos" ? (
        <div><Label>Número de grupos</Label><Segmented ariaLabel="Número de grupos" value={value.groups_count} onChange={(v) => onChange({ groups_count: v })} options={[2, 3, 4, 6, 8].map((n) => ({ value: n, label: String(n) }))} /></div>
      ) : null}
      <div className="flex min-h-12 items-center justify-between rounded-xl bg-card px-3">
        <span className="text-sm font-semibold">Liguilla</span>
        <Switch checked={value.has_playoffs} onCheckedChange={(v) => onChange({ has_playoffs: v })} aria-label="Liguilla" />
      </div>
      {value.has_playoffs ? (
        <>
          <div><Label>Ronda inicial</Label><Segmented ariaLabel="Ronda inicial" value={value.playoff_start_round} onChange={(v) => onChange({ playoff_start_round: v })} options={PLAYOFF_ROUNDS.map((r) => ({ value: r as number, label: PLAYOFF_ROUND_LABEL[r].replace(" de final", "").replace("Semifinales", "Semis") }))} /></div>
          <div className="flex min-h-12 items-center justify-between rounded-xl bg-card px-3">
            <span className="text-sm font-semibold">Ida y vuelta</span>
            <Switch checked={value.playoff_two_legs} onCheckedChange={(v) => onChange({ playoff_two_legs: v })} aria-label="Ida y vuelta" />
          </div>
        </>
      ) : null}
      <p className="rounded-xl bg-primary/10 px-3 py-2.5 text-sm text-foreground">{formatSentence(value)}</p>
    </div>
  );
}

function Num({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="min-w-0 flex-1"><Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="numeric" className={cn(fieldCls, "text-center")} value={String(value)} onChange={(e) => onChange(Number(e.target.value.replace(/[^\d-]/g, "")) || 0)} />
    </div>
  );
}

export function presetKeyOf(p: PointsConfig): string | null {
  const hit = POINTS_PRESETS.find((x) => JSON.stringify({ ...x.config, tiebreakers: [] }) === JSON.stringify({ ...p, tiebreakers: [] }));
  return hit?.key ?? null;
}

export function PointsFields({ value, onChange }: { value: PointsConfig; onChange: (p: Partial<PointsConfig>) => void }) {
  const current = presetKeyOf(value);
  const unused = ALL_TIEBREAKERS.filter((k) => !value.tiebreakers.includes(k));
  const move = (i: number, d: -1 | 1) => {
    const l = [...value.tiebreakers]; const j = i + d; if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]]; onChange({ tiebreakers: l });
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {POINTS_PRESETS.map((p) => (
          <button key={p.key} type="button" aria-pressed={current === p.key} onClick={() => onChange({ ...p.config, tiebreakers: [...p.config.tiebreakers] })}
            className={cn("coord-press flex items-start gap-3 rounded-[16px] bg-card p-3 text-left ring-1", current === p.key ? "ring-primary" : "ring-transparent")}>
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", current === p.key ? "bg-primary text-primary-foreground" : "bg-muted")}>{current === p.key ? <Check className="h-3.5 w-3.5" /> : null}</span>
            <span className="min-w-0"><span className="block text-sm font-semibold">{p.label}</span><span className="block text-xs text-muted-foreground">{p.description}</span></span>
          </button>
        ))}
        {!current ? <p className="px-1 text-xs text-muted-foreground">Personalizado</p> : null}
      </div>
      <div className="flex gap-2">
        <Num id="p-win" label="Victoria" value={value.points_win} onChange={(n) => onChange({ points_win: n })} />
        <Num id="p-draw" label="Empate" value={value.points_draw} onChange={(n) => onChange({ points_draw: n })} />
        <Num id="p-loss" label="Derrota" value={value.points_loss} onChange={(n) => onChange({ points_loss: n })} />
      </div>
      <MoreFields label="Reglas avanzadas">
        <div className="space-y-3">
          <div className="flex min-h-12 items-center justify-between rounded-xl bg-card px-3"><span className="text-sm font-semibold">Bonus de visita</span><Switch checked={value.away_bonus_enabled} onCheckedChange={(v) => onChange({ away_bonus_enabled: v })} aria-label="Bonus de visita" /></div>
          {value.away_bonus_enabled ? <div className="flex gap-2"><Num id="ab-diff" label="Ganar por (goles)" value={value.away_bonus_min_diff} onChange={(n) => onChange({ away_bonus_min_diff: n })} /><Num id="ab-pts" label="Puntos extra" value={value.away_bonus_points} onChange={(n) => onChange({ away_bonus_points: n })} /></div> : null}
          <div className="flex min-h-12 items-center justify-between rounded-xl bg-card px-3"><span className="text-sm font-semibold">Penales en empate</span><Switch checked={value.shootout_enabled} onCheckedChange={(v) => onChange({ shootout_enabled: v })} aria-label="Penales en empate" /></div>
          {value.shootout_enabled ? <div className="flex gap-2"><Num id="so-min" label="Empates de (goles)" value={value.shootout_min_goals} onChange={(n) => onChange({ shootout_min_goals: n })} /><Num id="so-pts" label="Punto al ganador" value={value.shootout_winner_points} onChange={(n) => onChange({ shootout_winner_points: n })} /></div> : null}
        </div>
      </MoreFields>
      <div>
        <Label>Criterios de desempate (en orden)</Label>
        <ol className="overflow-hidden rounded-[16px] bg-card">
          {value.tiebreakers.map((k, i) => (
            <li key={k} className="flex min-h-12 items-center gap-2 border-b border-border/30 px-3 last:border-0">
              <span className="w-5 text-xs font-semibold text-muted-foreground">{i + 1}</span>
              <span className="flex-1 text-sm">{TIEBREAKER_LABEL[k]}</span>
              <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="coord-press flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Bajar" disabled={i === value.tiebreakers.length - 1} onClick={() => move(i, 1)} className="coord-press flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label="Quitar" onClick={() => onChange({ tiebreakers: value.tiebreakers.filter((x) => x !== k) })} className="coord-press flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ol>
        {unused.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unused.map((k: TiebreakerKey) => (
              <button key={k} type="button" onClick={() => onChange({ tiebreakers: [...value.tiebreakers, k] })} className="coord-press inline-flex min-h-9 items-center gap-1 rounded-full bg-card px-3 text-xs text-muted-foreground"><Plus className="h-3 w-3" />{TIEBREAKER_LABEL[k]}</button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function newTeamDraft(name = ""): TeamDraft {
  return { key: crypto.randomUUID(), name, short_name: "", group_label: null, file: null, crest_path: null, is_our_team: false };
}

export function TeamsEditor({ teams, onChange, groups }: { teams: TeamDraft[]; onChange: (t: TeamDraft[]) => void; groups: string[] }) {
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [paste, setPaste] = React.useState("");
  const set = (key: string, p: Partial<TeamDraft>) => onChange(teams.map((t) => (t.key === key ? { ...t, ...p } : t)));
  const addPasted = () => {
    const have = new Set(teams.map((t) => t.name.trim().toLowerCase()));
    const add = parsePastedTeams(paste).filter((n) => !have.has(n.toLowerCase())).map((n) => newTeamDraft(n));
    onChange([...teams, ...add]); setPaste(""); setPasteOpen(false);
  };
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {teams.map((t) => (
          <li key={t.key} className="rounded-[16px] bg-card p-2.5">
            <div className="flex items-center gap-2.5">
              <PickFile label={`Escudo de ${t.name || "equipo"}`} onPick={(f) => set(t.key, { file: f })} className="coord-press flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 p-1">
                <CrestImage file={t.file} path={t.crest_path} url={t.preview_url} alt={`Escudo de ${t.name}`} className="h-full w-full" fallback={<ImagePlus className="h-5 w-5 text-muted-foreground" />} />
              </PickFile>
              <div className="min-w-0 flex-1 space-y-1.5">
                <Input aria-label="Nombre del equipo" className="h-9 border-0 bg-muted/40" value={t.name} onChange={(e) => set(t.key, { name: e.target.value })} placeholder="Nombre" />
                <div className="flex gap-1.5">
                  <Input aria-label="Nombre corto" className="h-9 w-24 border-0 bg-muted/40" maxLength={6} value={t.short_name} onChange={(e) => set(t.key, { short_name: e.target.value.toUpperCase() })} placeholder="Corto" />
                  {groups.length ? (
                    <select aria-label="Grupo" value={t.group_label ?? ""} onChange={(e) => set(t.key, { group_label: e.target.value || null })} className="h-9 flex-1 rounded-md bg-muted/40 px-2 text-sm">
                      <option value="">Sin grupo</option>
                      {groups.map((g) => <option key={g} value={g}>Grupo {g}</option>)}
                    </select>
                  ) : null}
                </div>
              </div>
              {t.is_our_team ? null : (
                <button type="button" aria-label={`Quitar ${t.name}`} onClick={() => onChange(teams.filter((x) => x.key !== t.key))} className="coord-press flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
            {t.is_our_team ? <p className="mt-1.5 text-[11px] font-semibold text-primary">Nuestro equipo</p> : null}
          </li>
        ))}
      </ul>
      {pasteOpen ? (
        <div className="space-y-2 rounded-[16px] bg-card p-3">
          <Label htmlFor="paste">Un nombre por línea</Label>
          <Textarea id="paste" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"Tigres\nPumas\nAtlas"} className="border-0 bg-muted/40" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPasteOpen(false)} className="coord-press min-h-10 px-3 text-sm text-muted-foreground">Cancelar</button>
            <button type="button" onClick={addPasted} disabled={!parsePastedTeams(paste).length} className="coord-press min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">Agregar {parsePastedTeams(paste).length || ""}</button>
          </div>
        </div>
      ) : null}
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange([...teams, newTeamDraft()])} className="coord-press inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-card text-sm font-semibold"><Plus className="h-4 w-4" />Agregar equipo</button>
        <button type="button" onClick={() => setPasteOpen(true)} className="coord-press inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-card text-sm font-semibold"><ClipboardList className="h-4 w-4" />Pegar lista</button>
      </div>
    </div>
  );
}

export function groupsFor(f: FormatDraft) { return f.format === "grupos" ? groupLabels(f.groups_count) : []; }
