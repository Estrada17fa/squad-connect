import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useClubStaff, type MeetingRow } from "@/hooks/useCoordinacion";
import { LocationPicker } from "@/components/location/LocationPicker";
import { StaffPicker, type CategoryOption } from "@/components/coord/tareas/TaskFormSheet";
import { parseAgenda, serializeAgenda, type AgendaItem } from "@/lib/juntas";
import { initialsOf } from "@/lib/coordinacion";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function combine(date: string, time: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi || 0);
}

export function MeetingForm({ clubId, userId, categories, meeting }: { clubId: string; userId: string; categories: CategoryOption[]; meeting?: MeetingRow | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const staff = useClubStaff(clubId);
  const init = meeting ? new Date(meeting.starts_at) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; })();
  const initEnd = meeting?.ends_at ? new Date(meeting.ends_at) : new Date(init.getTime() + 60 * 60 * 1000);
  const [title, setTitle] = React.useState(meeting?.title ?? "");
  const [date, setDate] = React.useState(dateStr(init));
  const [start, setStart] = React.useState(timeStr(init));
  const [end, setEnd] = React.useState(timeStr(initEnd));
  const [locationId, setLocationId] = React.useState<string | null>(meeting?.location_id ?? null);
  const [locationName, setLocationName] = React.useState<string | null>(meeting?.location ?? null);
  const [teamId, setTeamId] = React.useState<string | null>(meeting ? meeting.team_id : (categories.find((c) => c.id === null) ? null : categories[0]?.id ?? null));
  const [people, setPeople] = React.useState<string[]>(meeting ? meeting.attendees.map((a) => a.user_id) : [userId]);
  const [showPeople, setShowPeople] = React.useState(false);
  const [items, setItems] = React.useState<AgendaItem[]>(parseAgenda(meeting?.agenda));
  const [point, setPoint] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const chosen = (staff.data ?? []).filter((p) => people.includes(p.id));

  const addPoint = () => { if (point.trim()) { setItems([...items, { text: point.trim(), done: false }]); setPoint(""); } };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; setItems(next);
  };

  async function save() {
    if (!title.trim()) return toast.error("Escribe un título");
    if (!date || !start) return toast.error("Elige fecha y hora");
    if (!categories.some((c) => c.id === teamId)) return toast.error("Elige una categoría");
    const s = combine(date, start);
    const e = end ? combine(date, end) : null;
    if (e && e <= s) return toast.error("La hora de fin debe ser después del inicio");
    setSaving(true);
    try {
      const payload = {
        club_id: clubId, team_id: teamId, title: title.trim(),
        starts_at: s.toISOString(), ends_at: e ? e.toISOString() : null,
        location_id: locationId, location: locationId ? locationName : null,
        agenda: serializeAgenda([...items, ...(point.trim() ? [{ text: point.trim(), done: false }] : [])]),
      };
      let id = meeting?.id;
      if (meeting) {
        const { error } = await supabase.from("meetings").update(payload).eq("id", meeting.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("meetings").insert({ ...payload, created_by: userId }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const before = new Set(meeting?.attendees.map((a) => a.user_id) ?? []);
      const add = people.filter((p) => !before.has(p));
      const remove = [...before].filter((p) => !people.includes(p));
      if (add.length) {
        const { error } = await supabase.from("meeting_attendees").insert(add.map((user_id) => ({ meeting_id: id!, user_id })));
        if (error) throw error;
      }
      if (remove.length) {
        const { error } = await supabase.from("meeting_attendees").delete().eq("meeting_id", id!).in("user_id", remove);
        if (error) throw error;
      }
      toast.success(meeting ? "Junta actualizada" : "Junta creada");
      qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      navigate({ to: "/coordinacion/general/juntas/$meetingId", params: { meetingId: id! }, replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  const label = "text-xs font-semibold text-muted-foreground";
  const field = "h-11 w-full rounded-xl bg-card px-3 text-sm outline-none";
  return (
    <div className="space-y-4 pb-28">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la junta" aria-label="Título" className="h-12 rounded-xl text-base" />

      <div className="space-y-2">
        <p className={label}>Fecha y horario</p>
        <input type="date" aria-label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1"><span className="text-[11px] text-muted-foreground">Inicio</span>
            <input type="time" aria-label="Hora de inicio" value={start} onChange={(e) => setStart(e.target.value)} className={field} /></label>
          <label className="space-y-1"><span className="text-[11px] text-muted-foreground">Fin</span>
            <input type="time" aria-label="Hora de fin" value={end} onChange={(e) => setEnd(e.target.value)} className={field} /></label>
        </div>
      </div>

      <div className="space-y-2">
        <p className={label}>Lugar</p>
        <LocationPicker clubId={clubId} userId={userId} value={locationId} onChange={(id, row) => { setLocationId(id); setLocationName(row?.name ?? null); }} />
      </div>

      <div className="space-y-2">
        <p className={label}>Categoría</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button key={c.id ?? "club"} type="button" onClick={() => setTeamId(c.id)}
              className={cn("coord-press min-h-9 rounded-full px-3 text-xs font-semibold", teamId === c.id ? "bg-area-general text-background" : "bg-muted")}>{c.name}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={label}>Invitados · {people.length}</p>
        <button type="button" onClick={() => setShowPeople((v) => !v)} className="coord-press flex min-h-11 w-full items-center gap-2 rounded-xl bg-card px-3 py-1.5 text-left text-sm">
          {chosen.length ? (
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
              {chosen.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-0.5 pr-2 text-xs">
                  <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-background text-[9px] font-semibold">
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initialsOf(p.full_name, p.email)}
                  </span>
                  {(p.full_name ?? p.email ?? "").split(" ")[0]}
                </span>
              ))}
            </span>
          ) : <span className="flex-1 text-muted-foreground">Elegir personas</span>}
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", showPeople && "rotate-180")} />
        </button>
        {showPeople ? <StaffPicker clubId={clubId} value={people} onChange={setPeople} /> : null}
      </div>

      <div className="space-y-2">
        <p className={label}>Orden del día</p>
        {items.length ? (
          <ol className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-5 shrink-0 text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                <span className="min-w-0 flex-1">{it.text}</span>
                <button type="button" aria-label="Subir punto" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-muted-foreground disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" aria-label="Bajar punto" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="p-1 text-muted-foreground disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" aria-label="Quitar punto" onClick={() => setItems(items.filter((_, j) => j !== i))} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ol>
        ) : null}
        <div className="flex gap-2">
          <Input value={point} onChange={(e) => setPoint(e.target.value)} placeholder="Agregar punto" aria-label="Agregar punto"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPoint(); } }} className="h-10 rounded-xl" />
          <button type="button" aria-label="Agregar punto al orden del día" onClick={addPoint} className="coord-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border/50 bg-background/95 px-4 py-2 backdrop-blur md:bottom-0">
        <div className="mx-auto max-w-2xl">
          <button type="button" disabled={saving} onClick={save} className="coord-press flex min-h-12 w-full items-center justify-center rounded-xl bg-area-general text-sm font-bold text-background disabled:opacity-60">
            {saving ? "Guardando…" : meeting ? "Guardar cambios" : "Crear junta"}
          </button>
        </div>
      </div>
    </div>
  );
}
