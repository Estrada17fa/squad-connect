import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Plus } from "lucide-react";
import { PasswordChoice, initialPasswordValue, passwordPayload, passwordErrors, useClubPasswordStatus, type PasswordValue } from "@/components/admin/users/PasswordChoice";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { EmptyState } from "@/components/squad/EmptyState";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClubMember, addMembership, updateMembership } from "@/lib/members.functions";
import { supabase } from "@/integrations/supabase/client";
import { PlayerSheetStep, EMPTY_SHARED, sheetErrors, sheetIsEmpty, sharedPayload, teamPayload, type TeamSheet, type SharedSheet } from "@/components/admin/users/PlayerSheetStep";
import { canManageUsers } from "@/lib/permissions";
import { inferBaseRole } from "@/lib/rolePages";
import { useAdminUsers, useRefreshAdminUsers } from "@/hooks/useAdminUsers";
import { StickyFooterActions } from "@/components/admin/users/FormParts";
import { PersonFields, EMPTY_PERSON, fieldErrors, PERSONA_KEYS, CONTACTO_KEYS, personPayload, type PersonData } from "@/components/admin/users/PersonFields";
import { UsersHeader, BackLabel, StepProgress, GroupCard, AccessReady, SectionLabel } from "@/components/admin/users/ui";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo miembro — Squad" },
      { name: "description", content: "Da de alta a un miembro del club en cuatro pasos." },
      { property: "og:title", content: "Nuevo miembro — Squad" },
      { property: "og:description", content: "Da de alta a un miembro del club en cuatro pasos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NuevoMiembro,
});

const STEPS_BASE = ["Persona", "Contacto", "Categorías", "Acceso"];
const STEPS_PLAYER = ["Persona", "Contacto", "Categorías", "Ficha deportiva", "Acceso"];

interface Issue { text: string; playerId: string | null }

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
  const updMemFn = useServerFn(updateMembership);
  const [sheets, setSheets] = React.useState<Record<string, TeamSheet>>({});
  const [shared, setShared] = React.useState<SharedSheet>(EMPTY_SHARED);
  const [skipSheet, setSkipSheet] = React.useState(false);

  const [step, setStep] = React.useState(0);
  const [person, setPerson] = React.useState<PersonData>(EMPTY_PERSON);
  const [allOn, setAllOn] = React.useState(false);
  const [allRole, setAllRole] = React.useState("");
  const [allJob, setAllJob] = React.useState("");
  const [assigns, setAssigns] = React.useState<Assign[]>([]);
  const [pw, setPw] = React.useState<PasswordValue>(initialPasswordValue);
  const pwStatus = useClubPasswordStatus();
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [tried, setTried] = React.useState<Record<number, boolean>>({});
  const [done, setDone] = React.useState<{ id: string; name: string; email: string; password: string; phone: string | null; issues: Issue[]; pending: Issue | null } | null>(null);

  const roles = data.roles.data ?? [];
  const teams = data.teams.data ?? [];
  const roleById = (id: string) => roles.find((r) => r.id === id);
  const isPlayer = (id: string) => inferBaseRole(roleById(id)?.name ?? null) === "jugador" || (roleById(id)?.base_role ?? "") === "jugador";

  const playerAssigns = allOn ? [] : assigns.filter((a) => a.team_id && a.role_id && isPlayer(a.role_id));
  const hasPlayer = playerAssigns.length > 0;
  const STEPS = hasPlayer ? STEPS_PLAYER : STEPS_BASE;
  const ACCESS = STEPS.length - 1;
  const SHEET = hasPlayer ? 3 : -1;
  const playerTeams = playerAssigns.map((a) => ({ id: a.team_id, name: teams.find((t) => t.id === a.team_id)?.name ?? "Categoría" }));
  const taken = React.useMemo(() => {
    const members = data.members.data ?? [];
    const nameOf = (uid: string) => {
      const m = members.find((x) => x.id === uid);
      return m ? [m.first_name, m.paternal_last_name].filter(Boolean).join(" ") || m.full_name || "otro jugador" : "otro jugador";
    };
    return (data.players.data ?? [])
      .filter((r) => r.jersey_number != null && (members.find((x) => x.id === r.user_id)?.status ?? "activo") !== "baja")
      .map((r) => ({ team_id: r.team_id, number: r.jersey_number as number, name: nameOf(r.user_id) }));
  }, [data.players.data, data.members.data]);
  const sheetErr = sheetErrors(playerTeams.map((t) => t.id), sheets, taken);

  if (!canEdit) return <EmptyState title="Sin acceso" message="Solo quien edita Usuarios puede dar de alta miembros." />;

  function pickAllRole(id: string) {
    setAllRole(id);
    setAllOn(!!roleById(id)?.default_all_categories && !isPlayer(id));
  }

  function stepErrors(s: number): string[] {
    if (s === 0) return Object.values(fieldErrors(person, PERSONA_KEYS)) as string[];
    if (s === 1) return Object.values(fieldErrors(person, CONTACTO_KEYS)) as string[];
    if (s === 2) {
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
    if (s === SHEET) return Object.values(sheetErr);
    if (s === ACCESS) return passwordErrors(pw, pwStatus.data?.configured ?? false);
    return [];
  }

  function next() {
    const e = stepErrors(step);
    setTried({ ...tried, [step]: true });
    setErrors(step === 2 ? e : []);
    if (e.length === 0) { setErrors([]); if (step === SHEET) setSkipSheet(false); setStep(step + 1); window.scrollTo({ top: 0 }); }
  }

  async function submit() {
    const pe = stepErrors(ACCESS);
    if (pe.length) { setErrors(pe); return; }
    setSaving(true);
    setErrors([]);
    try {
      const useSheet = hasPlayer && !skipSheet;
      const primaryRole = allOn ? allRole : hasPlayer ? playerAssigns[0]!.role_id : assigns[0]!.role_id;
      const first = allOn ? [] : assigns.filter((a) => a.role_id === primaryRole);
      const rest = allOn ? [] : assigns.filter((a) => a.role_id !== primaryRole);
      const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "una categoría";
      const res = await createFn({
        data: {
          ...personPayload(person),
          email: person.email.trim().toLowerCase(),
          ...passwordPayload(pw),
          role_id: primaryRole,
          assignments: first.map((a) => ({ team_id: a.team_id, job_title: a.job_title.trim() || null })),
          all_categories: allOn,
          club_job_title: allOn ? allJob.trim() || null : null,
          player: useSheet ? { ...sharedPayload(shared), ...teamPayload(sheets[first[0]?.team_id ?? ""]) } : undefined,
        } as any,
      });
      // A partir de aquí el miembro ya existe: cualquier falla se informa sin ocultar el alta.
      const failed: { team_id: string; text: string }[] = [];
      if (useSheet) {
        for (const a of first.slice(1)) {
          if (!isPlayer(a.role_id)) continue;
          try {
            const { data: ms, error } = await supabase.from("team_memberships").select("id").eq("user_id", res.userId).eq("team_id", a.team_id).maybeSingle();
            if (error || !ms) throw new Error("sin membresía");
            await updMemFn({ data: { membership_id: ms.id, role_id: a.role_id, job_title: a.job_title.trim() || null, ...teamPayload(sheets[a.team_id]) } });
          } catch {
            failed.push({ team_id: a.team_id, text: `Miembro creado, pero no se guardó la ficha de ${teamName(a.team_id)}` });
          }
        }
      }
      for (const a of rest) {
        const extra = useSheet && isPlayer(a.role_id) ? teamPayload(sheets[a.team_id]) : {};
        try {
          await addFn({ data: { user_id: res.userId, team_id: a.team_id, role_id: a.role_id, job_title: a.job_title.trim() || null, ...extra } });
        } catch {
          failed.push({ team_id: a.team_id, text: isPlayer(a.role_id) ? `Miembro creado, pero no se guardó la ficha de ${teamName(a.team_id)}` : `Miembro creado, pero no se agregó la categoría ${teamName(a.team_id)}` });
        }
      }
      let rows: { id: string; team_id: string }[] = [];
      if (hasPlayer) {
        const { data: pr } = await supabase.from("player_profiles").select("id, team_id").eq("user_id", res.userId).is("archived_at", null);
        rows = (pr ?? []) as any;
      }
      const pid = (t: string) => rows.find((r) => r.team_id === t)?.id ?? rows[0]?.id ?? null;
      const issues = failed.map((f) => ({ text: f.text, playerId: pid(f.team_id) }));
      const pendingSheet = hasPlayer && (skipSheet || sheetIsEmpty(playerTeams.map((t) => t.id), sheets));
      refresh();
      setDone({
        id: res.userId,
        name: `${person.first_name.trim()} ${person.paternal_last_name.trim()}`,
        email: person.email.trim().toLowerCase(),
        password: res.appliedPassword,
        phone: person.phone.trim() || null,
        issues,
        pending: pendingSheet ? { text: "Ficha deportiva pendiente", playerId: pid(playerTeams[0]!.id) } : null,
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
    setTried({});
    setPerson(EMPTY_PERSON);
    setAllOn(false);
    setAllRole("");
    setAllJob("");
    setAssigns([]);
    setSheets({});
    setShared(EMPTY_SHARED);
    setSkipSheet(false);
    setPw(initialPasswordValue());
  }

  const back = <Link to="/administracion/usuarios"><BackLabel>Usuarios</BackLabel></Link>;

  if (done) {
    return (
      <div className="coord-enter mx-auto max-w-md space-y-6 pb-28">
        <UsersHeader back={back} />
        {done.issues.length ? (
          <div className="space-y-2 rounded-[14px] bg-urgency-red/10 p-3">
            {done.issues.map((i) => (
              <div key={i.text} className="text-sm">
                <p className="font-semibold text-urgency-red">{i.text}</p>
                <PlantelLink playerId={i.playerId}>Completar en Plantel ›</PlantelLink>
              </div>
            ))}
          </div>
        ) : null}
        <AccessReady title={done.issues.length ? "Miembro creado" : "Listo"} name={done.name} email={done.email} password={done.password} phone={done.phone}>
          {done.pending && !done.issues.length ? (
            <PlantelLink playerId={done.pending.playerId} className="block rounded-[14px] bg-card px-3 py-3 text-left text-sm">
              <span className="text-muted-foreground">Ficha deportiva pendiente · </span><span className="font-semibold text-primary">Completar en Plantel ›</span>
            </PlantelLink>
          ) : null}
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
    <div className="coord-enter mx-auto max-w-md space-y-3 pb-28">
      <div className="sticky top-0 z-20 -mx-4 -mt-2 space-y-1.5 bg-background/95 px-4 pb-1.5 backdrop-blur">
        <UsersHeader back={back} title="Nuevo miembro" />
        <StepProgress steps={STEPS} current={step} />
      </div>

      {step === 0 ? <PersonFields section="persona" value={person} onChange={setPerson} withEmail showAll={tried[0]} /> : null}
      {step === 1 ? <PersonFields section="contacto" value={person} onChange={setPerson} withEmail showAll={tried[1]} /> : null}

      {step === 2 ? (
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

      {step === SHEET ? (
        <div className="space-y-3">
          <PlayerSheetStep teams={playerTeams} sheets={sheets} onSheets={setSheets} shared={shared} onShared={setShared} errors={sheetErr} />
          <button
            type="button"
            onClick={() => { setSkipSheet(true); setErrors([]); setStep(ACCESS); window.scrollTo({ top: 0 }); }}
            className="coord-press min-h-11 w-full text-sm font-semibold text-muted-foreground"
          >
            Completar después en Plantel
          </button>
        </div>
      ) : null}
      {step === ACCESS ? <PasswordChoice value={pw} onChange={setPw} /> : null}

      {errors.length ? (
        <ul className="space-y-1 text-sm text-urgency-red">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
      ) : null}

      <StickyFooterActions noNav onBack={step > 0 ? () => { setErrors([]); setStep(step - 1); } : undefined}>
        {step < ACCESS ? (
          <button onClick={next} aria-disabled={stepErrors(step).length > 0} className={"coord-press min-h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground " + (stepErrors(step).length > 0 ? "opacity-40" : "")}>Siguiente</button>
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

function PlantelLink({ playerId, className, children }: { playerId: string | null; className?: string; children: React.ReactNode }) {
  const cls = className ?? "text-sm font-semibold text-primary";
  return playerId ? (
    <Link to="/m/plantel/$playerId" params={{ playerId }} className={cls}>{children}</Link>
  ) : (
    <Link to="/m/plantel" className={cls}>{children}</Link>
  );
}
