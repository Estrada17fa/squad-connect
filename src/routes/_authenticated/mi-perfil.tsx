import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Apple,
  CalendarDays,
  Flag,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  Shield,
  TrendingUp,
  User,
} from "lucide-react";
import { PlayerHealthSheet } from "@/components/salud/PlayerHealthSheet";
import { PlayerDevelopmentSheet } from "@/components/desarrollo/PlayerDevelopmentSheet";
import { PlayerNutritionSheet } from "@/components/nutricion/PlayerNutritionSheet";
import { canRead } from "@/lib/permissions";

import { PageHeader } from "@/components/squad/PageHeader";
import { StandardCard } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { StatusBadge } from "@/components/squad/StatusBadge";
import {
  DetailSection,
  DetailField,
  DetailGrid,
  DetailValue,
  DetailLink,
} from "@/components/squad/DetailSheet";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUploadField } from "@/components/perfil/AvatarUploadField";
import { useApp } from "@/components/squad/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PersonDocumentsSection } from "@/components/documentos/PersonDocumentsSection";
import { formatShortDate } from "@/lib/calendar-utils";
import { PLAYER_STATUS_LABEL, type PlayerStatus } from "@/lib/members.schemas";
import { initials, roleVariant } from "@/components/usuarios/memberUtils";
import { usePlayerLatestAnthro } from "@/hooks/useNutrition";
import { formatShortDay } from "@/lib/nutricion";

export const Route = createFileRoute("/_authenticated/mi-perfil")({
  head: () => ({
    meta: [
      { title: "Squad — Mi Perfil" },
      {
        name: "description",
        content: "Tus datos personales, contacto de emergencia y documentos.",
      },
    ],
  }),
  component: MiPerfilPage,
});

function MiPerfilPage() {
  const { user, profile, getModuleAccess } = useApp();
  const [editOpen, setEditOpen] = React.useState(false);

  const profileQ = useQuery({
    queryKey: ["mi-perfil", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, first_name, paternal_last_name, maternal_last_name, email, avatar_url, phone, birthdate, nationality, birthplace, emergency_contact_name, emergency_contact_phone, status, created_at",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const membershipsQ = useQuery({
    queryKey: ["mi-perfil-memberships", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("id, job_title, team:teams(name), role:roles(name)")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const playerQ = useQuery({
    queryKey: ["mi-perfil-player", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_profiles")
        .select(
          "team_id, availability_status, jersey_number, position, secondary_position, preferred_foot, height_cm, weight_kg, player_status, shirt_size, pants_size, shoe_size, team:teams(club_id, name)",
        )
        .eq("user_id", user.id)
        .is("archived_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
  });

  const data = profileQ.data;
  // Peso y talla: fuente única = último estudio antropométrico (Nutrición).
  const { data: anthro } = usePlayerLatestAnthro(user.id);

  if (profileQ.isLoading || !data) return <LoadingState />;

  const name = data.full_name ?? data.email ?? "Mi perfil";
  const memberships = membershipsQ.data ?? [];
  const player = playerQ.data;
  const isBaja = (data.status ?? "activo") === "baja";

  // Bloques personales: solo aparecen si la persona TIENE ficha de jugador y
  // además su permiso real en ese módulo se lo permite (misma fuente de verdad
  // que usan los módulos: `getModuleAccess`).
  const isPlayer = !!player;
  const playerTeamId: string | null = player?.team_id ?? null;
  const playerClubId: string | null = player?.team?.club_id ?? null;
  const showSalud = isPlayer && !!playerTeamId && !!playerClubId && canRead(getModuleAccess("salud"));
  const showDesarrollo = isPlayer && canRead(getModuleAccess("desarrollo"));
  const showNutricion = isPlayer && !!playerTeamId && canRead(getModuleAccess("nutricion"));



  return (
    <div className="space-y-6">
      <PageHeader hideTitle title="Mi Perfil" subtitle={name} />

      <div className="glass space-y-5 rounded-xl p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            {data.avatar_url ? <AvatarImage src={data.avatar_url} alt={name} /> : null}
            <AvatarFallback className="text-base font-semibold">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="break-words font-display text-lg font-semibold leading-tight [overflow-wrap:anywhere]">
              {name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge variant={isBaja ? "rejected" : "approved"}>
                {isBaja ? "Baja" : "Activo"}
              </StatusBadge>
              {Array.from(
                new Set(memberships.map((m) => m.role?.name).filter(Boolean) as string[]),
              ).map((r) => (
                <StatusBadge key={r} variant={roleVariant(r)}>
                  {r}
                </StatusBadge>
              ))}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
        </div>

        <DetailSection title="Datos personales">
          <DetailGrid>
            <DetailField label="Correo" icon={Mail} full>
              <DetailLink value={data.email} type="email" />
            </DetailField>
            <DetailField label="Teléfono" icon={Phone}>
              <DetailLink value={data.phone} type="tel" />
            </DetailField>
            <DetailField label="Fecha de nacimiento" icon={CalendarDays}>
              <DetailValue value={data.birthdate ? formatShortDate(data.birthdate) : null} />
            </DetailField>
            <DetailField label="Nacionalidad" icon={Flag}>
              <DetailValue value={data.nationality} />
            </DetailField>
            <DetailField label="Lugar de nacimiento" icon={MapPin}>
              <DetailValue value={data.birthplace} />
            </DetailField>
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Contacto de emergencia">
          <DetailGrid>
            <DetailField label="Nombre" icon={User}>
              <DetailValue value={data.emergency_contact_name} />
            </DetailField>
            <DetailField label="Teléfono" icon={Phone}>
              <DetailLink value={data.emergency_contact_phone} type="tel" />
            </DetailField>
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Rol y categorías">
          {memberships.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="Sin membresías"
              message="Aún no perteneces a ninguna categoría."
            />
          ) : (
            <div className="grid gap-2">
              {memberships.map((m) => (
                <div key={m.id} className="glass flex items-start gap-3 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">
                      {m.team?.name ?? "Todo el club"}
                    </p>
                    {m.job_title ? (
                      <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        {m.job_title}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <StatusBadge variant={roleVariant(m.role?.name ?? null)}>
                      {m.role?.name ?? "—"}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        {player ? (
          <DetailSection title="Datos deportivos">
            <DetailGrid>
              <DetailField label="Dorsal">
                <DetailValue value={player.jersey_number} />
              </DetailField>
              <DetailField label="Posición">
                <DetailValue value={player.position} />
              </DetailField>
              <DetailField label="Posición secundaria">
                <DetailValue value={player.secondary_position} />
              </DetailField>
              <DetailField label="Pie hábil">
                <DetailValue value={player.preferred_foot} />
              </DetailField>
              <DetailField label="Estatura">
                <DetailValue value={anthro?.heightCm ? `${anthro.heightCm} cm` : null} />
              </DetailField>
              <DetailField label="Peso">
                <DetailValue value={anthro?.weightKg ? `${anthro.weightKg} kg` : null} />
                {anthro ? (
                  <p className="text-xs text-muted-foreground">
                    Medido el {formatShortDay(anthro.assessedAt)}
                  </p>
                ) : null}
              </DetailField>
              <DetailField label="Estatus">
                {player.player_status ? (
                  <StatusBadge variant={player.player_status === "activo" ? "approved" : "pending"}>
                    {PLAYER_STATUS_LABEL[player.player_status as PlayerStatus] ??
                      player.player_status}
                  </StatusBadge>
                ) : (
                  <DetailValue value={null} />
                )}
              </DetailField>
              <DetailField label="Tallas">
                <DetailValue
                  value={
                    [player.shirt_size, player.pants_size, player.shoe_size]
                      .filter(Boolean)
                      .join(" · ") || null
                  }
                />
              </DetailField>
            </DetailGrid>
          </DetailSection>
        ) : null}

        <p className="text-[11px] text-muted-foreground">
          Tu rol, categorías, puesto y datos deportivos solo los puede cambiar quien administra
          usuarios en el club.
        </p>
      </div>

      {showSalud ? (
        <MiSaludSection
          userId={user.id}
          fullName={data.full_name}
          avatarUrl={data.avatar_url}
          clubId={playerClubId!}
          teamId={playerTeamId!}
          teamName={player?.team?.name ?? null}
          availability={player?.availability_status ?? "apto"}
        />
      ) : null}

      {showDesarrollo ? (
        <MiDesarrolloSection userId={user.id} fullName={data.full_name} avatarUrl={data.avatar_url} />
      ) : null}

      {showNutricion ? (
        <MiNutricionSection
          userId={user.id}
          fullName={data.full_name}
          avatarUrl={data.avatar_url}
          clubId={profile?.club_id ?? null}
          teamId={playerTeamId!}
          teamName={player?.team?.name ?? null}
          position={player?.position ?? null}
        />
      ) : null}


      <PersonDocumentsSection clubId={profile?.club_id ?? null} userId={user.id} />

      <EditMyProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        userId={user.id}
        name={name}
        initial={{
          avatar_url: data.avatar_url,
          email: data.email,
          phone: data.phone,
          nationality: data.nationality,
          birthplace: data.birthplace,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
        }}
      />
    </div>
  );
}

interface EditableProfile {
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  birthplace: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

/** Solo lo que cada quien puede cambiar de sí mismo. */
function EditMyProfileSheet({
  open,
  onOpenChange,
  userId,
  name,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  name: string;
  initial: EditableProfile;
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState<EditableProfile>(initial);
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setForm(initial);
      setPassword("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof EditableProfile>(k: K, v: EditableProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const emailChanged = (form.email ?? "").trim().toLowerCase() !== (initial.email ?? "").toLowerCase();
  const emailOk = !emailChanged || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((form.email ?? "").trim());
  const passOk = password === "" || password.length >= 8;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: form.avatar_url,
          phone: form.phone,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
        })
        .eq("id", userId);
      if (error) throw error;

      if (emailChanged) {
        const { error: e } = await supabase.auth.updateUser({
          email: (form.email ?? "").trim().toLowerCase(),
        });
        if (e) throw e;
      }
      if (password) {
        const { error: e } = await supabase.auth.updateUser({ password });
        if (e) throw e;
        await (supabase as any)
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", userId);
      }
    },
    onSuccess: () => {
      toast.success(
        emailChanged
          ? "Perfil actualizado. Confirma el cambio de correo desde tu bandeja."
          : "Perfil actualizado",
      );
      qc.invalidateQueries({ queryKey: ["mi-perfil", userId] });
      qc.invalidateQueries({ queryKey: ["squad-access", userId] });
      qc.invalidateQueries({ queryKey: ["club-members"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>Editar mi perfil</EntitySheetTitle>
        <EntitySheetDescription>
          Puedes cambiar tu foto, correo, teléfono, contacto de emergencia y contraseña.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-4">
          <AvatarUploadField
            value={form.avatar_url}
            onChange={(url) => set("avatar_url", url)}
            userId={userId}
            name={name}
          />

          <div className="space-y-1.5">
            <Label htmlFor="mp-email">Correo</Label>
            <Input
              id="mp-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value || null)}
            />
            {emailChanged ? (
              <p className="text-[11px] text-muted-foreground">
                Recibirás un correo para confirmar el cambio.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mp-phone">Teléfono</Label>
            <Input
              id="mp-phone"
              value={form.phone ?? ""}
              placeholder="+52 …"
              onChange={(e) => set("phone", e.target.value || null)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mp-emg">Contacto de emergencia</Label>
              <Input
                id="mp-emg"
                value={form.emergency_contact_name ?? ""}
                onChange={(e) => set("emergency_contact_name", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mp-emgp">Teléfono de emergencia</Label>
              <Input
                id="mp-emgp"
                value={form.emergency_contact_phone ?? ""}
                placeholder="+52 …"
                onChange={(e) => set("emergency_contact_phone", e.target.value || null)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mp-pass">Nueva contraseña (opcional)</Label>
            <Input
              id="mp-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          className="glow-primary"
          disabled={!emailOk || !passOk || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

/**
 * El jugador ve SU información médica en modo consulta.
 * La página decide si esta sección se muestra (permiso de Salud + ficha propia).
 */
function MiSaludSection({
  userId,
  fullName,
  avatarUrl,
  clubId,
  teamId,
  teamName,
  availability,
}: {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  clubId: string;
  teamId: string;
  teamName: string | null;
  availability: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Mi salud
      </h3>
      <StandardCard
        icon={HeartPulse}
        title="Mi expediente médico"
        subtitle="Estado, lesiones, tratamiento y citas"
        interactive
        onClick={() => setOpen(true)}
      >
        Solo tú y el cuerpo médico de tu equipo pueden ver esta información.
      </StandardCard>
      <PlayerHealthSheet
        open={open}
        onOpenChange={setOpen}
        clubId={clubId}
        player={{
          userId,
          teamId,
          fullName,
          avatarUrl,
          teamName,
          availability: (availability ?? "apto") as any,
        }}
        canEdit={false}
      />
    </section>
  );
}


/** El jugador ve SU desarrollo (retro, objetivos, evaluaciones y rutinas). */
function MiDesarrolloSection({
  userId,
  fullName,
  avatarUrl,
}: {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
}) {
  const { profile } = useApp();
  const [open, setOpen] = React.useState(false);

  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Mi desarrollo
      </h3>
      <StandardCard
        icon={TrendingUp}
        title="Mi progreso"
        subtitle="Retroalimentación, objetivos, evaluaciones y rutinas"
        interactive
        onClick={() => setOpen(true)}
      >
        Puedes marcar tus rutinas asignadas como en progreso o completadas.
      </StandardCard>
      <PlayerDevelopmentSheet
        open={open}
        onOpenChange={setOpen}
        clubId={profile?.club_id ?? null}
        player={{ userId, fullName, avatarUrl, teamName: null }}
        isSelf
      />
    </section>
  );
}

/**
 * El jugador ve SU plan alimenticio y su antropometría en modo consulta.
 * Solo se muestra con permiso real en Nutrición (lo decide la página).
 */
function MiNutricionSection({
  userId,
  fullName,
  avatarUrl,
  clubId,
  teamId,
  teamName,
  position,
}: {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  clubId: string | null;
  teamId: string;
  teamName: string | null;
  position: string | null;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Mi nutrición
      </h3>
      <StandardCard
        icon={Apple}
        title="Mi plan alimenticio"
        subtitle="Plan de la semana, equivalencias y antropometría"
        interactive
        onClick={() => setOpen(true)}
      >
        Lo define el área de nutrición del club; aquí solo lo consultas.
      </StandardCard>
      <PlayerNutritionSheet
        open={open}
        onOpenChange={setOpen}
        clubId={clubId}
        player={{ userId, teamId, fullName, avatarUrl, teamName, position }}
        canEdit={false}
        self
      />
    </section>
  );
}

