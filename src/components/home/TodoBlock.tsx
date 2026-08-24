import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, ChevronRight, ClipboardList, ListChecks, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { useRequests } from "@/hooks/useRequests";
import { useMyApproverTypes } from "@/hooks/useRequestApprovers";
import { useTasks } from "@/hooks/useCoordinacion";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { ACCENT } from "@/lib/accents";
import { AccentBar } from "@/components/squad/StandardCard";
import { HomeSection } from "./HomeSection";

interface TodoItem {
  key: string;
  icon: LucideIcon;
  accent: string;
  label: string;
  hint: string;
  onClick: () => void;
}

/**
 * Bloque 3 de Inicio: "Por atender". Condicional — si la persona no tiene
 * nada pendiente, el bloque no se renderiza.
 *
 * No hay lógica de permisos nueva: cada conteo sale de los mismos hooks que
 * usan los módulos (RLS + aprobadores efectivos + asignaciones propias).
 */
export function TodoBlock() {
  const navigate = useNavigate();
  const { user, profile, accessibleModules, isSuperAdmin, getModuleAccess } = useApp();
  const clubId = profile?.club_id ?? null;

  const hasRequests = accessibleModules.includes("solicitudes");
  const hasCoord = accessibleModules.includes("coordinacion_interna");
  const hasAnnouncements = accessibleModules.includes("comunicados");

  const requestsQ = useRequests(hasRequests ? clubId : null);
  const approverTypes = useMyApproverTypes(
    hasRequests ? clubId : null,
    hasRequests ? user.id : null,
    isSuperAdmin,
    getModuleAccess,
  );
  const tasksQ = useTasks(hasCoord ? clubId : null);
  const announcementsQ = useAnnouncements(hasAnnouncements ? clubId : null, user.id);

  const toApprove = React.useMemo(
    () =>
      (requestsQ.data ?? []).filter(
        (r) => r.status === "pendiente" && r.requester_id !== user.id && approverTypes.has(r.type),
      ).length,
    [requestsQ.data, approverTypes, user.id],
  );

  const pendingTasks = React.useMemo(
    () =>
      (tasksQ.data ?? []).filter(
        (t) => t.status !== "completada" && t.assignees.some((a) => a?.id === user.id),
      ).length,
    [tasksQ.data, user.id],
  );

  const unread = React.useMemo(
    () => (announcementsQ.data ?? []).filter((a) => !a.read).length,
    [announcementsQ.data],
  );

  const items: TodoItem[] = [];
  if (toApprove > 0) {
    items.push({
      key: "requests",
      icon: ClipboardList,
      accent: ACCENT.mid,
      label: `${toApprove} solicitud${toApprove === 1 ? "" : "es"} por aprobar`,
      hint: "Revisa y decide en Solicitudes",
      onClick: () => navigate({ to: "/m/$module", params: { module: "solicitudes" } }),
    });
  }
  if (pendingTasks > 0) {
    items.push({
      key: "tasks",
      icon: ListChecks,
      accent: ACCENT.info,
      label: `${pendingTasks} tarea${pendingTasks === 1 ? "" : "s"} pendiente${pendingTasks === 1 ? "" : "s"}`,
      hint: "Asignadas a ti en Coordinación",
      onClick: () => navigate({ to: "/m/$module", params: { module: "coordinacion_interna" } }),
    });
  }
  if (unread > 0) {
    items.push({
      key: "announcements",
      icon: Megaphone,
      accent: ACCENT.brand,
      label: `${unread} comunicado${unread === 1 ? "" : "s"} sin leer`,
      hint: "Del club o de tu categoría",
      onClick: () => navigate({ to: "/m/$module", params: { module: "comunicados" } }),
    });
  }

  if (!items.length) return null;

  return (
    <HomeSection icon={Bell} title="Por atender">
      <div className="space-y-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              style={{ animationDelay: `${i * 30}ms` }}
              className="glass animate-card-in relative flex w-full items-center gap-3 overflow-hidden py-3 pl-5 pr-3 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
            >
              <AccentBar color={item.accent} />
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${item.accent}1f`, color: item.accent }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-semibold text-foreground">
                  {item.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </HomeSection>
  );
}
