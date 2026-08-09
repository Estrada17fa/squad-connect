import * as React from "react";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/squad/LoadingState";
import { DetailField, DetailGrid, DetailValue } from "@/components/squad/DetailSheet";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import {
  CURRENCIES,
  DATE_FORMATS,
  DEFAULT_CURRENCY,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIMEZONE,
  DEFAULT_WEEK_START,
  TIMEZONES,
  WEEK_STARTS,
  useClub,
  useUpdateClub,
} from "@/hooks/useClubSettings";

/** Preferencias del club: zona horaria, moneda, formato de fecha y semana. */
export function ClubPreferencesTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const clubQ = useClub(clubId);
  const update = useUpdateClub();
  const [timezone, setTimezone] = React.useState(DEFAULT_TIMEZONE);
  const [currency, setCurrency] = React.useState(DEFAULT_CURRENCY);
  const [dateFormat, setDateFormat] = React.useState(DEFAULT_DATE_FORMAT);
  const [weekStart, setWeekStart] = React.useState(String(DEFAULT_WEEK_START));

  const reset = React.useCallback(() => {
    setTimezone(clubQ.data?.timezone || DEFAULT_TIMEZONE);
    setCurrency(clubQ.data?.currency || DEFAULT_CURRENCY);
    setDateFormat(clubQ.data?.date_format || DEFAULT_DATE_FORMAT);
    setWeekStart(String(clubQ.data?.week_start ?? DEFAULT_WEEK_START));
  }, [clubQ.data]);

  React.useEffect(() => {
    reset();
  }, [reset]);

  async function save() {
    try {
      await update.mutateAsync({
        id: clubId,
        timezone,
        currency,
        date_format: dateFormat,
        week_start: Number(weekStart),
      });
      toast.success("Preferencias actualizadas");
      return true;
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
      return false;
    }
  }

  if (clubQ.isLoading) return <LoadingState />;

  const currentCurrency =
    CURRENCIES.find((c) => c.value === (clubQ.data?.currency || DEFAULT_CURRENCY))?.label ?? "";
  const currentFormat =
    DATE_FORMATS.find((f) => f.value === (clubQ.data?.date_format || DEFAULT_DATE_FORMAT))?.label ?? "";
  const currentWeek =
    WEEK_STARTS.find((w) => w.value === (clubQ.data?.week_start ?? DEFAULT_WEEK_START))?.label ?? "";

  return (
    <SettingsPanel
      title="Preferencias"
      description="Se aplican en toda la app: horarios, montos, fechas y calendario."
      icon={SlidersHorizontal}
      canEdit={canEdit}
      saving={update.isPending}
      onSave={save}
      onCancel={reset}
      read={
        <DetailGrid>
          <DetailField label="Zona horaria">
            <DetailValue value={(clubQ.data?.timezone || DEFAULT_TIMEZONE).replace(/_/g, " ")} />
          </DetailField>
          <DetailField label="Moneda">
            <DetailValue value={currentCurrency} />
          </DetailField>
          <DetailField label="Formato de fecha">
            <DetailValue value={currentFormat} />
          </DetailField>
          <DetailField label="Primer día de la semana">
            <DetailValue value={currentWeek} />
          </DetailField>
        </DetailGrid>
      }
      edit={
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Zona horaria</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Zona horaria" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Horarios de eventos, juntas y viajes.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Compras, solicitudes y reembolsos.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Formato de fecha</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Primer día de la semana</Label>
            <Select value={weekStart} onValueChange={setWeekStart}>
              <SelectTrigger>
                <SelectValue placeholder="Primer día" />
              </SelectTrigger>
              <SelectContent>
                {WEEK_STARTS.map((w) => (
                  <SelectItem key={w.value} value={String(w.value)}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Se aplica a la vista de Mes del calendario.</p>
          </div>
        </div>
      }
    />
  );
}
