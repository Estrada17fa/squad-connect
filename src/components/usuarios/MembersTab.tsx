import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { inferBaseRole } from "@/lib/rolePages";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { Button } from "@/components/ui/button";
import { MemberForm } from "./MemberForm";
import {
  deactivateClubMember,
  hardDeleteClubMember,
  reactivateClubMember,
} from "@/lib/members.functions";
import { MemberCard } from "./MemberCard";
import { MemberDetailSheet } from "./MemberDetailSheet";
import { MembersFilters, EMPTY_FILTERS, type MembersFilterState } from "./MembersFilters";
import { AddMembershipDialog, type RoleRow, type TeamRow } from "./AddMembershipDialog";
import { displayName, type MemberProfile, type MembershipLite } from "./memberUtils";

/**
 * Pestaña Miembros: lista de personas (tarjetas con foto), filtros compactos y
 * ficha en sheet. `canEdit` = administra usuarios (editor global / super admin).
 */
export function MembersTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<MembersFilterState>(EMPTY_FILTERS);
  const [addOpen, setAddOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUserId, setEditUserId] = React.useState<string | null>(null);

  const deactivateFn = useServerFn(deactivateClubMember);
  const reactivateFn = useServerFn(reactivateClubMember);
  const hardDeleteFn = useServerFn(hardDeleteClubMember);

  const membersQ = useQuery({
    queryKey: ["club-members", clubId],
    queryFn: async (): Promise<MemberProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, first_name, paternal_last_name, maternal_last_name, name_completed, email, phone, avatar_url, status, created_at",
        )
        .eq("club_id", clubId)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as MemberProfile[];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["club-roles-min", clubId],
    queryFn: async (): Promise<RoleRow[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, is_system_default, allows_club_wide")
        .eq("club_id", clubId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const teamsQ = useQuery({
    queryKey: ["club-teams-min", clubId],
    queryFn: async (): Promise<TeamRow[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category")
        .eq("club_id", clubId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Todas las membresías del club en UNA consulta: alimenta las tarjetas de la
  // lista (rol, categoría, puesto) y la ficha, sin una consulta por persona.
  const membershipsQ = useQuery({
    queryKey: ["club-memberships-all", clubId],
    queryFn: async (): Promise<MembershipLite[]> => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(
          "id, user_id, team_id, role_id, job_title, role:roles!inner(id, name, club_id), team:teams(id, name)",
        )
        .eq("role.club_id", clubId);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        team_id: m.team_id,
        role_id: m.role_id,
        job_title: m.job_title,
        roleName: m.role?.name ?? null,
        teamName: m.team?.name ?? null,
      }));
    },
  });

  const byUser = React.useMemo(() => {
    const map = new Map<string, MembershipLite[]>();
    for (const m of membershipsQ.data ?? []) {
      const list = map.get(m.user_id) ?? [];
      list.push(m);
      map.set(m.user_id, list);
    }
    return map;
  }, [membershipsQ.data]);

  const jobTitles = React.useMemo(
    () =>
      Array.from(
        new Set((membershipsQ.data ?? []).map((m) => m.job_title).filter((j): j is string => !!j)),
      ).sort((a, b) => a.localeCompare(b)),
    [membershipsQ.data],
  );

  const filtered = React.useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return (membersQ.data ?? []).filter((m) => {
      if ((m.status ?? "activo") !== filters.status) return false;
      if (q) {
        const hay = `${displayName(m)} ${m.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const mems = byUser.get(m.id) ?? [];
      if (filters.roleId && !mems.some((x) => x.role_id === filters.roleId)) return false;
      if (filters.teamId) {
        const wantClub = filters.teamId === "__club__";
        if (!mems.some((x) => (wantClub ? x.team_id === null : x.team_id === filters.teamId)))
          return false;
      }
      if (filters.jobTitle && !mems.some((x) => x.job_title === filters.jobTitle)) return false;
      return true;
    });
  }, [membersQ.data, filters, byUser]);

  const selected = (membersQ.data ?? []).find((m) => m.id === selectedUserId) ?? null;
  const selectedMemberships = selectedUserId ? (byUser.get(selectedUserId) ?? []) : [];

  function refreshMembers() {
    qc.invalidateQueries({ queryKey: ["club-members", clubId] });
    qc.invalidateQueries({ queryKey: ["club-memberships-all", clubId] });
  }

  async function handleDeactivate(m: MemberProfile) {
    if (
      !confirm(
        `¿Dar de baja a ${displayName(m)}? Pierde el acceso pero se conserva todo su historial.`,
      )
    )
      return;
    try {
      await deactivateFn({ data: { user_id: m.id } });
      toast.success("Miembro dado de baja");
      refreshMembers();
      qc.invalidateQueries({ queryKey: ["roster"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo dar de baja");
    }
  }

  async function handleReactivate(m: MemberProfile) {
    try {
      await reactivateFn({ data: { user_id: m.id } });
      toast.success("Miembro reactivado");
      refreshMembers();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo reactivar");
    }
  }

  async function handleHardDelete(m: MemberProfile) {
    const name = displayName(m);
    const typed = prompt(
      `Esto elimina la cuenta de forma permanente.\nEscribe "${name}" para confirmar:`,
    );
    if (typed?.trim() !== name) return;
    try {
      const res = await hardDeleteFn({ data: { user_id: m.id } });
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      toast.success("Miembro eliminado");
      setSelectedUserId(null);
      refreshMembers();
      qc.invalidateQueries({ queryKey: ["roster"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar");
    }
  }

  if (membersQ.isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <MembersFilters
            value={filters}
            onChange={setFilters}
            roles={rolesQ.data ?? []}
            teams={teamsQ.data ?? []}
            jobTitles={jobTitles}
            count={filtered.length}
          />
        </div>
        {canEdit ? (
          <Button className="glow-primary sm:w-auto" onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Crear miembro
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin resultados"
          message="Ninguna persona coincide con los filtros aplicados."
        />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {filtered.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              memberships={byUser.get(m.id) ?? []}
              selected={selectedUserId === m.id}
              onClick={() => setSelectedUserId(m.id)}
            />
          ))}
        </div>
      )}

      {selected ? (
        <MemberDetailSheet
          open={!!selectedUserId && !editUserId}
          onOpenChange={(o) => !o && setSelectedUserId(null)}
          clubId={clubId}
          member={selected}
          memberships={selectedMemberships}
          canManage={canEdit}
          onEdit={() => setEditUserId(selected.id)}
          onAddMembership={() => setAddOpen(true)}
          onDeactivate={() => handleDeactivate(selected)}
          onReactivate={() => handleReactivate(selected)}
          onDelete={() => handleHardDelete(selected)}
        />
      ) : null}

      {selected ? (
        <AddMembershipDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          userId={selected.id}
          teams={teamsQ.data ?? []}
          roles={rolesQ.data ?? []}
          onAdded={refreshMembers}
        />
      ) : null}

      <MemberForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        clubId={clubId}
        roles={rolesQ.data ?? []}
        teams={teamsQ.data ?? []}
        onSaved={(id: string, roleName: string | null) => {
          refreshMembers();
          setSelectedUserId(id);
          const base = inferBaseRole(roleName);
          navigate({ to: "/m/plantel", search: { role: base } as any });
        }}
      />

      {editUserId ? (
        <MemberForm
          open={!!editUserId}
          onOpenChange={(o) => !o && setEditUserId(null)}
          clubId={clubId}
          roles={rolesQ.data ?? []}
          teams={teamsQ.data ?? []}
          userId={editUserId}
          onSaved={() => {
            setEditUserId(null);
            refreshMembers();
          }}
        />
      ) : null}
    </div>
  );
}
