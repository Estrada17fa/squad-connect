import * as React from "react";
import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPES, type DocumentCategory } from "@/hooks/useDocuments";

export type DocumentVigencia = "todos" | "por_vencer" | "vencidos";

export interface DocumentsFilterState {
  search: string;
  vigencia: DocumentVigencia;
  teamId: string | null;
  type: DocumentCategory | null;
}

export const EMPTY_DOC_FILTERS: DocumentsFilterState = {
  search: "",
  vigencia: "todos",
  teamId: null,
  type: null,
};

const ALL = "__all__";
const CLUB = "__club__";

const SEGMENTS: { value: DocumentVigencia; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vencidos", label: "Vencidos" },
];

/** Mismo patrón que Usuarios: buscador + panel "Filtrar" + segmentos. */
export function DocumentsFilters({
  value,
  onChange,
  teams,
  count,
  showTeamFilter = true,
}: {
  value: DocumentsFilterState;
  onChange: (v: DocumentsFilterState) => void;
  teams: { id: string; name: string }[];
  count: number;
  showTeamFilter?: boolean;
}) {
  const activeCount = (value.teamId ? 1 : 0) + (value.type ? 1 : 0);
  const set = (patch: Partial<DocumentsFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Buscar documento"
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" className="shrink-0">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filtrar</span>
              {activeCount > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[11px] font-semibold text-primary">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            {showTeamFilter ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select
                  value={value.teamId ?? ALL}
                  onValueChange={(v) => set({ teamId: v === ALL ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas las categorías</SelectItem>
                    <SelectItem value={CLUB}>Todo el club</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={value.type ?? ALL}
                onValueChange={(v) => set({ type: v === ALL ? null : (v as DocumentCategory) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los tipos</SelectItem>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={activeCount === 0}
              onClick={() => set({ teamId: null, type: null })}
            >
              <X className="mr-2 h-3.5 w-3.5" /> Limpiar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-lg border border-border/60 p-1">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => set({ vigencia: s.value })}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                value.vigencia === s.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {count} {count === 1 ? "documento" : "documentos"}
        </span>
      </div>
    </div>
  );
}

/** Filtro cliente compartido por el módulo y las secciones de perfil. */
export function applyDocumentFilters<
  T extends {
    title: string;
    description: string | null;
    category: DocumentCategory;
    team_id: string | null;
    expiry_date: string | null;
    tags: string[] | null;
    related_user?: { full_name: string | null } | null;
    team?: { name: string } | null;
  },
>(list: T[], f: DocumentsFilterState, expiryStateOf: (d: string | null) => string): T[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((d) => {
    if (f.type && d.category !== f.type) return false;
    if (f.teamId === CLUB && d.team_id !== null) return false;
    if (f.teamId && f.teamId !== CLUB && d.team_id !== f.teamId) return false;
    if (f.vigencia === "vencidos" && expiryStateOf(d.expiry_date) !== "expired") return false;
    if (f.vigencia === "por_vencer" && expiryStateOf(d.expiry_date) !== "soon") return false;
    if (!q) return true;
    return [d.title, d.description ?? "", d.related_user?.full_name ?? "", d.team?.name ?? "", ...(d.tags ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}
