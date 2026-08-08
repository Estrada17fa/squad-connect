import * as React from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/squad/LoadingState";
import {
  CURRENCIES,
  DATE_FORMATS,
  DEFAULT_CURRENCY,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIMEZONE,
  TIMEZONES,
  useClub,
  useUpdateClub,
} from "@/hooks/useClubSettings";

/** Preferencias del club: zona horaria, moneda y formato de fecha. */
export function ClubPreferencesTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const clubQ = useClub(clubId);
  const update = useUpdateClub();
  const [timezone, setTimezone] = React.useState(DEFAULT_TIMEZONE);
  const [currency, setCurrency] = React.useState(DEFAULT_CURRENCY);
  const [dateFormat, setDateFormat] = React.useState(DEFAULT_DATE_FORMAT);

  React.useEffect(() => {
    if (!clubQ.data) return;
    setTimezone(clubQ.data.timezone || DEFAULT_TIMEZONE);
    setCurrency(clubQ.data.currency || DEFAULT_CURRENCY);
    setDateFormat(clubQ.data.date_format || DEFAULT_DATE_FORMAT);
  }, [clubQ.data]);

  async function save() {
    try {
      await update.mutateAsync({ id: clubId, timezone, currency, date_format: dateFormat });
      toast.success("Preferencias actualizadas");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  if (clubQ.isLoading) return <LoadingState />;

  return (
    <div className="glass space-y-4 p-4">
      <div className="space-y-1.5">
        <Label>Zona horaria</Label>
        <Select value={timezone} onValueChange={setTimezone} disabled={!canEdit}>
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
        <p className="text-xs text-muted-foreground">Se usa para mostrar horarios de eventos, juntas y viajes.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Moneda</Label>
        <Select value={currency} onValueChange={setCurrency} disabled={!canEdit}>
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
        <p className="text-xs text-muted-foreground">Se usa en compras, solicitudes y reembolsos.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Formato de fecha</Label>
        <Select value={dateFormat} onValueChange={setDateFormat} disabled={!canEdit}>
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

      {canEdit ? (
        <Button onClick={save} disabled={update.isPending} className="w-full glow-primary">
          Guardar preferencias
        </Button>
      ) : null}
    </div>
  );
}
