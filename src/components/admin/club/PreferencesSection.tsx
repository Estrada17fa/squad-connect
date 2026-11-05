import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CURRENCIES, DATE_FORMATS, DEFAULT_CURRENCY, DEFAULT_DATE_FORMAT, DEFAULT_TIMEZONE, DEFAULT_WEEK_START,
  TIMEZONES, WEEK_STARTS, useClub, useUpdateClub, type ClubRow,
} from "@/hooks/useClubSettings";
import { SectionLabel, GroupCard } from "@/components/admin/users/ui";
import { ClubSheet, OptionList, ValueRow } from "./parts";

type Key = "season" | "timezone" | "date_format" | "week_start" | "currency";
const tzLabel = (t: string) => t.replace(/_/g, " ").replace(/^.*\//, "");

export function PreferencesSection({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const clubQ = useClub(clubId);
  const update = useUpdateClub();
  const c = clubQ.data;
  const [open, setOpen] = React.useState<Key | null>(null);
  const [season, setSeason] = React.useState("");

  const tz = c?.timezone || DEFAULT_TIMEZONE;
  const df = c?.date_format || DEFAULT_DATE_FORMAT;
  const ws = c?.week_start ?? DEFAULT_WEEK_START;
  const cur = c?.currency || DEFAULT_CURRENCY;

  async function patch(p: Partial<ClubRow>) {
    try {
      await update.mutateAsync({ id: clubId, ...p });
      toast.success("Preferencia guardada");
      setOpen(null);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  const go = (k: Key) => (canEdit ? () => { if (k === "season") setSeason(c?.current_season ?? ""); setOpen(k); } : undefined);
  const titles: Record<Key, string> = {
    season: "Temporada actual", timezone: "Zona horaria", date_format: "Formato de fecha", week_start: "Primer día de la semana", currency: "Moneda",
  };

  return (
    <section>
      <SectionLabel>Preferencias</SectionLabel>
      <GroupCard>
        <ValueRow label="Temporada actual" value={c?.current_season || "Sin definir"} onClick={go("season")} />
        <ValueRow label="Zona horaria" value={tzLabel(tz)} onClick={go("timezone")} />
        <ValueRow label="Formato de fecha" value={df} onClick={go("date_format")} />
        <ValueRow label="Primer día de la semana" value={WEEK_STARTS.find((w) => w.value === ws)?.label} onClick={go("week_start")} />
        <ValueRow label="Moneda" value={cur} onClick={go("currency")} />
      </GroupCard>

      <ClubSheet open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open ? titles[open] : ""}>
        {open === "season" ? (
          <div className="space-y-3">
            <Input aria-label="Temporada actual" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026-2027" className="h-11" enterKeyHint="done" />
            <Button className="h-11 w-full" disabled={update.isPending} onClick={() => patch({ current_season: season.trim() || null })}>Guardar</Button>
          </div>
        ) : open === "timezone" ? (
          <OptionList options={TIMEZONES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))} value={tz} onPick={(v) => patch({ timezone: v })} />
        ) : open === "date_format" ? (
          <OptionList options={DATE_FORMATS} value={df} onPick={(v) => patch({ date_format: v })} />
        ) : open === "week_start" ? (
          <OptionList options={WEEK_STARTS} value={ws} onPick={(v) => patch({ week_start: v })} />
        ) : open === "currency" ? (
          <OptionList options={CURRENCIES} value={cur} onPick={(v) => patch({ currency: v })} />
        ) : null}
      </ClubSheet>
    </section>
  );
}
