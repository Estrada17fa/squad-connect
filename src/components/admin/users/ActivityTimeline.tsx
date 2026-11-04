import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, UserMinus, RefreshCw, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GroupCard } from "./ui";
import { shortName, type AdminMember, type AdminRole, type AdminTeam } from "@/hooks/useAdminUsers";

interface AuditRow {
  id: string;
  action: "insert" | "update" | "delete";
  actor_id: string | null;
  target_user_id: string;
  role_id: string | null;
  team_id: string | null;
  created_at: string;
}

export function useAudit(clubId: string | null | undefined, userId?: string, limit = 150) {
  return useQuery({
    queryKey: ["adm-audit", clubId, userId ?? "all", limit],
    enabled: !!clubId,
    queryFn: async (): Promise<AuditRow[]> => {
      let q = supabase.from("membership_audit_log").select("*").eq("club_id", clubId!).order("created_at", { ascending: false }).limit(limit);
      if (userId) q = q.eq("target_user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });
}

const ICON = { insert: UserPlus, delete: UserMinus, update: RefreshCw };

export function ActivityTimeline({
  rows, members, roles, teams, showTarget = true,
}: { rows: AuditRow[]; members: AdminMember[]; roles: AdminRole[]; teams: AdminTeam[]; showTarget?: boolean }) {
  const mName = React.useMemo(() => new Map(members.map((m) => [m.id, shortName(m)])), [members]);
  const rName = React.useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);
  const tName = React.useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  const groups = React.useMemo(() => {
    const out: { day: string; items: AuditRow[] }[] = [];
    for (const r of rows) {
      const day = new Date(r.created_at).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(r);
      else out.push({ day, items: [r] });
    }
    return out;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <History className="h-8 w-8 text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Aún no hay cambios registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.day}>
          <h3 className="mb-1.5 px-1 text-xs font-semibold capitalize text-muted-foreground">{g.day}</h3>
          <GroupCard>
            {g.items.map((r) => {
              const I = ICON[r.action] ?? RefreshCw;
              const who = mName.get(r.target_user_id) ?? "Persona eliminada";
              const role = r.role_id ? rName.get(r.role_id) ?? "rol" : "rol";
              const team = r.team_id ? tName.get(r.team_id) ?? "categoría" : "Todo el club";
              const verb = r.action === "insert" ? "→" : r.action === "delete" ? "salió de" : "ahora";
              const phrase =
                r.action === "delete"
                  ? `${showTarget ? who + " " : ""}${verb} ${team} (${role})`
                  : `${showTarget ? who + " " : ""}${verb} ${role} en ${team}`;
              const actor = r.actor_id ? mName.get(r.actor_id) ?? "Sistema" : "Sistema";
              return (
                <div key={r.id} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <I className="h-[15px] w-[15px] text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium [overflow-wrap:anywhere]">{phrase}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {actor} · {new Date(r.created_at).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </span>
                </div>
              );
            })}
          </GroupCard>
        </section>
      ))}
    </div>
  );
}
