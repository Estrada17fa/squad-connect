import * as React from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EntitySheet, EntitySheetBody, EntitySheetHeader, EntitySheetTitle } from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { NewEventLauncher } from "@/components/calendar/NewEventLauncher";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { AGENDA_KINDS, type AgendaKind } from "@/lib/agenda";
import { cn } from "@/lib/utils";

export type AgendaTab = "proximo" | "mes" | "viajes";

const TABS: { key: AgendaTab; label: string; to: string; params?: Record<string, string> }[] = [
  { key: "proximo", label: "Agenda", to: "/m/$module", params: { module: "agenda" } },
  { key: "viajes", label: "Mis viajes", to: "/agenda-viajes" },
];

/**
 * Encabezado único de Agenda: título, categoría como texto, filtro de tipos,
 * "+" temporal (solo quien hoy puede crear eventos) y pestañas subrayadas.
 */
export function AgendaHeader({
  tab,
  category,
  onCategory,
  kinds,
  onKinds,
  showFilter = true,
  defaultDate,
}: {
  tab: AgendaTab;
  category: string | null;
  onCategory: (id: string | null) => void;
  kinds?: AgendaKind[];
  onKinds?: (k: AgendaKind[]) => void;
  showFilter?: boolean;
  defaultDate?: Date;
}) {
  const { user, profile, teamOptions } = useApp();
  const editableTeams = useEditableTeams(tab === "mes" ? "mes" : "agenda");
  const [catOpen, setCatOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const teams = teamOptions.filter((t) => t.id);
  const label = category ? teams.find((t) => t.id === category)?.name ?? "Mi categoría" : teams.length === 1 ? teams[0].name : "Todas mis categorías";
  const active = (kinds?.length ?? 0) > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight">Agenda</h1>
          {teams.length > 1 ? (
            <Popover open={catOpen} onOpenChange={setCatOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  {label} <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-60 p-1.5">
                {[{ id: null as string | null, name: "Todas mis categorías" }, ...teams.map((t) => ({ id: t.id as string | null, name: t.name }))].map((o) => (
                  <button
                    key={o.id ?? "all"}
                    type="button"
                    onClick={() => { onCategory(o.id); setCatOpen(false); }}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm hover:bg-muted"
                  >
                    {o.name}
                    {category === o.id ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          ) : teams.length === 1 ? (
            <p className="text-xs text-muted-foreground">{label}</p>
          ) : null}
        </div>
        <div className="-mr-2 -mt-1.5 flex items-center">
          {showFilter && onKinds ? (
            <button type="button" aria-label="Filtrar tipos" onClick={() => setFilterOpen(true)} className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
              <SlidersHorizontal className="h-5 w-5" />
              {active ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" /> : null}
            </button>
          ) : null}
          <Link to={"/m/$module" as any} params={{ module: "mes" } as any} aria-label="Ver mes" className={cn("flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted", tab === "mes" && "text-primary")}>
            <CalendarDays className="h-5 w-5" />
          </Link>
          <NewEventLauncher variant="icon" clubId={profile?.club_id ?? null} userId={user.id} genericTeams={editableTeams} defaultTeamId={category} defaultDate={defaultDate} />
        </div>
      </div>

      <nav className="flex gap-5 border-b border-border/60">
        {TABS.map((t) => (
          <Link
            key={t.key}
            to={t.to as any}
            params={t.params as any}
            className={cn(
              "-mb-px border-b-2 pb-2 text-sm font-semibold transition-colors",
              tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {onKinds ? (
        <EntitySheet open={filterOpen} onOpenChange={setFilterOpen}>
          <EntitySheetHeader>
            <EntitySheetTitle>Tipos de evento</EntitySheetTitle>
          </EntitySheetHeader>
          <EntitySheetBody>
            <div className="space-y-1">
              {AGENDA_KINDS.map((k) => {
                const on = kinds?.includes(k.key) ?? false;
                return (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => onKinds(on ? (kinds ?? []).filter((x) => x !== k.key) : [...(kinds ?? []), k.key])}
                    className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-sm font-medium hover:bg-muted"
                  >
                    {k.label}
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                      {on ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => onKinds([])}>Limpiar</Button>
              <Button className="flex-1" onClick={() => setFilterOpen(false)}>Listo</Button>
            </div>
          </EntitySheetBody>
        </EntitySheet>
      ) : null}
    </div>
  );
}
