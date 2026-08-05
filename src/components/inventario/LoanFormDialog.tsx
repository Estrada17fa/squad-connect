import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { fromLocalInputValue } from "@/lib/calendar-utils";
import { InventoryItemPicker } from "@/components/solicitudes/InventoryItemPicker";
import { useClubTeams, type InventoryCatalogItem } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Artículo preseleccionado (desde el catálogo). */
  presetItem?: InventoryCatalogItem | null;
}

/** Miembros del club (cualquier perfil, incluidos jugadores). */
function useClubMembers(clubId: string) {
  return useQuery({
    queryKey: ["club-members-basic", clubId] as const,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("club_id", clubId)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function LoanFormDialog({ open, onOpenChange, clubId, userId, presetItem }: Props) {
  const qc = useQueryClient();
  const membersQ = useClubMembers(clubId);
  const teamsQ = useClubTeams(clubId);

  const [item, setItem] = React.useState<InventoryCatalogItem | null>(null);
  const [quantity, setQuantity] = React.useState("1");
  const [borrower, setBorrower] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [teamId, setTeamId] = React.useState<string>("");
  const [expected, setExpected] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setItem(presetItem ?? null);
    setQuantity("1");
    setBorrower(null);
    setSearch("");
    setNotes("");
    setTeamId("");
    setExpected("");
  }, [open, presetItem]);

  const available = item?.available_quantity ?? 0;
  const qtyN = Number(quantity);
  const qtyInvalid = !Number.isFinite(qtyN) || qtyN < 1 || (item ? qtyN > available : false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("Elige un artículo");
      if (!borrower) throw new Error("Elige a quién se presta");
      if (qtyInvalid) throw new Error(`La cantidad debe estar entre 1 y ${available}`);
      const { error } = await supabase.from("inventory_loans").insert({
        club_id: clubId,
        item_id: item.id,
        borrower_user_id: borrower,
        team_id: teamId || null,
        quantity: Math.round(qtyN),
        returned_quantity: 0,
        notes: notes.trim() || null,
        expected_return_at: expected ? fromLocalInputValue(expected) : null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Préstamo registrado");
      qc.invalidateQueries({ queryKey: ["inventory-loans", clubId] });
      qc.invalidateQueries({ queryKey: ["inventory-catalog", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo registrar el préstamo"),
  });

  const members = (membersQ.data ?? []).filter((m) =>
    (m.full_name ?? m.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>Registrar préstamo</EntitySheetTitle>
        <EntitySheetDescription>
          La disponibilidad del artículo baja automáticamente al guardar.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label>Artículo</Label>
          <InventoryItemPicker
            clubId={clubId}
            itemId={item?.id ?? null}
            itemName={item?.name ?? ""}
            onChange={(i) => {
              if (i && i.available_quantity <= 0) {
                toast.error("Ese artículo no tiene disponibilidad");
                return;
              }
              setItem(i);
              setQuantity("1");
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loan-qty">Cantidad</Label>
          <Input
            id="loan-qty"
            type="number"
            min={1}
            max={available || undefined}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <p className={cn("text-xs", qtyInvalid && item ? "text-destructive" : "text-muted-foreground")}>
            {item ? `Disponibles: ${available}` : "Elige primero un artículo"}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>¿A quién se presta?</Label>
          <Input placeholder="Buscar miembro…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60">
            {members.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Sin miembros</div>
            ) : (
              members.map((m) => {
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
                    <span
                      className={cn(
                        "h-4 w-4 shrink-0 rounded-full border",
                        selected ? "border-primary bg-primary" : "border-border",
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loan-notes">Motivo del préstamo (opcional)</Label>
          <Textarea
            id="loan-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="p.ej. Gira a Hermosillo"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Equipo (opcional)</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTeamId("")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                teamId === ""
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
              )}
            >
              Sin equipo
            </button>
            {(teamsQ.data ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTeamId(t.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  teamId === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loan-expected">Fecha esperada de devolución (opcional)</Label>
          <Input
            id="loan-expected"
            type="datetime-local"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !item || !borrower || qtyInvalid}
        >
          Registrar préstamo
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
