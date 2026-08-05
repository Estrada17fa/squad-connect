import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface TeamMemberOption {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_name: string | null;
  job_title: string | null;
}

/** Miembros del equipo: membresías del equipo + membresías club-wide del mismo club. */
export function useTeamMembers(clubId: string | null | undefined, teamId: string | null | undefined) {
  return useQuery({
    queryKey: ["team-members", clubId ?? "none", teamId ?? "none"] as const,
    enabled: !!clubId && !!teamId,
    queryFn: async (): Promise<TeamMemberOption[]> => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(
          "user_id, team_id, job_title, profile:profiles!inner(id, full_name, email, avatar_url, club_id), role:roles!inner(name, allows_club_wide, club_id)",
        )
        .eq("profile.club_id", clubId!);
      if (error) throw error;
      const seen = new Set<string>();
      const out: TeamMemberOption[] = [];
      for (const row of (data ?? []) as any[]) {
        const p = row.profile;
        const role = row.role;
        if (!p || !role || role.club_id !== clubId) continue;
        const belongs = row.team_id === teamId || (row.team_id === null && role.allows_club_wide);
        if (!belongs || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          role_name: role.name ?? null,
          job_title: row.job_title ?? null,
        });
      }
      return out.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "es"));
    },
  });
}

export function initialsOf(name: string | null, email: string | null) {
  const base = (name ?? email ?? "?").trim();
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

interface Props {
  clubId: string;
  teamId: string;
  selectedIds: Set<string>;
  onToggle: (member: TeamMemberOption) => void;
  busyId?: string | null;
}

/** Buscador de miembros del equipo (jugadores y staff) para la convocatoria. */
export function TravelerPicker({ clubId, teamId, selectedIds, onToggle, busyId }: Props) {
  const [q, setQ] = React.useState("");
  const membersQ = useTeamMembers(clubId, teamId);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = membersQ.data ?? [];
    if (!s) return list;
    return list.filter(
      (m) =>
        (m.full_name ?? "").toLowerCase().includes(s) ||
        (m.email ?? "").toLowerCase().includes(s) ||
        (m.job_title ?? "").toLowerCase().includes(s),
    );
  }, [membersQ.data, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar miembro…" className="pl-9" />
      </div>

      {membersQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando miembros…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún miembro coincide con la búsqueda.</p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {filtered.map((m) => {
            const selected = selectedIds.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={busyId === m.id}
                  onClick={() => onToggle(m)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                    selected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 hover:bg-white/[0.04] disabled:opacity-50",
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">{initialsOf(m.full_name, m.email)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{m.full_name ?? m.email}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[m.role_name, m.job_title].filter(Boolean).join(" · ") || "Sin puesto"}
                    </span>
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
