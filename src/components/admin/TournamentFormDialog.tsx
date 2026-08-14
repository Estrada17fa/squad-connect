import * as React from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Sparkles } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamOption } from "@/hooks/useAccess";
import { useSaveTournament, type TournamentRow } from "@/hooks/useTournaments";
import {
  ALL_TIEBREAKERS,
  DEFAULT_POINTS,
  POINTS_PRESETS,
  TIEBREAKER_LABEL,
  TOURNAMENT_STATUS_LABEL,
  TOURNAMENT_TYPE_LABEL,
  type PointsConfig,
  type TiebreakerKey,
  type TournamentStatus,
  type TournamentType,
} from "@/lib/torneo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Categorías donde el usuario puede editar Torneo. */
  teams: TeamOption[];
  tournament?: TournamentRow | null;
}

export function TournamentFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  teams,
  tournament,
}: Props) {
  const isEdit = !!tournament;
  const save = useSaveTournament();

  const teamChoices = React.useMemo(
    () => teams.flatMap((t) => (t.id ? [{ id: t.id, name: t.name }] : [])),
    [teams],
  );

  const [name, setName] = React.useState("");
  const [season, setSeason] = React.useState("");
  const [teamId, setTeamId] = React.useState("");
  const [type, setType] = React.useState<TournamentType>("liga");
  const [status, setStatus] = React.useState<TournamentStatus>("en_curso");
  const [notes, setNotes] = React.useState("");
  const [points, setPoints] = React.useState<PointsConfig>(DEFAULT_POINTS);
  const [format, setFormat] = React.useState<TournamentFormat>("sin_grupos");
  const [groupsCount, setGroupsCount] = React.useState(2);
  const [hasPlayoffs, setHasPlayoffs] = React.useState(false);
  const [startRound, setStartRound] = React.useState(4);
  const [twoLegs, setTwoLegs] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(tournament?.name ?? "");
    setSeason(tournament?.season ?? "");
    setTeamId(tournament?.team_id ?? teamChoices[0]?.id ?? "");
    setType(tournament?.type ?? "liga");
    setStatus(tournament?.status ?? "en_curso");
    setNotes(tournament?.notes ?? "");
    setFormat((tournament?.format as TournamentFormat) ?? "sin_grupos");
    setGroupsCount(tournament?.groups_count ?? 2);
    setHasPlayoffs(tournament?.has_playoffs ?? false);
    setStartRound(tournament?.playoff_start_round ?? 4);
    setTwoLegs(tournament?.playoff_two_legs ?? false);
    setLogoFile(null);
    setPoints(
      tournament
        ? {
            points_win: tournament.points_win,
            points_draw: tournament.points_draw,
            points_loss: tournament.points_loss,
            away_bonus_enabled: tournament.away_bonus_enabled,
            away_bonus_min_diff: tournament.away_bonus_min_diff,
            away_bonus_points: tournament.away_bonus_points,
            shootout_enabled: tournament.shootout_enabled,
            shootout_min_goals: tournament.shootout_min_goals,
            shootout_winner_points: tournament.shootout_winner_points,
            tiebreakers: tournament.tiebreakers,
          }
        : DEFAULT_POINTS,
    );
  }, [open, tournament, teamChoices]);

  const setP = (patch: Partial<PointsConfig>) => setPoints((prev) => ({ ...prev, ...patch }));

  function toggleTiebreaker(key: TiebreakerKey) {
    setPoints((prev) => ({
      ...prev,
      tiebreakers: prev.tiebreakers.includes(key)
        ? prev.tiebreakers.filter((k) => k !== key)
        : [...prev.tiebreakers, key],
    }));
  }

  function move(key: TiebreakerKey, dir: -1 | 1) {
    setPoints((prev) => {
      const list = [...prev.tiebreakers];
      const i = list.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return prev;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...prev, tiebreakers: list };
    });
  }

  async function handleSave() {
    if (!name.trim()) return toast.error("El nombre del torneo es obligatorio");
    if (!teamId) return toast.error("Selecciona la categoría del club");
    setBusy(true);
    try {
      let logo = tournament?.logo_path ?? null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() ?? "png";
        const path = `${clubId}/torneos/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(CREST_BUCKET).upload(path, logoFile);
        if (error) throw error;
        if (logo) await supabase.storage.from(CREST_BUCKET).remove([logo]);
        logo = path;
      }
      await save.mutateAsync({
        id: tournament?.id,
        club_id: clubId,
        team_id: teamId,
        name: name.trim(),
        season: season.trim() || null,
        type,
        status,
        notes: notes.trim() || null,
        logo_path: logo,
        format,
        groups_count: groupsCount,
        has_playoffs: hasPlayoffs,
        playoff_start_round: startRound,
        playoff_two_legs: twoLegs,
        created_by: userId,
        ...points,
      });
      toast.success(isEdit ? "Torneo actualizado" : "Torneo creado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }


  const unused = ALL_TIEBREAKERS.filter((k) => !points.tiebreakers.includes(k));

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar torneo" : "Nuevo torneo"}</EntitySheetTitle>
        <EntitySheetDescription>
          Datos de la competencia y su sistema de puntos. Los equipos participantes se agregan
          después, dentro del torneo.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Datos del torneo
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Nombre</Label>
            <Input
              id="t-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Liga Premier — Clausura"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-season">Temporada</Label>
              <Input
                id="t-season"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="2025-2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría del club</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {teamChoices.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as TournamentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TOURNAMENT_TYPE_LABEL) as TournamentType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TOURNAMENT_TYPE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TournamentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TOURNAMENT_STATUS_LABEL) as TournamentStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TOURNAMENT_STATUS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-notes">Notas</Label>
            <Textarea
              id="t-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Formato, sede, observaciones…"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sistema de puntos
          </h3>
          <div className="flex flex-wrap gap-2">
            {POINTS_PRESETS.map((p) => (
              <Button
                key={p.key}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPoints(p.config);
                  toast.success(`Preset aplicado: ${p.label}`);
                }}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {p.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label="Victoria"
              value={points.points_win}
              onChange={(v) => setP({ points_win: v })}
            />
            <NumberField
              label="Empate"
              value={points.points_draw}
              onChange={(v) => setP({ points_draw: v })}
            />
            <NumberField
              label="Derrota"
              value={points.points_loss}
              onChange={(v) => setP({ points_loss: v })}
            />
          </div>

          <ToggleBlock
            title="Bonus de visita"
            description="Punto extra al ganar como visitante por una diferencia mínima de goles."
            checked={points.away_bonus_enabled}
            onCheckedChange={(v) => setP({ away_bonus_enabled: v })}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Diferencia mínima de goles"
                value={points.away_bonus_min_diff}
                min={1}
                onChange={(v) => setP({ away_bonus_min_diff: v })}
              />
              <NumberField
                label="Puntos extra"
                value={points.away_bonus_points}
                onChange={(v) => setP({ away_bonus_points: v })}
              />
            </div>
          </ToggleBlock>

          <ToggleBlock
            title="Penales en empate"
            description="Si el empate llega a cierta cantidad de goles, se define en penales y el ganador suma puntos extra."
            checked={points.shootout_enabled}
            onCheckedChange={(v) => setP({ shootout_enabled: v })}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Goles mínimos del empate"
                value={points.shootout_min_goals}
                onChange={(v) => setP({ shootout_min_goals: v })}
              />
              <NumberField
                label="Puntos al ganador"
                value={points.shootout_winner_points}
                onChange={(v) => setP({ shootout_winner_points: v })}
              />
            </div>
          </ToggleBlock>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Criterios de desempate
          </h3>
          <p className="text-xs text-muted-foreground">
            Se aplican en orden, después de los puntos.
          </p>
          <ol className="space-y-2">
            {points.tiebreakers.map((k, i) => (
              <li
                key={k}
                className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-inset ring-white/5"
              >
                <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate text-sm">{TIEBREAKER_LABEL[k]}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Subir criterio"
                  disabled={i === 0}
                  onClick={() => move(k, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Bajar criterio"
                  disabled={i === points.tiebreakers.length - 1}
                  onClick={() => move(k, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleTiebreaker(k)}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ol>
          {unused.length ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Agregar criterio</Label>
              <div className="space-y-2">
                {unused.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={false} onCheckedChange={() => toggleTiebreaker(k)} />
                    {TIEBREAKER_LABEL[k]}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear torneo"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        value={String(value)}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      />
    </div>
  );
}

function ToggleBlock({
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {checked ? children : null}
    </div>
  );
}
