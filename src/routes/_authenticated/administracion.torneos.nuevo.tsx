import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { UsersHeader, BackLabel, StepProgress } from "@/components/admin/users/ui";
import { StickyFooterActions } from "@/components/admin/users/FormParts";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useSaveTournament, useSaveTournamentTeam } from "@/hooks/useTournaments";
import { copyClubLogoAsCrest, uploadCrestFile } from "@/hooks/useTournamentAdmin";
import { useClub, useClubLogoUrl } from "@/hooks/useClubSettings";
import { POINTS_PRESETS, TIEBREAKER_LABEL, type PointsConfig } from "@/lib/torneo";
import { ADMIN_TYPE_LABEL, formatSentence } from "@/lib/torneoAdmin";
import {
  DataFields, FormatFields, PointsFields, TeamsEditor, CrestImage, groupsFor, newTeamDraft, presetKeyOf,
  type DataDraft, type FormatDraft, type TeamDraft,
} from "@/components/admin/torneos/parts";

export const Route = createFileRoute("/_authenticated/administracion/torneos/nuevo")({
  head: () => ({ meta: [{ title: "Nuevo torneo · Squad" }, { name: "description", content: "Crea un torneo en cinco pasos." }] }),
  component: NuevoTorneo,
});

const STEPS = ["Datos", "Formato", "Puntos", "Equipos", "Resumen"];
const PREMIER = POINTS_PRESETS.find((p) => p.key === "premier_mx") ?? POINTS_PRESETS[0];

function NuevoTorneo() {
  const navigate = useNavigate();
  const { profile, user, clubName } = useApp() as any;
  const clubId: string = profile?.club_id ?? "";
  const teams = useEditableTeams("torneo");
  const club = useClub(clubId || null);
  const clubLogo = useClubLogoUrl(club.data?.logo_url);
  const save = useSaveTournament();
  const saveTeam = useSaveTournamentTeam();

  const [step, setStep] = React.useState(0);
  const [tried, setTried] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<DataDraft>({ name: "", season: "", team_id: "", type: "liga", logo_path: null, logoFile: null });
  const [fmt, setFmt] = React.useState<FormatDraft>({ format: "sin_grupos", groups_count: 2, has_playoffs: false, playoff_start_round: 8, playoff_two_legs: true });
  const [points, setPoints] = React.useState<PointsConfig>({ ...PREMIER.config, tiebreakers: [...PREMIER.config.tiebreakers] });
  const [list, setList] = React.useState<TeamDraft[]>([]);

  React.useEffect(() => { if (!data.team_id && teams.length === 1) setData((d) => ({ ...d, team_id: teams[0].id! })); }, [teams, data.team_id]);
  // El equipo del club entra solo, con su logo.
  React.useEffect(() => {
    const name = club.data?.name ?? clubName;
    if (!name) return;
    setList((l) => (l.some((t) => t.is_our_team) ? l : [{ ...newTeamDraft(name), is_our_team: true, preview_url: null }, ...l]));
  }, [clubName, club.data?.name]);
  React.useEffect(() => { setList((l) => l.map((t) => (t.is_our_team ? { ...t, preview_url: clubLogo.data ?? null } : t))); }, [clubLogo.data]);

  const errors: string[] = [];
  if (step === 0) { if (!data.name.trim()) errors.push("Escribe el nombre"); if (!data.team_id) errors.push("Elige la categoría"); }
  if (step === 3 && list.some((t) => !t.name.trim())) errors.push("Hay equipos sin nombre");
  const next = () => { setTried(true); if (errors.length) return; setTried(false); setStep((s) => s + 1); window.scrollTo(0, 0); };

  async function create() {
    setBusy(true);
    try {
      const logo = data.logoFile ? await uploadCrestFile(clubId, data.logoFile, "torneos") : null;
      const id = await save.mutateAsync({
        club_id: clubId, team_id: data.team_id, name: data.name.trim(), season: data.season.trim() || null,
        type: data.type, status: "en_curso", notes: null, logo_path: logo, created_by: user?.id ?? "",
        ...fmt, ...points,
      });
      const failed: string[] = [];
      for (const t of list) {
        try {
          const crest = t.file ? await uploadCrestFile(clubId, t.file) : t.is_our_team ? await copyClubLogoAsCrest(clubId, club.data?.logo_url) : null;
          await saveTeam.mutateAsync({ tournament_id: id, club_id: clubId, name: t.name.trim(), short_name: t.short_name.trim() || null, crest_path: crest, is_our_team: t.is_our_team, group_label: fmt.format === "grupos" ? t.group_label : null, notes: null });
        } catch { failed.push(t.name); }
      }
      if (failed.length) toast.error(`Torneo creado, pero no se guardaron: ${failed.join(", ")}`);
      else toast.success("Torneo creado");
      navigate({ to: "/administracion/torneos/$id", params: { id } });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo crear el torneo");
    } finally { setBusy(false); }
  }

  const categoria = teams.find((t) => t.id === data.team_id)?.name ?? "—";
  const preset = presetKeyOf(points);
  const Summary = ({ title, to, children }: { title: string; to: number; children: React.ReactNode }) => (
    <section className="rounded-[16px] bg-card p-3.5">
      <div className="mb-1 flex items-center justify-between"><h2 className="text-xs font-semibold text-muted-foreground">{title}</h2><button type="button" onClick={() => setStep(to)} className="coord-press min-h-9 px-2 text-xs font-semibold text-primary">Editar</button></div>
      <div className="text-sm">{children}</div>
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="sticky top-0 z-20 -mx-4 -mt-2 space-y-1 bg-background/95 px-4 pb-2 pt-1 backdrop-blur">
        <UsersHeader back={<Link to="/administracion/torneos"><BackLabel>Torneos</BackLabel></Link>} />
        <h1 className="font-display text-[20px] font-bold leading-tight">Nuevo torneo</h1>
        <StepProgress steps={STEPS} current={step} />
      </div>

      {step === 0 ? <DataFields value={data} onChange={(p) => setData((d) => ({ ...d, ...p }))} teams={teams.map((t) => ({ id: t.id!, name: t.name }))} /> : null}
      {step === 1 ? <FormatFields value={fmt} onChange={(p) => setFmt((f) => ({ ...f, ...p }))} /> : null}
      {step === 2 ? <PointsFields value={points} onChange={(p) => setPoints((c) => ({ ...c, ...p }))} /> : null}
      {step === 3 ? <TeamsEditor teams={list} onChange={setList} groups={groupsFor(fmt)} /> : null}
      {step === 4 ? (
        <div className="space-y-2.5">
          <Summary title="Datos" to={0}>
            <div className="flex items-center gap-3">
              <CrestImage file={data.logoFile} alt="Logo" className="h-14 w-14" />
              <div className="min-w-0"><p className="font-semibold">{data.name}</p><p className="text-xs text-muted-foreground">{[data.season, categoria, ADMIN_TYPE_LABEL[data.type]].filter(Boolean).join(" · ")}</p></div>
            </div>
          </Summary>
          <Summary title="Formato" to={1}>{formatSentence(fmt)}</Summary>
          <Summary title="Puntos" to={2}>
            {(preset ? POINTS_PRESETS.find((p) => p.key === preset)?.label + " · " : "") + `${points.points_win} / ${points.points_draw} / ${points.points_loss}`}
            <p className="mt-0.5 text-xs text-muted-foreground">Desempate: {points.tiebreakers.map((k) => TIEBREAKER_LABEL[k]).join(", ")}</p>
          </Summary>
          <Summary title={`Equipos · ${list.length}`} to={3}>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {list.map((t) => (
                <div key={t.key} className="flex flex-col items-center gap-1 text-center">
                  <CrestImage file={t.file} url={t.preview_url} alt={t.name} className="h-10 w-10" fallback={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-[10px] font-bold">{(t.short_name || t.name).slice(0, 3).toUpperCase()}</span>} />
                  <span className="w-full truncate text-[11px]">{t.short_name || t.name}</span>
                </div>
              ))}
            </div>
          </Summary>
        </div>
      ) : null}

      {tried && errors.length ? <p role="alert" className="text-sm text-destructive">{errors.join(" · ")}</p> : null}

      <StickyFooterActions noNav onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}>
        {step < 4 ? (
          <button type="button" onClick={next} aria-disabled={errors.length > 0} className={"coord-press min-h-12 w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground" + (errors.length ? " opacity-40" : "")}>Siguiente</button>
        ) : (
          <button type="button" onClick={create} disabled={busy} className="coord-press min-h-12 w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Creando…" : "Crear torneo"}</button>
        )}
      </StickyFooterActions>
    </div>
  );
}
