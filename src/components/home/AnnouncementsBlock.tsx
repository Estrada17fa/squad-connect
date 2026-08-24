import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { useApp } from "@/components/squad/AppLayout";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { ANNOUNCEMENT_ACCENT } from "@/lib/accents";
import { AccentBar } from "@/components/squad/StandardCard";
import { PriorityBadge } from "@/components/comunicados/ComunicadosPieces";
import { formatShortDate } from "@/lib/calendar-utils";
import { HomeSection } from "./HomeSection";

/**
 * Bloque 4 de Inicio: últimos comunicados dirigidos a la persona.
 * La RLS de `announcements` ya limita las filas a su club/categoría; aquí
 * solo se recortan a los tres más recientes y se destacan los no leídos.
 */
export function AnnouncementsBlock() {
  const navigate = useNavigate();
  const { user, profile, accessibleModules } = useApp();
  const clubId = profile?.club_id ?? null;
  const enabled = accessibleModules.includes("comunicados");
  const { data } = useAnnouncements(enabled ? clubId : null, user.id);

  const recent = (data ?? []).slice(0, 3);
  if (!enabled || !recent.length) return null;

  const go = () => navigate({ to: "/m/$module", params: { module: "comunicados" } });

  return (
    <HomeSection icon={Megaphone} title="Comunicados" actionLabel="Ver todos" onAction={go}>
      <div className="space-y-2">
        {recent.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={go}
            style={{ animationDelay: `${i * 30}ms` }}
            className="glass animate-card-in relative w-full overflow-hidden py-3 pl-5 pr-3 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
          >
            <AccentBar color={ANNOUNCEMENT_ACCENT[a.priority]} />
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!a.read ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />
                  ) : null}
                  <h3
                    className={
                      a.read
                        ? "truncate font-display text-sm font-medium text-foreground"
                        : "truncate font-display text-sm font-semibold text-foreground"
                    }
                  >
                    {a.title}
                  </h3>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatShortDate(a.published_at)}
                  {a.audience === "club"
                    ? " · Todo el club"
                    : a.teams.length
                      ? ` · ${a.teams.map((t) => t.name).filter(Boolean).join(", ")}`
                      : ""}
                </p>
              </div>
              {a.priority !== "normal" ? (
                <div className="shrink-0">
                  <PriorityBadge priority={a.priority} />
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </HomeSection>
  );
}
