import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { UsersHeader, BackLabel, GroupCard, RowButton } from "@/components/admin/users/ui";
import { StickyFooterActions } from "@/components/admin/users/FormParts";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { CREST_BUCKET, useDeleteTournamentTeam, useSaveTournament, useSaveTournamentTeam, useTournamentTeams, useTournaments, type TournamentRow, type TournamentTeamRow } from "@/hooks/useTournaments";
import { tournamentInputFrom, uploadCrestFile } from "@/hooks/useTournamentAdmin";
import { supabase } from "@/integrations/supabase/client";
import { formatSentence, ADMIN_TYPE_LABEL } from "@/lib/torneoAdmin";
import { TIEBREAKER_LABEL, type PointsConfig } from "@/lib/torneo";
import { DataFields, FormatFields, PointsFields, TeamsEditor, groupsFor, type DataDraft, type FormatDraft, type TeamDraft } from "@/components/admin/torneos/parts";

type Section = "datos" | "formato" | "puntos" | "equipos";
const LABEL: Record<Section, string> = { datos: "Datos", formato: "Formato", puntos: "Puntos y desempate", equipos: "Equipos" };

export const Route = createFileRoute("/_authenticated/administracion/torneos/$id/editar")({
  validateSearch: (s: Record<string, unknown>): { s?: Section } => ({ s: ["datos", "formato", "puntos", "equipos"].includes(String(s.s)) ? (s.s as Section) : undefined }),
  head: () => ({ meta: [{ title: "Editar torneo · Squad" }, { name: "description", content: "Edita el torneo por secciones." }] }),
  component: EditarTorneo,
});

function EditarTorneo() {
  const { id } = Route.useParams();
  const { s } = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useApp();
  const listQ = useTournaments(profile?.club_id ?? null);
  const t = (listQ.data ?? []).find((x) => x.id === id);
  const teamsQ = useTournamentTeams(id);
  if (listQ.isLoading || teamsQ.isLoading) return <LoadingState />;
  if (!t) return <div className="py-10 text-center text-sm text-muted-foreground">Torneo no encontrado.</div>;
  const go = (sec?: Section) => navigate({ to: "/administracion/torneos/$id/editar", params: { id }, search: sec ? { s: sec } : {} });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <UsersHeader
        back={s ? <button onClick={() => go()}><BackLabel>Editar</BackLabel></button> : <Link to="/administracion/torneos/$id" params={{ id }}><BackLabel>{t.name}</BackLabel></Link>}
        title={s ? LABEL[s] : "Editar torneo"}
      />
      {!s ? (
        <GroupCard>
          {(Object.keys(LABEL) as Section[]).map((k) => (
            <RowButton key={k} onClick={() => go(k)}>
              <span className="block text-sm font-semibold">{LABEL[k]}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {k === "datos" ? [t.season, t.team_name, ADMIN_TYPE_LABEL[t.type]].filter(Boolean).join(" · ") : k === "formato" ? formatSentence(t) : k === "puntos" ? `${t.points_win}/${t.points_draw}/${t.points_loss} · ${t.tiebreakers.map((x) => TIEBREAKER_LABEL[x]).join(", ")}` : `${(teamsQ.data ?? []).length} equipos`}
              </span>
            </RowButton>
          ))}
        </GroupCard>
      ) : s === "equipos" ? <TeamsSection t={t} rows={teamsQ.data ?? []} onDone={() => go()} /> : <MainSection key={s} t={t} section={s} onDone={() => go()} />}
    </div>
  );
}

function MainSection({ t, section, onDone }: { t: TournamentRow; section: Exclude<Section, "equipos">; onDone: () => void }) {
  const teams = useEditableTeams("torneo");
  const save = useSaveTournament();
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<DataDraft>({ name: t.name, season: t.season ?? "", team_id: t.team_id, type: t.type, logo_path: t.logo_path, logoFile: null });
  const [fmt, setFmt] = React.useState<FormatDraft>({ format: t.format, groups_count: t.groups_count, has_playoffs: t.has_playoffs, playoff_start_round: t.playoff_start_round, playoff_two_legs: t.playoff_two_legs });
  const [points, setPoints] = React.useState<PointsConfig>({ points_win: t.points_win, points_draw: t.points_draw, points_loss: t.points_loss, away_bonus_enabled: t.away_bonus_enabled, away_bonus_min_diff: t.away_bonus_min_diff, away_bonus_points: t.away_bonus_points, shootout_enabled: t.shootout_enabled, shootout_min_goals: t.shootout_min_goals, shootout_winner_points: t.shootout_winner_points, tiebreakers: [...t.tiebreakers] });

  async function submit() {
    if (section === "datos" && !data.name.trim()) return toast.error("Escribe el nombre");
    setBusy(true);
    try {
      let patch: any;
      if (section === "datos") {
        let logo = t.logo_path;
        if (data.logoFile) {
          logo = await uploadCrestFile(t.club_id, data.logoFile, "torneos");
          if (t.logo_path) await supabase.storage.from(CREST_BUCKET).remove([t.logo_path]);
        }
        patch = { name: data.name.trim(), season: data.season.trim() || null, team_id: data.team_id, type: data.type, logo_path: logo };
      } else patch = section === "formato" ? fmt : points;
      await save.mutateAsync(tournamentInputFrom(t, patch));
      toast.success("Guardado"); onDone();
    } catch (e: any) { toast.error(e?.message ?? "No se pudo guardar"); } finally { setBusy(false); }
  }
  const options = teams.some((x) => x.id === t.team_id) ? teams : [...teams, { id: t.team_id, name: t.team_name ?? "Categoría" } as any];

  return (
    <>
      {section === "datos" ? <DataFields value={data} onChange={(p) => setData((d) => ({ ...d, ...p }))} teams={options.map((x) => ({ id: x.id!, name: x.name }))} /> : null}
      {section === "formato" ? <FormatFields value={fmt} onChange={(p) => setFmt((f) => ({ ...f, ...p }))} /> : null}
      {section === "puntos" ? <PointsFields value={points} onChange={(p) => setPoints((c) => ({ ...c, ...p }))} /> : null}
      <StickyFooterActions noNav onBack={onDone}>
        <button type="button" onClick={submit} disabled={busy} className="coord-press min-h-12 w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button>
      </StickyFooterActions>
    </>
  );
}

function TeamsSection({ t, rows, onDone }: { t: TournamentRow; rows: TournamentTeamRow[]; onDone: () => void }) {
  const saveTeam = useSaveTournamentTeam();
  const delTeam = useDeleteTournamentTeam();
  const [busy, setBusy] = React.useState(false);
  const [list, setList] = React.useState<TeamDraft[]>(() => rows.map((r) => ({ key: r.id, name: r.name, short_name: r.short_name ?? "", group_label: r.group_label, file: null, crest_path: r.crest_path, is_our_team: r.is_our_team })));

  async function submit() {
    if (list.some((x) => !x.name.trim())) return toast.error("Hay equipos sin nombre");
    setBusy(true);
    try {
      const keep = new Set(list.map((x) => x.key));
      for (const r of rows) if (!keep.has(r.id)) await delTeam.mutateAsync(r);
      for (const d of list) {
        const orig = rows.find((r) => r.id === d.key);
        let crest = d.crest_path;
        if (d.file) { crest = await uploadCrestFile(t.club_id, d.file); if (orig?.crest_path) await supabase.storage.from(CREST_BUCKET).remove([orig.crest_path]); }
        const same = orig && orig.name === d.name.trim() && (orig.short_name ?? "") === d.short_name.trim() && orig.group_label === d.group_label && !d.file;
        if (same) continue;
        await saveTeam.mutateAsync({ id: orig?.id, tournament_id: t.id, club_id: t.club_id, name: d.name.trim(), short_name: d.short_name.trim() || null, crest_path: crest, is_our_team: d.is_our_team, group_label: t.format === "grupos" ? d.group_label : null, notes: orig?.notes ?? null });
      }
      toast.success("Equipos guardados"); onDone();
    } catch (e: any) { toast.error(e?.message ?? "No se pudo guardar"); } finally { setBusy(false); }
  }

  return (
    <>
      <TeamsEditor teams={list} onChange={setList} groups={groupsFor(t)} />
      <StickyFooterActions noNav onBack={onDone}>
        <button type="button" onClick={submit} disabled={busy} className="coord-press min-h-12 w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Guardando…" : "Guardar equipos"}</button>
      </StickyFooterActions>
    </>
  );
}
