import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createClubMember, updateClubMember } from "@/lib/members.functions";
import {
  PLAYER_POSITIONS,
  PLAYER_STATUSES,
  PLAYER_STATUS_LABEL,
  PREFERRED_FEET,
  type PlayerStatus,
  type PreferredFoot,
} from "@/lib/members.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface RoleOpt {
  id: string;
  name: string;
  base_role?: string | null;
  allows_club_wide?: boolean;
}
export interface TeamOpt {
  id: string;
  name: string;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-xl p-4 space-y-3">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</h4>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

interface PlayerState {
  jersey_number: string;
  position: string;
  secondary_position: string;
  preferred_foot: string;
  height_cm: string;
  weight_kg: string;
  nationality: string;
  birthplace: string;
  affiliation_number: string;
  id_document: string;
  joined_at: string;
  previous_club: string;
  player_status: PlayerStatus;
  shirt_size: string;
  pants_size: string;
  shoe_size: string;
}

const emptyPlayer: PlayerState = {
  jersey_number: "",
  position: "",
  secondary_position: "",
  preferred_foot: "",
  height_cm: "",
  weight_kg: "",
  nationality: "",
  birthplace: "",
  affiliation_number: "",
  id_document: "",
  joined_at: "",
  previous_club: "",
  player_status: "activo",
  shirt_size: "",
  pants_size: "",
  shoe_size: "",
};

export function MemberForm({
  open,
  onOpenChange,
  clubId,
  roles,
  teams,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubId: string;
  roles: RoleOpt[];
  teams: TeamOpt[];
  /** Si viene, es edición. */
  userId?: string | null;
  onSaved?: (userId: string, roleName: string | null) => void;
}) {
  const isEdit = !!userId;
  const qc = useQueryClient();
  const createFn = useServerFn(createClubMember);
  const updateFn = useServerFn(updateClubMember);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [paternal, setPaternal] = React.useState("");
  const [maternal, setMaternal] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [birthdate, setBirthdate] = React.useState("");
  const [emgName, setEmgName] = React.useState("");
  const [emgPhone, setEmgPhone] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [assignments, setAssignments] = React.useState<Record<string, string>>({});
  const [clubJobTitle, setClubJobTitle] = React.useState("");
  const [player, setPlayer] = React.useState<PlayerState>(emptyPlayer);
  const [saving, setSaving] = React.useState(false);

  const role = roles.find((r) => r.id === roleId) ?? null;
  const roleKey = (role?.base_role ?? role?.name ?? "").toLowerCase();
  const isPlayer = roleKey === "jugador";
  const isAdmin = roleKey === "admin";

  // Carga de datos en edición
  const memberQ = useQuery({
    queryKey: ["member-form", userId ?? "new"],
    enabled: open && isEdit,
    queryFn: async () => {
      const [profileRes, memRes, playerRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("team_memberships").select("team_id, role_id, job_title").eq("user_id", userId!),
        supabase
          .from("player_profiles")
          .select("*")
          .eq("user_id", userId!)
          .is("archived_at", null)
          .order("created_at"),
      ]);
      return {
        profile: profileRes.data as any,
        memberships: (memRes.data ?? []) as any[],
        players: (playerRes.data ?? []) as any[],
      };
    },
  });

  const reset = React.useCallback(() => {
    setEmail("");
    setPassword("");
    setShowPass(false);
    setFirstName("");
    setPaternal("");
    setMaternal("");
    setPhone("");
    setAvatarUrl("");
    setBirthdate("");
    setEmgName("");
    setEmgPhone("");
    setRoleId("");
    setAssignments({});
    setClubJobTitle("");
    setPlayer(emptyPlayer);
    setSaving(false);
  }, []);

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  React.useEffect(() => {
    if (!open || !isEdit || !memberQ.data) return;
    const { profile, memberships, players } = memberQ.data;
    if (profile) {
      setEmail(profile.email ?? "");
      setFirstName(profile.first_name ?? "");
      setPaternal(profile.paternal_last_name ?? "");
      setMaternal(profile.maternal_last_name ?? "");
      setPhone(profile.phone ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setBirthdate(profile.birthdate ?? "");
      setEmgName(profile.emergency_contact_name ?? "");
      setEmgPhone(profile.emergency_contact_phone ?? "");
    }
    if (memberships.length) setRoleId(memberships[0].role_id);
    const map: Record<string, string> = {};
    for (const m of memberships) if (m.team_id) map[m.team_id] = m.job_title ?? "";
    setAssignments(map);
    setClubJobTitle(memberships.find((m: any) => !m.team_id)?.job_title ?? "");
    const p = players[0];
    if (p) {
      setPlayer({
        jersey_number: p.jersey_number != null ? String(p.jersey_number) : "",
        position: p.position ?? "",
        secondary_position: p.secondary_position ?? "",
        preferred_foot: p.preferred_foot ?? "",
        height_cm: p.height_cm != null ? String(p.height_cm) : "",
        weight_kg: p.weight_kg != null ? String(p.weight_kg) : "",
        nationality: p.nationality ?? "",
        birthplace: p.birthplace ?? "",
        affiliation_number: p.affiliation_number ?? "",
        id_document: p.id_document ?? "",
        joined_at: p.joined_at ?? "",
        previous_club: p.previous_club ?? "",
        player_status: (p.player_status as PlayerStatus) ?? "activo",
        shirt_size: p.shirt_size ?? "",
        pants_size: p.pants_size ?? "",
        shoe_size: p.shoe_size ?? "",
      });
    }
  }, [open, isEdit, memberQ.data]);

  const selectedTeams = Object.keys(assignments);
  const emailOk = isEdit || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passOk = isEdit ? password === "" || password.length >= 8 : password.length >= 8;
  const namesOk = !!firstName.trim() && !!paternal.trim();
  const teamsOk = isAdmin || !isPlayer || selectedTeams.length > 0;
  const canSubmit = emailOk && passOk && namesOk && !!roleId && teamsOk && !saving;

  function toggleTeam(id: string, on: boolean) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (on) next[id] = next[id] ?? "";
      else delete next[id];
      return next;
    });
  }

  const num = (v: string) => (v.trim() ? Number(v) : null);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const playerPayload = isPlayer
        ? {
            jersey_number: num(player.jersey_number),
            position: player.position || null,
            secondary_position: player.secondary_position.trim() || null,
            preferred_foot: (player.preferred_foot || null) as PreferredFoot | null,
            height_cm: num(player.height_cm),
            weight_kg: num(player.weight_kg),
            nationality: player.nationality.trim() || null,
            birthplace: player.birthplace.trim() || null,
            affiliation_number: player.affiliation_number.trim() || null,
            id_document: player.id_document.trim() || null,
            joined_at: player.joined_at || null,
            previous_club: player.previous_club.trim() || null,
            player_status: player.player_status,
            shirt_size: player.shirt_size.trim() || null,
            pants_size: player.pants_size.trim() || null,
            shoe_size: player.shoe_size.trim() || null,
          }
        : null;

      const common = {
        first_name: firstName.trim(),
        paternal_last_name: paternal.trim(),
        maternal_last_name: maternal.trim() || null,
        phone: phone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        birthdate: birthdate || null,
        emergency_contact_name: emgName.trim() || null,
        emergency_contact_phone: emgPhone.trim() || null,
        role_id: roleId,
        assignments: isAdmin
          ? []
          : selectedTeams.map((tid) => ({ team_id: tid, job_title: assignments[tid]?.trim() || null })),
        club_job_title: clubJobTitle.trim() || null,
        player: playerPayload,
      };

      const res = isEdit
        ? await updateFn({ data: { ...common, user_id: userId!, password: password || null } })
        : await createFn({ data: { ...common, email: email.trim().toLowerCase(), password } });

      toast.success(isEdit ? "Miembro actualizado" : "Miembro creado");
      qc.invalidateQueries({ queryKey: ["club-members", clubId] });
      qc.invalidateQueries({ queryKey: ["user-memberships"] });
      qc.invalidateQueries({ queryKey: ["roster"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      onSaved?.(res.userId, res.roleName ?? null);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el miembro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar miembro" : "Crear miembro"}</EntitySheetTitle>
        <EntitySheetDescription>
          El formulario se adapta al rol: solo los jugadores capturan datos deportivos.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-4">
          <Section title="Datos básicos">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nombre" htmlFor="mf-first">
                <Input id="mf-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </Field>
              <Field label="Apellido paterno" htmlFor="mf-pat">
                <Input id="mf-pat" value={paternal} onChange={(e) => setPaternal(e.target.value)} />
              </Field>
              <Field label="Apellido materno" htmlFor="mf-mat">
                <Input id="mf-mat" value={maternal} onChange={(e) => setMaternal(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Correo" htmlFor="mf-email">
                <Input
                  id="mf-email"
                  type="email"
                  value={email}
                  disabled={isEdit}
                  autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="miembro@club.com"
                />
              </Field>
              <Field label="Teléfono" htmlFor="mf-phone">
                <Input id="mf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={isEdit ? "Nueva contraseña (opcional)" : "Contraseña (mín. 8)"} htmlFor="mf-pass">
                <div className="relative">
                  <Input
                    id="mf-pass"
                    type={showPass ? "text" : "password"}
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPass((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Fecha de nacimiento" htmlFor="mf-birth">
                <Input id="mf-birth" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
              </Field>
            </div>
            <AvatarUploadField
              label="Foto de perfil"
              value={avatarUrl || null}
              onChange={(url) => setAvatarUrl(url ?? "")}
              userId={userId ?? "nuevos"}
              name={`${firstName} ${paternal}`.trim() || null}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contacto de emergencia" htmlFor="mf-emg">
                <Input id="mf-emg" value={emgName} onChange={(e) => setEmgName(e.target.value)} />
              </Field>
              <Field label="Teléfono de emergencia" htmlFor="mf-emgp">
                <Input id="mf-emgp" value={emgPhone} onChange={(e) => setEmgPhone(e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Rol" hint="Una sola función por persona dentro del club.">
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>

          {!isAdmin ? (
            <Section
              title="Categorías y puesto"
              hint="Marca las categorías donde participa y escribe su puesto (etiqueta libre)."
            >
              <div className="grid gap-2">
                {teams.length === 0 ? (
                  <p className="text-xs text-muted-foreground">El club aún no tiene categorías.</p>
                ) : null}
                {teams.map((t) => {
                  const on = t.id in assignments;
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "rounded-lg border border-border/60 p-3 transition-colors",
                        on && "border-primary/50 bg-white/[0.04]",
                      )}
                    >
                      <label className="flex items-center gap-3">
                        <Checkbox checked={on} onCheckedChange={(v) => toggleTeam(t.id, !!v)} />
                        <span className="text-sm font-medium">{t.name}</span>
                      </label>
                      {on ? (
                        <Input
                          value={assignments[t.id] ?? ""}
                          onChange={(e) =>
                            setAssignments((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                          placeholder="Puesto — ej. DT, Auxiliar, Utilero"
                          className="mt-2"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {isPlayer && selectedTeams.length === 0 ? (
                <p className="text-[11px] text-destructive">Un jugador necesita al menos una categoría.</p>
              ) : null}
            </Section>
          ) : (
            <Section
              title="Puesto"
              hint="Este rol tiene alcance de todo el club: no se asigna a categorías."
            >
              <Field label="Puesto (opcional)" htmlFor="mf-club-job">
                <Input
                  id="mf-club-job"
                  value={clubJobTitle}
                  onChange={(e) => setClubJobTitle(e.target.value)}
                  placeholder="ej. Director deportivo, Presidente, Gerente"
                  maxLength={60}
                />
              </Field>
            </Section>
          )}

          {isPlayer ? (
            <>
              <Section title="Datos deportivos">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Dorsal" htmlFor="mf-jersey">
                    <Input
                      id="mf-jersey"
                      type="number"
                      value={player.jersey_number}
                      onChange={(e) => setPlayer((p) => ({ ...p, jersey_number: e.target.value }))}
                    />
                  </Field>
                  <Field label="Posición">
                    <Select
                      value={player.position}
                      onValueChange={(v) => setPlayer((p) => ({ ...p, position: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYER_POSITIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Posición secundaria" htmlFor="mf-pos2">
                    <Input
                      id="mf-pos2"
                      value={player.secondary_position}
                      onChange={(e) => setPlayer((p) => ({ ...p, secondary_position: e.target.value }))}
                    />
                  </Field>
                  <Field label="Pie hábil">
                    <Select
                      value={player.preferred_foot}
                      onValueChange={(v) => setPlayer((p) => ({ ...p, preferred_foot: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFERRED_FEET.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f === "derecho" ? "Derecho" : f === "izquierdo" ? "Izquierdo" : "Ambos"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              <Section title="Datos físicos" hint="Medidas de plantel, no expediente médico.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Altura (cm)" htmlFor="mf-h">
                    <Input
                      id="mf-h"
                      type="number"
                      value={player.height_cm}
                      onChange={(e) => setPlayer((p) => ({ ...p, height_cm: e.target.value }))}
                    />
                  </Field>
                  <Field label="Peso (kg)" htmlFor="mf-w">
                    <Input
                      id="mf-w"
                      type="number"
                      value={player.weight_kg}
                      onChange={(e) => setPlayer((p) => ({ ...p, weight_kg: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Talla playera" htmlFor="mf-shirt">
                    <Input
                      id="mf-shirt"
                      value={player.shirt_size}
                      onChange={(e) => setPlayer((p) => ({ ...p, shirt_size: e.target.value }))}
                    />
                  </Field>
                  <Field label="Talla pantalón" htmlFor="mf-pants">
                    <Input
                      id="mf-pants"
                      value={player.pants_size}
                      onChange={(e) => setPlayer((p) => ({ ...p, pants_size: e.target.value }))}
                    />
                  </Field>
                  <Field label="Calzado" htmlFor="mf-shoe">
                    <Input
                      id="mf-shoe"
                      value={player.shoe_size}
                      onChange={(e) => setPlayer((p) => ({ ...p, shoe_size: e.target.value }))}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Identidad y liga">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nacionalidad" htmlFor="mf-nat">
                    <Input
                      id="mf-nat"
                      value={player.nationality}
                      onChange={(e) => setPlayer((p) => ({ ...p, nationality: e.target.value }))}
                    />
                  </Field>
                  <Field label="Lugar de nacimiento" htmlFor="mf-bp">
                    <Input
                      id="mf-bp"
                      value={player.birthplace}
                      onChange={(e) => setPlayer((p) => ({ ...p, birthplace: e.target.value }))}
                    />
                  </Field>
                  <Field label="Número de afiliación" htmlFor="mf-aff">
                    <Input
                      id="mf-aff"
                      value={player.affiliation_number}
                      onChange={(e) => setPlayer((p) => ({ ...p, affiliation_number: e.target.value }))}
                    />
                  </Field>
                  <Field label="CURP / documento" htmlFor="mf-doc">
                    <Input
                      id="mf-doc"
                      value={player.id_document}
                      onChange={(e) => setPlayer((p) => ({ ...p, id_document: e.target.value }))}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Administrativos">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Fecha de ingreso" htmlFor="mf-join">
                    <Input
                      id="mf-join"
                      type="date"
                      value={player.joined_at}
                      onChange={(e) => setPlayer((p) => ({ ...p, joined_at: e.target.value }))}
                    />
                  </Field>
                  <Field label="Club de procedencia" htmlFor="mf-prev">
                    <Input
                      id="mf-prev"
                      value={player.previous_club}
                      onChange={(e) => setPlayer((p) => ({ ...p, previous_club: e.target.value }))}
                    />
                  </Field>
                  <Field label="Estatus">
                    <Select
                      value={player.player_status}
                      onValueChange={(v) => setPlayer((p) => ({ ...p, player_status: v as PlayerStatus }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {PLAYER_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>
            </>
          ) : null}
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear miembro"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
