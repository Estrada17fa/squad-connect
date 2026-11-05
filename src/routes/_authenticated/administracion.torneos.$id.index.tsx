import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UsersHeader, BackLabel, SectionLabel } from "@/components/admin/users/ui";
import { TournamentLogo } from "@/components/torneo/TournamentLogo";
import { TournamentTeamFormDialog } from "@/components/admin/TournamentTeamFormDialog";
import { CrestImage, Label, fieldCls } from "@/components/admin/torneos/parts";
import { useDeleteTournament, useSaveTournament, useTournamentTeams, useTournaments, type TournamentTeamRow } from "@/hooks/useTournaments";
import { useDeleteAdjustment, useSaveAdjustment, useTournamentAdjustments, useTournamentMatches } from "@/hooks/useTournamentMatches";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { tournamentInputFrom } from "@/hooks/useTournamentAdmin";
import { POINTS_PRESETS, TIEBREAKER_LABEL, groupLabels } from "@/lib/torneo";
import { ADMIN_TYPE_LABEL, DISPLAY_STATUS_LABEL, displayStatus, formatSentence } from "@/lib/torneoAdmin";
import { presetKeyOf } from "@/components/admin/torneos/parts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/administracion/torneos/$id/")({
  head: () => ({ meta: [{ title: "Torneo · Administración · Squad" }, { name: "description", content: "Ficha del torneo: formato, puntos, equipos y ajustes." }] }),
  component: FichaTorneo,
});

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <SectionLabel action={action}>{title}</SectionLabel>
      <div className="rounded-[16px] bg-card p-3.5 text-sm">{children}</div>
    </section>
  );
}

function FichaTorneo() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { profile, user } = useApp();
  const clubId = profile?.club_id ?? null;
  const listQ = useTournaments(clubId);
  const t = (listQ.data ?? []).find((x) => x.id === id) ?? null;
  const teamsQ = useTournamentTeams(id);
  const matchesQ = useTournamentMatches(id);
  const adjQ = useTournamentAdjustments(id);
  const editable = useEditableTeams("torneo");
  const canEdit = !!t && editable.some((e) => e.id === t.team_id);
  const save = useSaveTournament();
  const del = useDeleteTournament();
  const saveAdj = useSaveAdjustment();
  const delAdj = useDeleteAdjustment();
  const [teamEdit, setTeamEdit] = React.useState<{ open: boolean; row: TournamentTeamRow | null }>({ open: false, row: null });
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [adjOpen, setAdjOpen] = React.useState(false);
  const [adj, setAdj] = React.useState({ team_id: "", points: "", reason: "" });

  if (listQ.isLoading) return <LoadingState />;
  if (!t) return <div className="py-10 text-center text-sm text-muted-foreground">Torneo no encontrado. <Link to="/administracion/torneos" className="text-primary">Volver</Link></div>;

  const played = (matchesQ.data ?? []).filter((m) => m.status === "jugado").length;
  const st = displayStatus(t.status, played);
  const teams = teamsQ.data ?? [];
  const teamName = (tid: string) => { const x = teams.find((y) => y.id === tid); return x?.short_name || x?.name || "—"; };
  const preset = POINTS_PRESETS.find((p) => p.key === presetKeyOf(t));
  const groups = t.format === "grupos" ? groupLabels(t.groups_count) : [];

  const setStatus = async (status: "en_curso" | "finalizado") => {
    try { await save.mutateAsync(tournamentInputFrom(t, { status })); toast.success(status === "finalizado" ? "Torneo finalizado" : "Torneo reabierto"); }
    catch (e: any) { toast.error(e?.message ?? "No se pudo cambiar el estado"); }
  };
  const addAdjustment = async () => {
    const pts = Number(adj.points);
    if (!adj.team_id || !pts) return toast.error("Elige el equipo y los puntos");
    try {
      await saveAdj.mutateAsync({ tournament_id: t.id, club_id: t.club_id, team_id: adj.team_id, points: pts, reason: adj.reason.trim() || null, created_by: user?.id ?? "" });
      toast.success("Ajuste agregado"); setAdjOpen(false); setAdj({ team_id: "", points: "", reason: "" });
    } catch (e: any) { toast.error(e?.message ?? "No se pudo guardar"); }
  };
  const edit = (s?: string) => navigate({ to: "/administracion/torneos/$id/editar", params: { id: t.id }, search: s ? { s } : {} } as any);

  return (
    <div className="coord-enter mx-auto max-w-3xl space-y-5 pb-28">
      <UsersHeader
        back={<Link to="/administracion/torneos"><BackLabel>Torneos</BackLabel></Link>}
        actions={canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button aria-label="Más opciones" className="coord-press flex h-10 w-10 items-center justify-center rounded-xl"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => edit()}>Editar</DropdownMenuItem>
              {t.status === "en_curso" ? <DropdownMenuItem onSelect={() => setStatus("finalizado")}>Finalizar torneo</DropdownMenuItem> : <DropdownMenuItem onSelect={() => setStatus("en_curso")}>Reabrir torneo</DropdownMenuItem>}
              <DropdownMenuItem asChild><Link to="/admin/torneo">Ver versión actual</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmDel(true)}>Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      />

      <section className="flex flex-col items-center gap-2 text-center">
        <TournamentLogo path={t.logo_path} name={t.name} className="h-32 w-32" />
        <h1 className="font-display text-[22px] font-bold leading-tight">{t.name}</h1>
        <p className="text-[13px] text-muted-foreground">{[t.season, t.team_name, ADMIN_TYPE_LABEL[t.type]].filter(Boolean).join(" · ")}</p>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", st === "en_curso" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{DISPLAY_STATUS_LABEL[st]}</span>
        <Link to="/m/torneo" className="coord-press mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">Calendario y resultados en Técnica <ChevronRight className="h-4 w-4" /></Link>
      </section>

      <Card title="Formato" action={canEdit ? <button onClick={() => edit("formato")} className="text-xs font-semibold text-primary">Editar</button> : null}>{formatSentence(t)}</Card>
      <Card title="Puntos" action={canEdit ? <button onClick={() => edit("puntos")} className="text-xs font-semibold text-primary">Editar</button> : null}>
        <p>{preset ? `${preset.label} · ` : ""}Victoria {t.points_win} · Empate {t.points_draw} · Derrota {t.points_loss}</p>
        {t.away_bonus_enabled ? <p className="mt-0.5 text-xs text-muted-foreground">+{t.away_bonus_points} al ganar de visita por {t.away_bonus_min_diff} o más</p> : null}
        {t.shootout_enabled ? <p className="text-xs text-muted-foreground">Penales en empates de {t.shootout_min_goals}+ goles (+{t.shootout_winner_points})</p> : null}
      </Card>
      <Card title="Desempate" action={canEdit ? <button onClick={() => edit("puntos")} className="text-xs font-semibold text-primary">Editar</button> : null}>
        <ol className="space-y-1">{t.tiebreakers.map((k, i) => <li key={k} className="flex gap-2"><span className="w-4 text-muted-foreground">{i + 1}</span>{TIEBREAKER_LABEL[k]}</li>)}</ol>
      </Card>

      <section>
        <SectionLabel action={canEdit ? <button onClick={() => setTeamEdit({ open: true, row: null })} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" />Agregar</button> : null}>Equipos · {teams.length}</SectionLabel>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {teams.map((tm) => (
            <button key={tm.id} type="button" disabled={!canEdit} onClick={() => setTeamEdit({ open: true, row: tm })} className="coord-press flex flex-col items-center gap-1.5 rounded-[16px] bg-card p-3 text-center">
              <CrestImage path={tm.crest_path} alt={`Escudo de ${tm.name}`} className="h-14 w-14" fallback={<span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xs font-bold">{(tm.short_name || tm.name).slice(0, 3).toUpperCase()}</span>} />
              <span className="w-full truncate text-xs font-semibold">{tm.short_name || tm.name}</span>
              {tm.is_our_team ? <span className="text-[10px] font-semibold text-primary">Nuestro equipo</span> : tm.group_label ? <span className="text-[10px] text-muted-foreground">Grupo {tm.group_label}</span> : null}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel action={canEdit ? <button onClick={() => setAdjOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" />Agregar ajuste</button> : null}>Ajustes de puntos</SectionLabel>
        {(adjQ.data ?? []).length === 0 ? <p className="rounded-[16px] bg-card p-3.5 text-sm text-muted-foreground">Sin ajustes ni sanciones.</p> : (
          <ul className="overflow-hidden rounded-[16px] bg-card">
            {(adjQ.data ?? []).map((a) => (
              <li key={a.id} className="flex min-h-14 items-center gap-3 border-b border-border/30 px-3.5 py-2 last:border-0">
                <span className={cn("w-10 text-center font-display text-base font-bold", a.points < 0 ? "text-destructive" : "text-primary")}>{a.points > 0 ? `+${a.points}` : a.points}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{teamName(a.team_id)}</span><span className="block truncate text-xs text-muted-foreground">{[a.reason, new Date(a.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })].filter(Boolean).join(" · ")}</span></span>
                {canEdit ? <button aria-label="Quitar ajuste" onClick={() => delAdj.mutate(a)} className="coord-press flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground"><Trash2 className="h-4 w-4" /></button> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {clubId ? <TournamentTeamFormDialog open={teamEdit.open} onOpenChange={(o) => setTeamEdit((s) => ({ ...s, open: o }))} clubId={clubId} tournamentId={t.id} team={teamEdit.row} groups={groups} /> : null}

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajuste de puntos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="adj-team">Equipo</Label>
              <select id="adj-team" value={adj.team_id} onChange={(e) => setAdj({ ...adj, team_id: e.target.value })} className="h-11 w-full rounded-md bg-card px-3 text-[15px]">
                <option value="">Elige un equipo</option>
                {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <div><Label htmlFor="adj-pts">Puntos (negativo para sanción)</Label><Input id="adj-pts" inputMode="numeric" className={fieldCls} value={adj.points} onChange={(e) => setAdj({ ...adj, points: e.target.value.replace(/[^\d-]/g, "") })} placeholder="-3" /></div>
            <div><Label htmlFor="adj-reason">Motivo</Label><Input id="adj-reason" className={fieldCls} value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} placeholder="Alineación indebida" /></div>
            <button type="button" onClick={addAdjustment} disabled={saveAdj.isPending} className="coord-press min-h-12 w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50">Guardar ajuste</button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Eliminar torneo"
        description={`Se eliminarán también sus equipos participantes${(matchesQ.data ?? []).length ? ` y tiene ${(matchesQ.data ?? []).length} partidos registrados` : ""}. Esta acción no se puede deshacer.`}
        loading={del.isPending}
        onConfirm={async () => {
          try { await del.mutateAsync(t); toast.success("Torneo eliminado"); navigate({ to: "/administracion/torneos" }); }
          catch (e: any) { toast.error(e?.message ?? "No se pudo eliminar"); }
        }}
      />
    </div>
  );
}
