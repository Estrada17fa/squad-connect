import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClubMember } from "@/lib/members.functions";
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
  onCreated: (userId: string) => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createClubMember);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [birthdate, setBirthdate] = React.useState("");
  const [nationality, setNationality] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [shirt, setShirt] = React.useState("");
  const [pants, setPants] = React.useState("");
  const [shoe, setShoe] = React.useState("");
  const [jersey, setJersey] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [memberships, setMemberships] = React.useState<Draft[]>([{ role_id: "", team_id: "", job_title: "" }]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setShowPass(false);
      setFullName("");
      setBirthdate("");
      setNationality("");
      setPhone("");
      setShirt("");
      setPants("");
      setShoe("");
      setJersey("");
      setPosition("");
      setMemberships([{ role_id: "", team_id: "", job_title: "" }]);
      setSaving(false);
    }
  }, [open]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passOk = password.length >= 8;
  const nameOk = fullName.trim().length > 0;
  const membershipsOk =
    memberships.length > 0 &&
    memberships.every((m) => !!m.role_id && !!m.team_id);
  const canSubmit = emailOk && passOk && nameOk && membershipsOk && !saving;

  function updateMembership(idx: number, patch: Partial<Draft>) {
    setMemberships((list) =>
      list.map((m, i) => {
        if (i !== idx) return m;
        const next = { ...m, ...patch };
        // If role changes and current team is "__club__" but new role doesn't allow it, reset team.
        if (patch.role_id) {
          const r = roles.find((x) => x.id === patch.role_id);
          if (next.team_id === "__club__" && !r?.allows_club_wide) next.team_id = "";
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
        full_name: fullName.trim(),
        birthdate: birthdate || null,
        nationality: nationality.trim() || null,
        phone: phone.trim() || null,
        shirt_size: shirt.trim() || null,
        pants_size: pants.trim() || null,
        shoe_size: shoe.trim() || null,
        jersey_number: jersey.trim() ? Number(jersey) : null,
        position: position.trim() || null,
        memberships: memberships.map((m) => ({
          role_id: m.role_id,
          team_id: m.team_id === "__club__" ? null : m.team_id,
          job_title: m.job_title.trim() || null,
        })),
      };
      const res = await createFn({ data: payload });
      toast.success("Miembro creado");
      qc.invalidateQueries({ queryKey: ["club-members", clubId] });
      onCreated(res.userId);
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
            Se creará la cuenta y quedará asociada a tu club. Asigna al menos una membresía.
          </DialogDescription>
        </DialogHeader>

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
            <div className="space-y-2">
              <Label htmlFor="cm-name">Nombre completo</Label>
              <Input
                id="cm-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre y apellidos"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Datos personales</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cm-birth">Cumpleaños</Label>
                <Input id="cm-birth" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cm-nat">Nacionalidad</Label>
                <Input id="cm-nat" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Mexicana" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cm-phone">Teléfono</Label>
                <Input id="cm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cm-shirt">Talla playera</Label>
                <Input id="cm-shirt" value={shirt} onChange={(e) => setShirt(e.target.value)} placeholder="M" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cm-pants">Talla inferior</Label>
                <Input id="cm-pants" value={pants} onChange={(e) => setPants(e.target.value)} placeholder="30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cm-shoe">Talla calzado</Label>
                <Input id="cm-shoe" value={shoe} onChange={(e) => setShoe(e.target.value)} placeholder="27" />
              </div>
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cm-pos">Posición</Label>
                <Input id="cm-pos" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Delantero" />
              </div>
            </div>
          </section>

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
                const clubWide = !!role?.allows_club_wide;
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
                              {r.allows_club_wide ? " · alcance club" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={m.team_id}
                        onValueChange={(v) => updateMembership(idx, { team_id: v })}
                        disabled={!m.role_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={m.role_id ? "Categoría" : "Elige rol primero"} />
                        </SelectTrigger>
                        <SelectContent>
                          {clubWide ? <SelectItem value="__club__">Todo el club</SelectItem> : null}
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={m.job_title}
                      onChange={(e) => updateMembership(idx, { job_title: e.target.value })}
                      placeholder="Puesto (opcional) — ej. Utilero, Kinesiólogo, Portero"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        {m.role_id && !clubWide
                          ? "Este rol requiere una categoría específica."
                          : "Elige rol y categoría."}
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Creando..." : "Crear miembro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
