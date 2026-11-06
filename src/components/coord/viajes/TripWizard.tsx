import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, Plane, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepProgress } from "@/components/admin/users/ui";
import { LocationPicker } from "@/components/location/LocationPicker";
import { TeamCrest } from "@/components/torneo/TeamCrest";
import { addTraveler, createTrip, removeTraveler, updateTrip, type TripInput, type TripRow } from "@/hooks/useTrips";
import { useMatchCallups, useOurMatches, type OurMatch } from "@/hooks/useMatchOps";
import type { TeamOption } from "@/hooks/useAccess";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "./parts";
import { TravelerPickerSheet } from "./TravelerPickerSheet";
import { useTripCandidates, type TripCandidate } from "./useTripCandidates";

const STEPS = ["Partido", "Fechas y reunión", "Viajeros", "Resumen"];

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** Fecha sin hora: se guarda a mediodía local para que no cambie de día. */
function fromDateInput(v: string) {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).toISOString();
}
const niceDate = (v: string) => (v ? format(new Date(fromDateInput(v)), "EEE d MMM", { locale: es }) : "—");
const matchDate = (iso: string | null) => (iso ? format(new Date(iso), "EEE d MMM · HH:mm", { locale: es }) : "Fecha por definir");

function MatchCrests({ m }: { m: OurMatch }) {
  const home = m.isHome ? m.ours : m.rival;
  const away = m.isHome ? m.rival : m.ours;
  return (
    <span className="flex items-center gap-2">
      <TeamCrest path={home?.crest_path ?? null} name={home?.name ?? "Local"} className="h-10 w-10" />
      <span className="text-xs font-bold text-muted-foreground">vs</span>
      <TeamCrest path={away?.crest_path ?? null} name={away?.name ?? "Visita"} className="h-10 w-10" />
    </span>
  );
}

function Faces({ people }: { people: { id: string; full_name: string | null; avatar_url: string | null }[] }) {
  const shown = people.slice(0, 5);
  return (
    <span className="flex items-center">
      {shown.map((p, i) => <PersonAvatar key={p.id} p={p} size={6} className={cn("ring-2 ring-card", i > 0 && "-ml-1.5")} />)}
      {people.length > 5 ? <span className="-ml-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold ring-2 ring-card">+{people.length - 5}</span> : null}
    </span>
  );
}

function SummaryCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        <button onClick={onEdit} className="text-xs font-semibold text-primary">Editar</button>
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export function TripWizard({ clubId, userId, teams, trip }: { clubId: string; userId: string; teams: TeamOption[]; trip?: TripRow | null }) {
  const isEdit = !!trip;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = React.useState(isEdit ? 3 : 0);
  /** En edición se entra a una sección y se guarda sola. */
  const [editing, setEditing] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [teamId, setTeamId] = React.useState<string | null>(trip?.team_id ?? teams[0]?.id ?? null);
  const [matchEventId, setMatchEventId] = React.useState<string | null>(trip?.match_event_id ?? null);
  const [noMatch, setNoMatch] = React.useState(isEdit && !trip?.match_event_id);
  const [title, setTitle] = React.useState(trip?.title ?? "");
  const [destination, setDestination] = React.useState(trip?.destination ?? "");
  const [dep, setDep] = React.useState(toDateInput(trip?.departure_at));
  const [ret, setRet] = React.useState(toDateInput(trip?.return_at));
  const [meetingLocationId, setMeetingLocationId] = React.useState<string | null>(trip?.meeting_location_id ?? null);
  const [meetingPoint, setMeetingPoint] = React.useState<string | null>(trip?.meeting_point ?? null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set((trip?.travelers ?? []).map((t) => t.user_id)));
  const [picker, setPicker] = React.useState<null | "jugadores" | "staff">(null);

  const matchesQ = useOurMatches(clubId);
  const awayMatches = React.useMemo(() => {
    const from = Date.now() - 12 * 3600_000;
    return (matchesQ.data ?? [])
      .filter((m) => !m.isHome && m.kickoff_at && new Date(m.kickoff_at).getTime() >= from && m.status !== "jugado" && (!m.tournament_team_id || teams.some((t) => t.id === m.tournament_team_id)))
      .sort((a, b) => (a.kickoff_at ?? "").localeCompare(b.kickoff_at ?? ""))
      .slice(0, 12);
  }, [matchesQ.data, teams]);
  const match = (matchesQ.data ?? []).find((m) => m.calendar_event_id && m.calendar_event_id === matchEventId) ?? null;
  const callupsQ = useMatchCallups(match ? [match.id] : []);
  const callupIds = (callupsQ.data ?? []).map((c) => c.user_id);

  const candQ = useTripCandidates(clubId, teamId);
  const cands = candQ.data ?? [];
  const byId = React.useMemo(() => new Map(cands.map((c) => [c.id, c] as const)), [cands]);
  const players = cands.filter((c) => c.group === "jugadores");
  const staff = cands.filter((c) => c.group === "staff");
  // Viajeros que ya estaban y no son de la categoría: se conservan y cuentan como staff.
  const extra: TripCandidate[] = (trip?.travelers ?? [])
    .filter((t) => !byId.has(t.user_id))
    .map((t) => ({ id: t.user_id, full_name: t.profile?.full_name ?? null, email: null, avatar_url: t.profile?.avatar_url ?? null, role_name: t.role_note, position: null, jersey: null, group: "staff" }));
  const staffAll = [...staff, ...extra];
  const selPlayers = players.filter((p) => selected.has(p.id));
  const selStaff = staffAll.filter((p) => selected.has(p.id));
  const pendingCallups = callupIds.filter((id) => !selected.has(id));

  const pickMatch = (m: OurMatch) => {
    setNoMatch(false);
    setMatchEventId(m.calendar_event_id);
    if (m.tournament_team_id && teams.some((t) => t.id === m.tournament_team_id)) setTeamId(m.tournament_team_id);
    const rival = m.rival?.name ?? "rival";
    const city = m.venue ?? "";
    setTitle(`vs ${rival}${city ? ` · ${city}` : ""}`);
    setDestination(city);
    const day = toDateInput(m.kickoff_at);
    setDep(day);
    if (!ret || ret < day) setRet(day);
  };
  const pickNoMatch = () => { setNoMatch(true); setMatchEventId(null); };

  const validate = (s: number): string | null => {
    if (s === 0) {
      if (!noMatch && !matchEventId) return "Elige un partido o “Viaje sin partido”";
      if (!teamId) return "Elige la categoría";
      if (!title.trim()) return "Escribe el título del viaje";
    }
    if (s === 1) {
      if (!dep) return "Elige la fecha de salida";
      if (ret && ret < dep) return "El regreso no puede ser antes de la salida";
    }
    return null;
  };

  const payload = (): TripInput & { meeting_location_id: string | null } => ({
    title: title.trim(),
    destination: destination.trim() || null,
    match_event_id: noMatch ? null : matchEventId,
    departure_at: fromDateInput(dep),
    return_at: ret ? fromDateInput(ret) : null,
    meeting_point: meetingPoint,
    meeting_location_id: meetingLocationId,
    meeting_at: trip?.meeting_at ?? null,
    status: trip?.status ?? "planeacion",
    notes: trip?.notes ?? null,
  });

  const syncTravelers = async (tripId: string, current: TripRow["travelers"]) => {
    const have = new Map(current.map((t) => [t.user_id, t.id] as const));
    for (const uid of selected) if (!have.has(uid)) await addTraveler(tripId, uid, null);
    for (const [uid, rowId] of have) if (!selected.has(uid)) await removeTraveler(rowId, tripId, uid);
  };

  const create = async () => {
    for (const s of [0, 1]) { const e = validate(s); if (e) { toast.error(e); setStep(s); return; } }
    setSaving(true);
    try {
      const { meeting_location_id, ...input } = payload();
      const created = await createTrip(clubId, teamId!, userId, { ...input, status: "planeacion" });
      if (meeting_location_id) await updateTrip(created.id, { meeting_location_id } as Partial<TripInput>);
      await syncTravelers(created.id, []);
      await qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Borrador creado");
      navigate({ to: "/coordinacion/general/viajes/$tripId", params: { tripId: created.id }, replace: true });
    } catch (e) {
      toast.error((e as Error).message || "No se pudo crear");
      setSaving(false);
    }
  };

  /** Edición: guarda solo la sección abierta. */
  const saveSection = async (s: number) => {
    if (!trip) return;
    const e = validate(s); if (e) { toast.error(e); return; }
    setSaving(true);
    try {
      const p = payload();
      if (s === 0) await updateTrip(trip.id, { title: p.title, destination: p.destination, match_event_id: p.match_event_id });
      if (s === 1) await updateTrip(trip.id, { departure_at: p.departure_at, return_at: p.return_at, meeting_point: p.meeting_point, meeting_location_id: p.meeting_location_id } as Partial<TripInput>);
      if (s === 2) await syncTravelers(trip.id, trip.travelers);
      await qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Guardado");
      setEditing(null);
      setStep(3);
    } catch (err) {
      toast.error((err as Error).message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const next = () => { const e = validate(step); if (e) { toast.error(e); return; } setStep((s) => Math.min(3, s + 1)); };
  const openSection = (s: number) => { if (isEdit) setEditing(s); setStep(s); };
  const current = step;

  const groupRow = (key: "jugadores" | "staff", label: string, list: TripCandidate[]) => (
    <button onClick={() => setPicker(key)} className="coord-press flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label} · {list.length}</span>
        {list.length ? <span className="mt-1 block"><Faces people={list} /></span> : <span className="block text-xs text-muted-foreground">Toca para elegir</span>}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );

  return (
    <div className="coord-enter mx-auto max-w-2xl space-y-4 pb-28">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">{isEdit ? "Editar viaje" : "Nuevo viaje"}</h1>
        {!isEdit ? <StepProgress steps={STEPS} current={current} /> : editing !== null ? <p className="text-[11px] font-medium text-muted-foreground">{STEPS[editing]}</p> : null}
      </div>

      {current === 0 ? (
        <div className="space-y-2">
          {teams.length > 1 ? (
            <div className="space-y-1">
              <Label className="text-xs">Categoría</Label>
              <select value={teamId ?? ""} onChange={(e) => setTeamId(e.target.value || null)} disabled={isEdit} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                {teams.map((t) => <option key={t.id ?? ""} value={t.id ?? ""}>{t.name}</option>)}
              </select>
            </div>
          ) : null}
          {matchesQ.isLoading ? <div className="h-20 animate-pulse rounded-2xl bg-card" /> : null}
          {awayMatches.map((m) => {
            const on = matchEventId === m.calendar_event_id && !noMatch;
            return (
              <button key={m.id} onClick={() => pickMatch(m)} className={cn("coord-press flex w-full items-center gap-3 rounded-2xl border bg-card px-3 py-3 text-left", on ? "border-primary" : "border-transparent")}>
                <MatchCrests m={m} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">vs {m.rival?.name ?? "Por definir"}</span>
                  <span className="block truncate text-xs capitalize text-muted-foreground">{matchDate(m.kickoff_at)}</span>
                  {m.venue ? <span className="block truncate text-xs text-muted-foreground">{m.venue}</span> : null}
                </span>
              </button>
            );
          })}
          <button onClick={pickNoMatch} className={cn("coord-press flex w-full items-center gap-3 rounded-2xl border bg-card px-3 py-3 text-left", noMatch ? "border-primary" : "border-transparent")}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-area-general-soft"><Plane className="h-5 w-5 text-area-general" /></span>
            <span className="text-sm font-semibold">Viaje sin partido</span>
          </button>
          {noMatch || matchEventId ? (
            <div className="grid gap-2 pt-2">
              <div className="space-y-1"><Label className="text-xs">Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="vs Racing · Orizaba" /></div>
              <div className="space-y-1"><Label className="text-xs">Destino</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ciudad" /></div>
            </div>
          ) : null}
        </div>
      ) : null}

      {current === 1 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Salida</Label><Input type="date" value={dep} onChange={(e) => setDep(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Regreso</Label><Input type="date" value={ret} min={dep || undefined} onChange={(e) => setRet(e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Punto de reunión (opcional)</Label>
            <LocationPicker clubId={clubId} userId={userId} value={meetingLocationId} onChange={(id, row) => { setMeetingLocationId(id); setMeetingPoint(row?.name ?? (id ? meetingPoint : null)); }} />
          </div>
        </div>
      ) : null}

      {current === 2 ? (
        <div className="space-y-2">
          {match && pendingCallups.length ? (
            <Button variant="secondary" className="w-full" onClick={() => setSelected((s) => new Set([...s, ...callupIds]))}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Agregar convocados ({pendingCallups.length})
            </Button>
          ) : null}
          {candQ.isLoading ? <div className="h-16 animate-pulse rounded-2xl bg-card" /> : null}
          {groupRow("jugadores", "Jugadores", selPlayers)}
          {groupRow("staff", "Staff y acompañantes", selStaff)}
          <p className="px-1 text-xs text-muted-foreground">La nota de rol (ej. Utilero) se agrega en la ficha del viaje.</p>
        </div>
      ) : null}

      {current === 3 ? (
        <div className="space-y-2">
          <SummaryCard title="Partido" onEdit={() => openSection(0)}>
            <div className="font-semibold">{title || "Sin título"}</div>
            <div className="text-xs text-muted-foreground">{noMatch || !matchEventId ? "Viaje sin partido" : match ? `vs ${match.rival?.name ?? ""} · ${matchDate(match.kickoff_at)}` : "Partido ligado"}{destination ? ` · ${destination}` : ""}</div>
          </SummaryCard>
          <SummaryCard title="Fechas" onEdit={() => openSection(1)}>
            <span className="capitalize">{niceDate(dep)}</span> → <span className="capitalize">{ret ? niceDate(ret) : "—"}</span>
          </SummaryCard>
          <SummaryCard title="Reunión" onEdit={() => openSection(1)}>{meetingPoint || <span className="text-muted-foreground">Sin punto de reunión</span>}</SummaryCard>
          <SummaryCard title="Viajeros" onEdit={() => openSection(2)}>
            <div className="flex items-center justify-between gap-2"><span>Jugadores · {selPlayers.length}</span><Faces people={selPlayers} /></div>
            <div className="mt-1 flex items-center justify-between gap-2"><span>Staff · {selStaff.length}</span><Faces people={selStaff} /></div>
          </SummaryCard>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          {isEdit ? (
            editing !== null ? (
              <>
                <Button variant="ghost" onClick={() => { setEditing(null); setStep(3); }}>Cancelar</Button>
                <Button className="flex-1" disabled={saving} onClick={() => saveSection(editing)}>{saving ? "Guardando…" : "Guardar"}</Button>
              </>
            ) : (
              <Button className="flex-1" variant="secondary" onClick={() => navigate({ to: "/coordinacion/general/viajes/$tripId", params: { tripId: trip!.id } })}>Listo</Button>
            )
          ) : (
            <>
              {current > 0 ? <Button variant="ghost" onClick={() => setStep(current - 1)}>Atrás</Button> : null}
              {current < 3 ? (
                <Button className="flex-1" onClick={next}>Siguiente</Button>
              ) : (
                <Button className="flex-1" disabled={saving} onClick={create}>{saving ? "Creando…" : "Crear borrador"}</Button>
              )}
            </>
          )}
        </div>
      </div>

      <TravelerPickerSheet
        open={picker !== null}
        onOpenChange={(v) => !v && setPicker(null)}
        title={picker === "jugadores" ? "Jugadores" : "Staff y acompañantes"}
        people={picker === "jugadores" ? players : staffAll}
        filterBy={picker === "jugadores" ? "position" : "role"}
        selected={selected}
        onDone={(ids) => {
          const group = picker === "jugadores" ? players : staffAll;
          setSelected((s) => { const n = new Set(s); for (const p of group) n.delete(p.id); for (const id of ids) n.add(id); return n; });
        }}
      />
    </div>
  );
}
