import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClubMember, PLAYER_POSITIONS, type PlayerPosition } from "@/lib/members.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoleOpt {
  id: string;
  name: string;
  allows_club_wide: boolean;
}
interface TeamOpt {
  id: string;
  name: string;
}
interface Draft {
  role_id: string;
  team_id: string; // "" | "__club__" | uuid
  job_title: string;
}

// Priority: Jugador > Admin > Técnico > Médico > Staff > any other
const ROLE_PRIORITY: Record<string, number> = {
  Jugador: 100,
  Admin: 80,
  Técnico: 60,
  Medico: 40, // just in case of unaccented
  Médico: 40,
  Staff: 20,
};

function dominantRoleName(memberships: Draft[], roles: RoleOpt[]): string | null {
  let best: { name: string; score: number } | null = null;
  for (const m of memberships) {
    const r = roles.find((x) => x.id === m.role_id);
    if (!r) continue;
    const score = ROLE_PRIORITY[r.name] ?? 10;
    if (!best || score > best.score) best = { name: r.name, score };
  }
  return best?.name ?? null;
}

export function CreateMemberDialog({
  open,
  onOpenChange,
  clubId,
  roles,
  teams,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clubId: string;
  roles: RoleOpt[];
  teams: TeamOpt[];
  onCreated: (userId: string, dominantRoleName: string | null) => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createClubMember);

  const [step, setStep] = React.useState<1 | 2>(1);
  const [memberships, setMemberships] = React.useState<Draft[]>([{ role_id: "", team_id: "", job_title: "" }]);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [paternal, setPaternal] = React.useState("");
  const [maternal, setMaternal] = React.useState("");
  const [birthdate, setBirthdate] = React.useState("");
  const [nationality, setNationality] = React.useState("");
  const [birthplace, setBirthplace] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [shirt, setShirt] = React.useState("");
  const [pants, setPants] = React.useState("");
  const [shoe, setShoe] = React.useState("");
  const [jersey, setJersey] = React.useState("");
  const [position, setPosition] = React.useState<PlayerPosition | "">("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setMemberships([{ role_id: "", team_id: "", job_title: "" }]);
      setEmail("");
      setPassword("");
      setShowPass(false);
      setFirstName("");
      setPaternal("");
      setMaternal("");
      setBirthdate("");
      setNationality("");
      setBirthplace("");
      setPhone("");
      setShirt("");
      setPants("");
      setShoe("");
      setJersey("");
      setPosition("");
      setSaving(false);
    }
  }, [open]);

  const dominant = dominantRoleName(memberships, roles);
  const isPlayer = dominant === "Jugador";

  // Un jugador SIEMPRE requiere categoría específica. Los demás roles son club-wide.
  const membershipsOk =
    memberships.length > 0 &&
    memberships.every((m) => {
      if (!m.role_id) return false;
      const r = roles.find((x) => x.id === m.role_id);
      if (r?.name === "Jugador") {
        return !!m.team_id && m.team_id !== "__club__";
      }
      return true; // no-jugador: club-wide implícito
    });

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passOk = password.length >= 8;
  const namesOk = firstName.trim() && paternal.trim() && maternal.trim();
  const personalOk = emailOk && passOk && !!namesOk;
  const canSubmit = membershipsOk && personalOk && !saving;

  function updateMembership(idx: number, patch: Partial<Draft>) {
    setMemberships((list) =>
      list.map((m, i) => {
        if (i !== idx) return m;
        const next = { ...m, ...patch };
        if (patch.role_id) {
          const r = roles.find((x) => x.id === patch.role_id);
          // Rol distinto de Jugador => forzar club-wide.
          if (r && r.name !== "Jugador") next.team_id = "__club__";
          else if (next.team_id === "__club__") next.team_id = "";
        }
        return next;
      }),
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        paternal_last_name: paternal.trim(),
        maternal_last_name: maternal.trim(),
        birthdate: birthdate || null,
        nationality: nationality.trim() || null,
        birthplace: birthplace.trim() || null,
        phone: phone.trim() || null,
        shirt_size: isPlayer ? (shirt.trim() || null) : null,
        pants_size: isPlayer ? (pants.trim() || null) : null,
        shoe_size: isPlayer ? (shoe.trim() || null) : null,
        jersey_number: isPlayer && jersey.trim() ? Number(jersey) : null,
        position: isPlayer && position ? (position as PlayerPosition) : null,
        memberships: memberships.map((m) => ({
          role_id: m.role_id,
          team_id: m.team_id === "__club__" ? null : m.team_id,
          job_title: m.job_title.trim() || null,
        })),
      };
      const res = await createFn({ data: payload });
      toast.success("Miembro creado");
      qc.invalidateQueries({ queryKey: ["club-members", clubId] });
      onCreated(res.userId, dominantRoleName(memberships, roles));
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo crear el miembro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear miembro</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Paso 1 de 2 — Define primero el rol, la categoría y el puesto (puedes añadir varias)."
              : `Paso 2 de 2 — Datos personales${dominant ? ` · ${dominant}` : ""}.`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Membresías</h4>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setMemberships((l) => [...l, { role_id: "", team_id: "", job_title: "" }])}
              >
                <Plus className="mr-1 h-4 w-4" /> Añadir
              </Button>
            </div>
            <div className="grid gap-2">
              {memberships.map((m, idx) => {
                const role = roles.find((r) => r.id === m.role_id);
                const isPlayer = role?.name === "Jugador";
                return (
                  <div key={idx} className="glass rounded-lg p-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select value={m.role_id} onValueChange={(v) => updateMembership(idx, { role_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                              {r.name !== "Jugador" ? " · ve todo el club" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isPlayer ? (
                        <Select
                          value={m.team_id === "__club__" ? "" : m.team_id}
                          onValueChange={(v) => updateMembership(idx, { team_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                          Alcance: todo el club
                        </div>
                      )}
                    </div>
                    <Input
                      value={m.job_title}
                      onChange={(e) => updateMembership(idx, { job_title: e.target.value })}
                      placeholder="Puesto (opcional) — ej. Utilero, Kinesiólogo, Portero"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        {isPlayer
                          ? "Selecciona la categoría en la que juega."
                          : "Este rol ve toda la información del club."}
                      </p>
                      {memberships.length > 1 ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setMemberships((l) => l.filter((_, i) => i !== idx))}
                          aria-label="Quitar membresía"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="space-y-3">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Cuenta</h4>
              <div className="space-y-2">
                <Label htmlFor="cm-email">Email</Label>
                <Input
                  id="cm-email"
                  type="email"
                  value={email}
                  autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="miembro@club.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cm-pass">Contraseña (mín. 8)</Label>
                <div className="relative">
                  <Input
                    id="cm-pass"
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
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Datos personales</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cm-first">Nombre</Label>
                  <Input id="cm-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cm-pat">Apellido Paterno</Label>
                  <Input id="cm-pat" value={paternal} onChange={(e) => setPaternal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cm-mat">Apellido Materno</Label>
                  <Input id="cm-mat" value={maternal} onChange={(e) => setMaternal(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cm-birth">Fecha de nacimiento</Label>
                  <Input id="cm-birth" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cm-nat">Nacionalidad</Label>
                  <Input id="cm-nat" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Mexicana" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cm-bplace">Lugar de nacimiento</Label>
                  <Input id="cm-bplace" value={birthplace} onChange={(e) => setBirthplace(e.target.value)} placeholder="Ciudad, País" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cm-phone">Teléfono (opcional)</Label>
                  <Input id="cm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </section>

            {isPlayer ? (
              <section className="space-y-3">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Datos deportivos</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cm-jersey">Dorsal</Label>
                    <Input
                      id="cm-jersey"
                      type="number"
                      inputMode="numeric"
                      value={jersey}
                      onChange={(e) => setJersey(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cm-pos">Posición</Label>
                    <Select value={position} onValueChange={(v) => setPosition(v as PlayerPosition)}>
                      <SelectTrigger id="cm-pos">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYER_POSITIONS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cm-shirt">Talla playera</Label>
                    <Input id="cm-shirt" value={shirt} onChange={(e) => setShirt(e.target.value)} placeholder="M" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cm-pants">Talla inferior</Label>
                    <Input id="cm-pants" value={pants} onChange={(e) => setPants(e.target.value)} placeholder="30" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cm-shoe">Talla calzado</Label>
                    <Input id="cm-shoe" value={shoe} onChange={(e) => setShoe(e.target.value)} placeholder="27" />
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          {step === 2 ? (
            <Button variant="secondary" onClick={() => setStep(1)} disabled={saving}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
            </Button>
          ) : null}
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!membershipsOk}>
              Siguiente <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {saving ? "Creando..." : "Crear miembro"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
