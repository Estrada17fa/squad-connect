import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { SupplierRow } from "@/hooks/useExpenses";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  supplier?: SupplierRow | null;
}

export function SupplierFormDialog({ open, onOpenChange, clubId, userId, supplier }: Props) {
  const isEdit = !!supplier;
  const qc = useQueryClient();

  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setContact(supplier?.contact ?? "");
    setPhone(supplier?.phone ?? "");
    setEmail(supplier?.email ?? "");
    setNotes(supplier?.notes ?? "");
  }, [open, supplier]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("El nombre es obligatorio");
      const payload = {
        club_id: clubId,
        name: name.trim(),
        contact: contact.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
      };
      if (isEdit && supplier) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", supplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Proveedor actualizado" : "Proveedor creado");
      qc.invalidateQueries({ queryKey: ["suppliers", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast.error(
        e?.code === "23505" ? "Ya existe un proveedor con ese nombre" : e.message ?? "No se pudo guardar",
      ),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!supplier) return;
      const { error } = await supabase.from("suppliers").delete().eq("id", supplier.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proveedor eliminado");
      qc.invalidateQueries({ queryKey: ["suppliers", clubId] });
      qc.invalidateQueries({ queryKey: ["expenses", clubId] });
      onOpenChange(false);
    },
    onError: () => toast.error("No se pudo eliminar el proveedor"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar proveedor" : "Nuevo proveedor"}</EntitySheetTitle>
        <EntitySheetDescription>
          Catálogo ligero para reutilizar proveedores recurrentes.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="sup-name">Nombre</Label>
          <Input
            id="sup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p.ej. Deportes del Pacífico"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sup-contact">Contacto (opcional)</Label>
          <Input id="sup-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sup-phone">Teléfono (opcional)</Label>
            <Input id="sup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-email">Correo (opcional)</Label>
            <Input id="sup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sup-notes">Notas (opcional)</Label>
          <Textarea id="sup-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar proveedor
          </Button>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="glow-primary"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear proveedor"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
