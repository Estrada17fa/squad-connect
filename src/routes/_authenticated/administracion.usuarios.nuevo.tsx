import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { EmptyState } from "@/components/squad/EmptyState";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClubMember, addMembership } from "@/lib/members.functions";
import { canManageUsers } from "@/lib/permissions";
import { inferBaseRole } from "@/lib/rolePages";
import { useAdminUsers, useRefreshAdminUsers, generateTempPassword } from "@/hooks/useAdminUsers";
import { StickyFooterActions } from "@/components/admin/users/FormParts";
import { PersonFields, EMPTY_PERSON, personErrors, personPayload, type PersonData } from "@/components/admin/users/PersonFields";
import { UsersHeader, BackLabel, StepIndicator, GroupCard, AccessReady, SectionLabel } from "@/components/admin/users/ui";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo miembro — Squad" },
      { name: "description", content: "Da de alta a un miembro del club en tres pasos." },
      { property: "og:title", content: "Nuevo miembro — Squad" },
      { property: "og:description", content: "Da de alta a un miembro del club en tres pasos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NuevoMiembro,
});

interface Assign { team_id: string; role_id: string; job_title: string }

function NuevoMiembro() {
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);
  const refresh = useRefreshAdminUsers(clubId);
  const navigate = useNavigate();
  const createFn = useServerFn(createClubMember);
  const addFn = useServerFn(addMembership);

  const [step, setStep] = React.useState(0);
  const [person, setPerson] = React.useState<PersonData>(EMPTY_PERSON);
  const [allOn, setAllOn] = React.useState(false);
  const [allRole, setAllRole] = React.useState("");
  const [allJob, setAllJob] = React.useState("");
  const [assigns, setAssigns] = React.useState<Assign[]>([]);
  const [password, setPassword] = React.useState(() => generateTempPassword());
  const [showPw, setShowPw] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [done, setDone] = React.useState<{ id: string; name: string; email: string; password: string; phone: string | null } | null>(null);

  const roles = data.roles.data ?? [];
  const teams = data.teams.data ?? [];
  const roleById = (id: string) => roles.find((r) => r.id === id);
  const isPlayer = (id: string) => inferBaseRole(roleById(id)?.name ?? null) === "jugador" || (roleById(id)?.base_role ?? "") === "jugador";

  if (!canEdit) return <EmptyState title="Sin acceso" message="Solo quien edita Usuarios puede dar de alta miembros." />;

  function pickAllRole(id: string) {
    setAllRole(id);
    setAllOn(!!roleById(id)?.default_all_categories && !isPlayer(id));
  }

  function stepErrors(s: number): string[] {
    if (s === 0) return personErrors(person, true);
    if (s === 1) {
      if (allOn) {
        if (!allRole) return ["Elige el rol para todas las categorías"];
        if (isPlayer(allRole)) return ["Un jugador se asigna categoría por categoría"];
        return [];
      }
      if (assigns.length === 0) return ["Elige al menos una categoría o activa \"Todas las categorías\""];
      if (assigns.some((a) => !a.team_id || !a.role_id)) return ["Cada categoría necesita su rol"];
      if (new Set(assigns.map((a) => a.team_id)).size !== assigns.length) return ["Hay una categoría repetida"];
      return [];
    }
    return [];
  }

  function next() {
    const e = stepErrors(step);
    setErrors(e);
    if (e.length === 0) setStep(step + 1);
  }

  async function submit() {
    setSaving(true);
    setErrors([]);
    try {
      const primaryRole = allOn ? allRole : assigns[0]!.role_id;
      const first = allOn ? [] : assigns.filter((a) => a.role_id === primaryRole);
      const rest = allOn ? [] : assigns.filter((a) => a.role_id !== primaryRole);
      const res = await createFn({
        data: {
          ...personPayload(person),
          email: person.email.trim().toLowerCase(),
          password,
          role_id: primaryRole,
          assignments: first.map((a) => ({ team_id: a.team_id, job_title: a.job_title.trim() || null })),
          all_categories: allOn,
          club_job_title: allOn ? allJob.trim() || null : null,
        } as any,
      });
      for (const a of rest) {
        await addFn({ data: { user_id: res.userId, team_id: a.team_id, role_id: a.role_id, job_title: a.job_title.trim() || null } });
      }
      refresh();
      setDone({
        id: res.userId,
        name: `${person.first_name.trim()} ${person.paternal_last_name.trim()}`,
        email: person.email.trim().toLowerCase(),
        password,
        phone: person.phone.trim() || null,
      });
    } catch (e: any) {
      setErrors([e?.message ?? "No se pudo crear el miembro"]);
      toast.error(e?.message ?? "No se pudo crear el miembro");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDone(null);
    setStep(0);
    setPerson(EMPTY_PERSON);
    setAllOn(false);
    setAllRole("");
    setAllJob("");
    setAssigns([]);
    setPassword(generateTempPassword());
  }

  const back = <Link to="/administracion/usuarios"><BackLabel>Usuarios</BackLabel></Link>;

  if (done) {
    return (
      <div className="coord-enter mx-auto max-w-md space-y-6 pb-28">
        <UsersHeader back={back} />
        <AccessReady title="Listo" name={done.name} email={done.email} password={done.password} phone={done.phone}>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => navigate({ to: "/administracion/usuarios/$userId", params: { userId: done.id } })} className="coord-press min-h-11 rounded-full text-sm font-semibold text-primary">
              Ver ficha
            </button>
            <button onClick={reset} className="coord-press min-h-11 rounded-full text-sm font-semibold text-primary">Crear otro</button>
          </div>
        </AccessReady>
      </div>
    );
  }

  return (
    <div className="coord-enter mx-auto max-w-md space-y-5 pb-28">
      <UsersHeader back={back} title="Nuevo miembro" />
      <StepIndicator steps={["Datos", "Categorías", "Acceso"]} current={step} />

      {step === 0 ? <PersonFields value={person} onChange={setPerson} withEmail /> : null}

      {step === 1 ? (
        <div className="space-y-4">
          <GroupCard>
            <label className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
              <span>
                <span className="block text-sm font-semibold">Todas las categorías</span>
                <span className="block text-xs text-muted-foreground">Incluye las que se creen después</span>
              </span>
              <Switch checked={allOn} onCheckedChange={(v) => setAllOn(v)} disabled={!!allRole && isPlayer(allRole)} />
            </label>
          </GroupCard>

          {allOn ? (
            <div className="space-y-3">
              <SectionLabel>Rol en todas</SectionLabel>
              <RoleSelect roles={roles} value={allRole} onChange={pickAllRole} />
              <Input className="h-11 rounded-xl" placeholder="Puesto (opcional)" value={allJob} onChange={(e) => setAllJob(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-3">
              <SectionLabel>Categorías</SectionLabel>
              {assigns.map((a, i) => (
                <div key={i} className="space-y-2 rounded-[14px] bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Select value={a.team_id} onValueChange={(v) => setAssigns(assigns.map((x, j) => (j === i ? { ...x, team_id: v } : x)))}>
                      <SelectTrigger className="h-11 flex-1 rounded-xl"><SelectValue placeholder="Categoría" /></SelectTrigger>
                      <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <button aria-label="Quitar" onClick={() => setAssigns(assigns.filter((_, j) => j !== i))} className="coord-press flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <RoleSelect
                    roles={roles}
                    value={a.role_id}
                    onChange={(v) => {
                      setAssigns(assigns.map((x, j) => (j === i ? { ...x, role_id: v } : x)));
                      if (assigns.length === 1 && roleById(v)?.default_all_categories && !isPlayer(v)) {
                        setAllRole(v);
                        setAllOn(true);
                      }
                    }}
                  />
                  <Input className="h-11 rounded-xl" placeholder="Puesto (opcional)" value={a.job_title} onChange={(e) => setAssigns(assigns.map((x, j) => (j === i ? { ...x, job_title: e.target.value } : x)))} />
                </div>
              ))}
              <button
                onClick={() => setAssigns([...assigns, { team_id: "", role_id: assigns[assigns.length - 1]?.role_id ?? "", job_title: "" }])}
                className="coord-press inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-muted text-sm font-semibold"
              >
                <Plus className="h-4 w-4" /> Agregar categoría
              </button>
            </div>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Esta es su contraseña temporal. La persona deberá cambiarla al entrar.</p>
          <div className="flex items-center gap-2 rounded-[14px] bg-card p-3">
            <span className="min-w-0 flex-1 truncate font-mono text-base font-semibold">{showPw ? password : "••••••••••••"}</span>
            <button aria-label={showPw ? "Ocultar" : "Mostrar"} onClick={() => setShowPw(!showPw)} className="coord-press flex h-10 w-10 items-center justify-center rounded-xl">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button aria-label="Generar otra" onClick={() => setPassword(generateTempPassword())} className="coord-press flex h-10 w-10 items-center justify-center rounded-xl">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {errors.length ? (
        <ul className="space-y-1 text-sm text-urgency-red">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
      ) : null}

      <StickyFooterActions onBack={step > 0 ? () => { setErrors([]); setStep(step - 1); } : undefined}>
        {step < 2 ? (
          <button onClick={next} className="coord-press min-h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground">Siguiente</button>
        ) : (
          <button onClick={submit} disabled={saving} className="coord-press min-h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? "Creando…" : "Crear miembro"}
          </button>
        )}
      </StickyFooterActions>
    </div>
  );
}

function RoleSelect({ roles, value, onChange }: { roles: { id: string; name: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Rol" /></SelectTrigger>
      <SelectContent>{roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}
