import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useApp } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { EmptyState } from "@/components/squad/EmptyState";
import { canManageUsers } from "@/lib/permissions";
import { updateClubMember } from "@/lib/members.functions";
import { useAdminUsers, useRefreshAdminUsers } from "@/hooks/useAdminUsers";
import { PersonFields, personErrors, personPayload, type PersonData } from "@/components/admin/users/PersonFields";
import { UsersHeader, BackLabel } from "@/components/admin/users/ui";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/$userId/editar")({
  component: EditarMiembro,
});

function EditarMiembro() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { profile, isSuperAdmin, permissions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canEdit = isSuperAdmin || canManageUsers(permissions["usuarios"]);
  const data = useAdminUsers(clubId);
  const refresh = useRefreshAdminUsers(clubId);
  const updateFn = useServerFn(updateClubMember);
  const member = (data.members.data ?? []).find((m) => m.id === userId);
  const [value, setValue] = React.useState<PersonData | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (member && !value) {
      setValue({
        first_name: member.first_name ?? "",
        paternal_last_name: member.paternal_last_name ?? "",
        maternal_last_name: member.maternal_last_name ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        birthdate: member.birthdate ?? "",
        birthplace: member.birthplace ?? "",
        nationality: member.nationality ?? "",
        avatar_url: member.avatar_url ?? "",
        emergency_contact_name: member.emergency_contact_name ?? "",
        emergency_contact_phone: member.emergency_contact_phone ?? "",
      });
    }
  }, [member, value]);

  if (!canEdit) return <EmptyState title="Sin acceso" message="Solo quien edita Usuarios puede cambiar estos datos." />;
  if (data.members.isLoading || (member && !value)) return <LoadingState />;
  if (!member || !value) return <EmptyState title="No encontrado" message="Esta persona no pertenece a tu club." />;

  async function save() {
    const e = personErrors(value!, false);
    setErrors(e);
    if (e.length) return;
    setSaving(true);
    try {
      // Solo datos personales: nunca toca categorías ni roles.
      await updateFn({ data: { user_id: userId, ...personPayload(value!) } as any });
      toast.success("Datos guardados");
      refresh();
      navigate({ to: "/administracion/usuarios/$userId", params: { userId } });
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="coord-enter mx-auto max-w-md space-y-5 pb-28">
      <UsersHeader back={<Link to="/administracion/usuarios/$userId" params={{ userId }}><BackLabel>Ficha</BackLabel></Link>} title="Editar datos" />
      <PersonFields value={value} onChange={setValue} withEmail={false} userId={userId} />
      {errors.length ? <ul className="space-y-1 text-sm text-urgency-red">{errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}
      <button onClick={save} disabled={saving} className="coord-press min-h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
