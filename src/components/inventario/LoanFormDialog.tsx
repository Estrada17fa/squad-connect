import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import type { InventoryItem, InventoryLoan } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  loan?: InventoryLoan | null;
  items: InventoryItem[];
  outstanding: Record<string, number>;
  initialItemId?: string | null;
  initialExpectedReturn?: string | null;
  initialQuantity?: number | null;
}

interface RosterMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface TeamRow {
  id: string;
  name: string;
  category: string | null;
}

interface CalEvt {
  id: string;
  title: string;
  starts_at: string;
}

function useClubMembers(clubId: string) {
  return useQuery({
    queryKey: ["club-members-basic", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<RosterMember[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("club_id", clubId)
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as RosterMember[];
    },
  });
}

function useClubTeams(clubId: string) {
  return useQuery({
    queryKey: ["club-teams-basic", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<TeamRow[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category")
        .eq("club_id", clubId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
  });
}

function useUpcomingEvents(clubId: string) {
  return useQuery({
    queryKey: ["club-events-upcoming", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<CalEvt[]> => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, starts_at")
        .eq("club_id", clubId)
        .gte("starts_at", since)
        .order("starts_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CalEvt[];
    },
  });
}

export function LoanFormDialog({
  open, onOpenChange, clubId, userId, loan, items, outstanding, initialItemId,
}: Props) {
  const isEdit = !!loan;
  const qc = useQueryClient();
  const membersQ = useClubMembers(clubId);
  const teamsQ = useClubTeams(clubId);
  const eventsQ = useUpcomingEvents(clubId);

  const [itemId, setItemId] = React.useState<string>("");
  const [borrower, setBorrower] = React.useState<string>("");
  const [borrowerSearch, setBorrowerSearch] = React.useState("");
  const [quantity, setQuantity] = React.useState<string>("1");
  const [teamId, setTeamId] = React.useState<string>("");
  const [eventId, setEventId] = React.useState<string>("");
  const [expectedReturn, setExpectedReturn] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setItemId(loan?.item_id ?? initialItemId ?? items[0]?.id ?? "");
    setBorrower(loan?.borrower_user_id ?? userId);
    setBorrowerSearch("");
    setQuantity(String(loan?.quantity ?? 1));
    setTeamId(loan?.team_id ?? "");
    setEventId(loan?.event_id ?? "");
    setExpectedReturn(loan?.expected_return_at ? toLocalInputValue(loan.expected_return_at) : "");
    setNotes(loan?.notes ?? "");
  }, [open, loan, initialItemId, userId, items]);

  const selectedItem = items.find((i) => i.id === itemId) ?? null;
  const availableForItem = selectedItem
    ? selectedItem.total_quantity - (outstanding[selectedItem.id] ?? 0)
      + (isEdit && loan && loan.item_id === selectedItem.id ? (loan.quantity - loan.returned_quantity) : 0)
    : 0;

  const filteredMembers = (membersQ.data ?? []).filter((m) =>
    (m.full_name ?? m.email ?? "").toLowerCase().includes(borrowerSearch.toLowerCase()),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const q = Number(quantity);
      if (!itemId) throw new Error("Selecciona un artículo");
      if (!borrower) throw new Error("Selecciona a quién se presta");
      if (!Number.isFinite(q) || q <= 0) throw new Error("Cantidad inválida");
      if (q > availableForItem) throw new Error(`Solo hay ${availableForItem} disponibles`);

      const payload: any = {
        club_id: clubId,
        item_id: itemId,
        borrower_user_id: borrower,
        team_id: teamId || null,
        event_id: eventId || null,
        quantity: q,
        expected_return_at: expectedReturn ? fromLocalInputValue(expectedReturn) : null,
        notes: notes.trim() || null,
      };
      if (isEdit && loan) {
        const { error } = await supabase.from("inventory_loans").update(payload).eq("id", loan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_loans")
          .insert({ ...payload, created_by: userId, returned_quantity: 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Préstamo actualizado" : "Préstamo registrado");
      qc.invalidateQueries({ queryKey: ["inv-loans", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!loan) return;
      const { error } = await supabase.from("inventory_loans").delete().eq("id", loan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Préstamo eliminado");
      qc.invalidateQueries({ queryKey: ["inv-loans", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar préstamo" : "Nuevo préstamo"}</EntitySheetTitle>
        <EntitySheetDescription>
          La disponibilidad del artículo baja automáticamente al guardar.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="l-item">Artículo</Label>
          <select
            id="l-item"
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">Selecciona…</option>
            {items.map((it) => {
              const avail = it.total_quantity - (outstanding[it.id] ?? 0);
              return (
                <option key={it.id} value={it.id}>
                  {it.name} ({avail}/{it.total_quantity} disp.)
                </option>
              );
            })}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="l-qty">Cantidad {selectedItem?.unit ? `(${selectedItem.unit})` : ""}</Label>
          <Input
            id="l-qty"
            type="number"
            inputMode="numeric"
            min={1}
            max={availableForItem || undefined}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {selectedItem ? (
            <p className="text-xs text-muted-foreground">
              Disponible: <span className="text-foreground">{availableForItem}</span> de {selectedItem.total_quantity}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>Prestado a</Label>
          <Input placeholder="Buscar miembro…" value={borrowerSearch} onChange={(e) => setBorrowerSearch(e.target.value)} />
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60">
            {membersQ.isLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Cargando…</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Sin miembros</div>
            ) : (
              filteredMembers.map((m) => {
                const selected = borrower === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setBorrower(m.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.04]",
                      selected && "bg-white/[0.06]",
                    )}
                  >
                    <span className="truncate text-foreground">{m.full_name ?? m.email ?? "—"}</span>
                    <span className={cn("h-4 w-4 shrink-0 rounded-full border", selected ? "border-primary bg-primary" : "border-border")} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="l-team">Categoría (opcional)</Label>
            <select
              id="l-team"
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {(teamsQ.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-event">Evento (opcional)</Label>
            <select
              id="l-event"
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Sin evento</option>
              {(eventsQ.data ?? []).map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="l-return">Devolución esperada (opcional)</Label>
          <Input id="l-return" type="datetime-local" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="l-notes">Notas</Label>
          <Textarea id="l-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles del préstamo…" />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Registrar préstamo"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
