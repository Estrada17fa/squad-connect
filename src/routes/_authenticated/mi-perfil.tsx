import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Save, User } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/components/squad/AppLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/mi-perfil")({
  head: () => ({
    meta: [
      { title: "Squad — Mi Perfil" },
      { name: "description", content: "Tus datos personales, contacto de emergencia y documentos." },
    ],
  }),
  component: MiPerfilPage,
});

interface EditableProfile {
  avatar_url: string | null;
  phone: string | null;
  birthdate: string | null;
  nationality: string | null;
  birthplace: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

function MiPerfilPage() {
  const { user } = useApp();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["mi-perfil", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, first_name, paternal_last_name, maternal_last_name, email, avatar_url, phone, birthdate, nationality, birthplace, emergency_contact_name, emergency_contact_phone",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = React.useState<EditableProfile | null>(null);
  React.useEffect(() => {
    if (data && !form) {
      setForm({
        avatar_url: data.avatar_url,
        phone: data.phone,
        birthdate: data.birthdate,
        nationality: data.nationality,
        birthplace: data.birthplace,
        emergency_contact_name: (data as any).emergency_contact_name ?? null,
        emergency_contact_phone: (data as any).emergency_contact_phone ?? null,
      });
    }
  }, [data, form]);

  const save = useMutation({
    mutationFn: async (payload: EditableProfile) => {
      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado");
      qc.invalidateQueries({ queryKey: ["mi-perfil", user.id] });
      qc.invalidateQueries({ queryKey: ["squad-access", user.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  if (isLoading || !form || !data) return <LoadingState />;

  const displayName = data.full_name ?? data.email ?? "Mi perfil";
  const set = <K extends keyof EditableProfile>(k: K, v: EditableProfile[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Mi Perfil" subtitle={displayName} />

      <StandardCard icon={User} title={displayName} subtitle={data.email ?? undefined}>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={form.avatar_url ?? undefined} />
            <AvatarFallback>{(displayName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Label htmlFor="avatar_url">Foto de perfil (URL)</Label>
            <Input
              id="avatar_url"
              placeholder="https://…"
              value={form.avatar_url ?? ""}
              onChange={(e) => set("avatar_url", e.target.value || null)}
            />
          </div>
        </div>
      </StandardCard>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Teléfono" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+52 …" />
        <Field label="Fecha de nacimiento" type="date" value={form.birthdate} onChange={(v) => set("birthdate", v)} />
        <Field label="Nacionalidad" value={form.nationality} onChange={(v) => set("nationality", v)} />
        <Field label="Lugar de nacimiento" value={form.birthplace} onChange={(v) => set("birthplace", v)} />
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Contacto de emergencia
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Nombre"
            value={form.emergency_contact_name}
            onChange={(v) => set("emergency_contact_name", v)}
          />
          <Field
            label="Teléfono"
            value={form.emergency_contact_phone}
            onChange={(v) => set("emergency_contact_phone", v)}
            placeholder="+52 …"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          onClick={() => save.mutate(form)}
          disabled={save.isPending}
          className="glow-primary"
        >
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Documentos asignados
        </h3>
        <EmptyState
          icon={FileText}
          title="Sin documentos"
          message="Cuando el club te asigne documentos, aparecerán aquí."
        />
      </section>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}
