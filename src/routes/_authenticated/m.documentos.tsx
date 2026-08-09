import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useDocuments, expiryStateOf, type DocumentRow } from "@/hooks/useDocuments";
import { DocumentCard } from "@/components/documentos/DocumentCard";
import {
  DocumentsFilters,
  EMPTY_DOC_FILTERS,
  applyDocumentFilters,
  type DocumentsFilterState,
} from "@/components/documentos/DocumentsFilters";
import { DocumentFormDialog } from "@/components/documentos/DocumentFormDialog";
import { DocumentDetailSheet } from "@/components/documentos/DocumentDetailSheet";

export const Route = createFileRoute("/_authenticated/m/documentos")({
  head: () => ({
    meta: [
      { title: "Squad — Documentos" },
      {
        name: "description",
        content: "Biblioteca de documentos del club: reglamentos, oficios, formatos y más.",
      },
      { property: "og:title", content: "Squad — Documentos" },
      {
        property: "og:description",
        content: "Consulta y administra los documentos generales del club por categoría.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentosPage,
});

function DocumentosPage() {
  const { profile, teamOptions, isSuperAdmin } = useApp();
  const clubId = profile?.club_id ?? null;
  const { canEditTeam, canReadTeam, levelForTeam } = useTeamAccess("documentos");

  // Vista Jugador: los documentos personales viven en el perfil, no aquí.
  const playerOnly =
    !isSuperAdmin &&
    levelForTeam(null) === "vista_jugador" &&
    teamOptions.every((t) => levelForTeam(t.id) === "vista_jugador");

  const readableTeams = React.useMemo(
    () => teamOptions.filter((t) => canReadTeam(t.id)),
    [teamOptions, canReadTeam],
  );
  const canReadAny = canReadTeam(null) || readableTeams.length > 0;
  const canCreate = canEditTeam(null) || teamOptions.some((t) => canEditTeam(t.id));

  const { data, isLoading } = useDocuments({ clubId, scope: "general" });
  const [filters, setFilters] = React.useState<DocumentsFilterState>(EMPTY_DOC_FILTERS);
  const [formOpen, setFormOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<DocumentRow | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const visible = React.useMemo(() => {
    const list = (data ?? []).filter((d) => canReadTeam(d.team_id));
    return applyDocumentFilters(list, filters, expiryStateOf);
  }, [data, filters, canReadTeam]);

  const openDoc = (doc: DocumentRow) => {
    setSelected(doc);
    setDetailOpen(true);
  };

  if (playerOnly || !canReadAny) {
    return (
      <div className="space-y-4">
        <PageHeader hideTitle title="Documentos" subtitle="Biblioteca del club" />
        <ModuleTabs activeKey="documentos" />
        <EmptyState
          icon={FileText}
          title="Sin acceso"
          message="Tus documentos personales aparecen en tu perfil."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader hideTitle title="Documentos" subtitle="Biblioteca del club" />
      <ModuleTabs activeKey="documentos" />

      <DocumentsFilters
        value={filters}
        onChange={setFilters}
        teams={readableTeams.filter((t) => !!t.id).map((t) => ({ id: t.id!, name: t.name }))}
        count={visible.length}
      />

      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos"
          message={
            filters.search || filters.type || filters.teamId || filters.vigencia !== "todos"
              ? "Ningún documento coincide con el filtro."
              : "Aún no hay documentos generales en tus categorías."
          }
          action={
            canCreate ? (
              <Button className="glow-primary" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Subir documento
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((d) => (
            <DocumentCard key={d.id} doc={d} onOpen={openDoc} />
          ))}
        </div>
      )}

      {canCreate ? (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          aria-label="Subir documento"
          className="glow-primary fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      ) : null}

      <DocumentFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <DocumentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        doc={selected}
        canEdit={selected ? canEditTeam(selected.team_id) : false}
      />
    </div>
  );
}
