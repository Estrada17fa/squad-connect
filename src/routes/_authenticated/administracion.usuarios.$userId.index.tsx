import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MoreHorizontal, Phone, MessageCircle, Mail, Plus, Pencil, KeyRound, UserMinus, RotateCcw, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { EmptyState } from "@/components/squad/EmptyState";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { PasswordChoice, initialPasswordValue, passwordPayload, passwordErrors, useClubPasswordStatus, type PasswordValue } from "@/components/admin/users/PasswordChoice";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { canManageUsers } from "@/lib/permissions";
import { inferBaseRole } from "@/lib/rolePages";
import { updateClubMember, deactivateClubMember, reactivateClubMember, removeMembership } from "@/lib/members.functions";
import { displayName, type MembershipLite } from "@/components/usuarios/memberUtils";
import { AllCategoriesToggle } from "@/components/usuarios/AllCategoriesToggle";
import { AddMembershipDialog } from "@/components/usuarios/AddMembershipDialog";
import { EditMembershipDialog } from "@/components/usuarios/EditMembershipDialog";
import { DeleteMemberDialog } from "@/components/usuarios/DeleteMemberDialog";
import { useAdminUsers, useRefreshAdminUsers, neverSignedIn, relativeTime, generateTempPassword } from "@/hooks/useAdminUsers";
import { UsersHeader, BackLabel, IconBtn, SectionLabel, GroupCard, InfoRow, RowButton, PersonAvatar, Pill, AccessReady, whatsappUrl } from "@/components/admin/users/ui";
import { ActivityTimeline, useAudit } from "@/components/admin/users/ActivityTimeline";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/$userId/")({
  component: FichaMiembro,
});

function age(iso: string) {
  const b = new Date(iso);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

function FichaMiembro() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);
  const refresh = useRefreshAdminUsers(clubId);
  const updateFn = useServerFn(updateClubMember);
  const deactivateFn = useServerFn(deactivateClubMember);
  const reactivateFn = useServerFn(reactivateClubMember);
  const removeFn = useServerFn(removeMembership);

  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MembershipLite | null>(null);
  const [rowMenu, setRowMenu] = React.useState<MembershipLite | null>(null);
  const [removing, setRemoving] = React.useState<MembershipLite | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<null | "reset" | "baja">(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [newAccess, setNewAccess] = React.useState<string | null>(null);
  const [resetPw, setResetPw] = React.useState<PasswordValue>(initialPasswordValue);
  const pwStatus = useClubPasswordStatus();

  const member = (data.members.data ?? []).find((m) => m.id === userId);
  const mems = data.byUser.get(userId) ?? [];
  const isPlayer = mems.some((m) => inferBaseRole(m.roleName) === "jugador");

  const overridesQ = useQuery({
    queryKey: ["adm-overrides-count", userId],
    enabled: canEdit,
    queryFn: async () => {
      const { count } = await supabase.from("user_permission_overrides").select("id", { count: "exact", head: true }).eq("user_id", userId);
      return count ?? 0;
    },
  });
  const playerQ = useQuery({
    queryKey: ["adm-player-id", userId],
    enabled: isPlayer,
    queryFn: async () => {
      const { data: p } = await supabase.from("player_profiles").select("id").eq("user_id", userId).is("archived_at", null).limit(1).maybeSingle();
      return p?.id ?? null;
    },
  });
  const audit = useAudit(canEdit ? clubId : null, userId, 5);

  if (data.members.isLoading) return <LoadingState />;
  if (!member) return <EmptyState title="No encontrado" message="Esta persona no pertenece a tu club." />;

  const name = displayName(member);
  const isBaja = (member.status ?? "activo") === "baja";
  const never = neverSignedIn(member, data.signInMap, data.signInAvailable);
  const last = data.signInMap.get(member.id);
  const phoneDigits = (member.phone ?? "").replace(/\D/g, "");
  const back = <Link to="/administracion/usuarios"><BackLabel>Usuarios</BackLabel></Link>;

  async function doReset() {
    if (!member) return;
    setBusy(true);
    try {
      const res = await updateFn({
        data: {
          user_id: member.id,
          first_name: member.first_name ?? name,
          paternal_last_name: member.paternal_last_name ?? "-",
          maternal_last_name: member.maternal_last_name,
          phone: member.phone,
          avatar_url: member.avatar_url,
          birthdate: member.birthdate,
          nationality: member.nationality,
          birthplace: member.birthplace,
          emergency_contact_name: member.emergency_contact_name,
          emergency_contact_phone: member.emergency_contact_phone,
          ...passwordPayload(resetPw),
        } as any,
      });
      setConfirm(null);
      setNewAccess(res.appliedPassword ?? "");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo restablecer");
    } finally {
      setBusy(false);
    }
  }

  async function doBaja() {
    setBusy(true);
    try {
      await deactivateFn({ data: { user_id: userId } });
      toast.success("Miembro dado de baja");
      setConfirm(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo dar de baja");
    } finally {
      setBusy(false);
    }
  }

  async function doReactivate() {
    try {
      await reactivateFn({ data: { user_id: userId } });
      toast.success("Miembro reactivado");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo reactivar");
    }
  }

  async function doRemove() {
    if (!removing) return;
    setBusy(true);
    try {
      await removeFn({ data: { membership_id: removing.id } });
      toast.success("Categoría quitada");
      setRemoving(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo quitar");
    } finally {
      setBusy(false);
    }
  }

  if (newAccess) {
    return (
      <div className="coord-enter mx-auto max-w-md space-y-6 pb-28">
        <UsersHeader back={back} />
        <AccessReady title="Contraseña restablecida" name={name} email={member.email ?? ""} password={newAccess} phone={member.phone}>
          <button onClick={() => setNewAccess(null)} className="coord-press min-h-11 w-full rounded-full text-sm font-semibold text-primary">Volver a la ficha</button>
        </AccessReady>
      </div>
    );
  }

  return (
    <div className="coord-enter mx-auto max-w-2xl space-y-5 pb-28">
      <UsersHeader
        back={back}
        actions={
          canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span><IconBtn label="Más acciones"><MoreHorizontal className="h-5 w-5" /></IconBtn></span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => navigate({ to: "/administracion/usuarios/$userId/editar", params: { userId } })}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar datos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setConfirm("reset")}><KeyRound className="mr-2 h-4 w-4" /> Restablecer contraseña</DropdownMenuItem>
                {isBaja ? (
                  <DropdownMenuItem onSelect={doReactivate}><RotateCcw className="mr-2 h-4 w-4" /> Reactivar</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setConfirm("baja")}><UserMinus className="mr-2 h-4 w-4" /> Dar de baja</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      <section className="flex flex-col items-center text-center">
        <PersonAvatar name={name} src={member.avatar_url} size={112} />
        <h1 className="mt-3 font-display text-[22px] font-bold leading-tight [overflow-wrap:anywhere]">{name}</h1>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {isBaja ? <Pill tone="gray">Baja</Pill> : null}
          {mems.length === 0 ? <Pill tone="gray">Sin categoría</Pill> : null}
          {mems.map((m) => <Pill key={m.id}>{m.teamName ?? "Todo el club"} · {m.roleName}</Pill>)}
        </div>
        <p className={never ? "mt-2 text-xs font-semibold text-urgency-amber" : "mt-2 text-xs text-muted-foreground"}>
          {never ? "Aún no entra a la app" : last ? `Último ingreso: ${relativeTime(last)}` : "Ya entró a la app"}
        </p>
      </section>

      <section className="flex justify-center gap-6">
        {[
          { label: "Llamar", icon: Phone, href: phoneDigits ? `tel:${member.phone}` : null },
          { label: "WhatsApp", icon: MessageCircle, href: phoneDigits ? whatsappUrl("", member.phone).replace("?text=", "") : null },
          { label: "Correo", icon: Mail, href: member.email ? `mailto:${member.email}` : null },
        ].map((a) => {
          const I = a.icon;
          const inner = (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <I className="h-5 w-5 text-muted-foreground" />
              </span>
              <span className="mt-1 text-xs font-medium">{a.label}</span>
            </>
          );
          return a.href ? (
            <a key={a.label} href={a.href} target={a.label === "WhatsApp" ? "_blank" : undefined} rel="noreferrer" className="coord-press flex flex-col items-center">{inner}</a>
          ) : (
            <span key={a.label} className="flex flex-col items-center opacity-40" aria-disabled>{inner}</span>
          );
        })}
      </section>

      <section>
        <SectionLabel>Datos</SectionLabel>
        <GroupCard>
          <InfoRow label="Teléfono" value={member.phone} href={member.phone ? `tel:${member.phone}` : undefined} />
          <InfoRow label="Correo" value={member.email} href={member.email ? `mailto:${member.email}` : undefined} />
          <InfoRow
            label="Nacimiento"
            value={member.birthdate ? `${new Date(member.birthdate + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })} · ${age(member.birthdate)} años` : null}
          />
          <InfoRow label="Lugar de nacimiento" value={member.birthplace} />
          <InfoRow label="Nacionalidad" value={member.nationality} />
          <InfoRow
            label="Emergencia"
            value={member.emergency_contact_name || member.emergency_contact_phone ? [member.emergency_contact_name, member.emergency_contact_phone].filter(Boolean).join(" · ") : null}
          />
        </GroupCard>
      </section>

      <section>
        <SectionLabel>Categorías y rol</SectionLabel>
        <div className="mb-2">
          <AllCategoriesToggle clubId={clubId ?? ""} userId={userId} roles={(data.roles.data ?? []) as any} canManage={canEdit} onChanged={refresh} />
        </div>
        <GroupCard>
          {mems.map((m) => (
            <RowButton key={m.id} chevron={canEdit} onClick={canEdit ? () => setRowMenu(m) : undefined}>
              <span className="block text-sm font-semibold">{m.teamName ?? "Todo el club"}</span>
              <span className="block text-xs text-muted-foreground">{m.roleName}{m.job_title ? ` · ${m.job_title}` : ""}</span>
            </RowButton>
          ))}
          {canEdit ? (
            <RowButton chevron={false} onClick={() => setAddOpen(true)}>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Plus className="h-4 w-4" /> Agregar categoría</span>
            </RowButton>
          ) : null}
          {!canEdit && mems.length === 0 ? <div className="px-3 py-3 text-sm text-muted-foreground">Sin categorías</div> : null}
        </GroupCard>
      </section>

      <section>
        <SectionLabel>Acceso</SectionLabel>
        <GroupCard>
          <InfoRow label="Estado" value={never ? <span className="text-urgency-amber">Aún no entra</span> : last ? relativeTime(last) : "Ya entró"} />
          {canEdit ? (
            <RowButton onClick={() => setConfirm("reset")}><span className="text-sm font-semibold">Restablecer contraseña</span></RowButton>
          ) : null}
        </GroupCard>
      </section>

      {canEdit ? (
        <section>
          <SectionLabel>Permisos</SectionLabel>
          <GroupCard>
            <RowButton onClick={() => navigate({ to: "/administracion/usuarios/$userId/permisos", params: { userId } })}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{overridesQ.data ? `${overridesQ.data} ${overridesQ.data === 1 ? "excepción" : "excepciones"}` : "Como su rol"}</span>
                <span className="text-sm font-semibold text-primary">Ajustar</span>
              </span>
            </RowButton>
          </GroupCard>
        </section>
      ) : null}

      {isPlayer && playerQ.data ? (
        <Link to="/m/plantel/$playerId" params={{ playerId: playerQ.data }} className="coord-press flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-primary">
          Ver ficha deportiva en Plantel <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}

      {canEdit ? (
        <section>
          <SectionLabel action={<Link to="/administracion/usuarios/actividad" className="text-xs font-semibold text-muted-foreground">Ver todo</Link>}>Actividad</SectionLabel>
          {audit.isError ? (
            <p className="px-1 text-sm text-muted-foreground">Próximamente</p>
          ) : (
            <ActivityTimeline rows={audit.data ?? []} members={data.members.data ?? []} roles={data.roles.data ?? []} teams={data.teams.data ?? []} showTarget={false} />
          )}
        </section>
      ) : null}

      {canEdit ? (
        <>
          <Dialog open={!!rowMenu} onOpenChange={(o) => !o && setRowMenu(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>{rowMenu?.teamName ?? "Todo el club"}</DialogTitle></DialogHeader>
              <GroupCard>
                <RowButton onClick={() => { setEditing(rowMenu); setRowMenu(null); }}><span className="text-sm font-semibold">Cambiar rol o puesto</span></RowButton>
                <RowButton chevron={false} onClick={() => { setRemoving(rowMenu); setRowMenu(null); }}><span className="text-sm font-semibold text-destructive">Quitar categoría</span></RowButton>
              </GroupCard>
            </DialogContent>
          </Dialog>
          <EditMembershipDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} membership={editing} roles={(data.roles.data ?? []) as any} onSaved={refresh} />
          <AddMembershipDialog open={addOpen} onOpenChange={setAddOpen} userId={userId} teams={data.teams.data ?? []} roles={(data.roles.data ?? []) as any} onAdded={refresh} />
          <ConfirmDialog
            open={!!removing}
            onOpenChange={(o) => !o && setRemoving(null)}
            title="Quitar categoría"
            confirmLabel="Quitar"
            loading={busy}
            description={
              mems.length <= 1
                ? `Es la última categoría de ${name}. Si la quitas, se quedará sin acceso a ninguna categoría del club.`
                : `Se quitará ${removing?.teamName ?? "Todo el club"} (${removing?.roleName ?? ""}). Las demás no cambian.`
            }
            onConfirm={doRemove}
          />
          <ConfirmDialog
            open={confirm === "reset"}
            onOpenChange={(o) => !o && setConfirm(null)}
            title="Restablecer contraseña"
            confirmLabel="Restablecer"
            loading={busy}
            description={`Elige la nueva contraseña de ${name}. La actual dejará de funcionar.`}
            onConfirm={() => {
              const pe = passwordErrors(resetPw, pwStatus.data?.configured ?? false);
              if (pe.length) { toast.error(pe[0]!); return; }
              return doReset();
            }}
          >
            <PasswordChoice value={resetPw} onChange={setResetPw} />
          </ConfirmDialog>
          <ConfirmDialog
            open={confirm === "baja"}
            onOpenChange={(o) => !o && setConfirm(null)}
            title="Dar de baja"
            confirmLabel="Dar de baja"
            loading={busy}
            description={`${name} pierde el acceso pero se conserva todo su historial.`}
            onConfirm={doBaja}
          />
          <DeleteMemberDialog
            member={deleteOpen ? (member as any) : null}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={() => {
              setDeleteOpen(false);
              refresh();
              navigate({ to: "/administracion/usuarios" });
            }}
          />
        </>
      ) : null}
    </div>
  );
}
