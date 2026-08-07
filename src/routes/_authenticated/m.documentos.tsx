import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, Search, AlertTriangle, CalendarClock, User as UserIcon, Users as UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState, CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/squad/AppLayout";
import {
  useDocuments,
  DOCUMENT_CATEGORIES,
  CATEGORY_LABEL,
  expiryStateOf,
  type DocumentCategory,
  type DocumentRow,
} from "@/hooks/useDocuments";
import { DocumentFormDialog } from "@/components/documentos/DocumentFormDialog";
import { DocumentDetailSheet } from "@/components/documentos/DocumentDetailSheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/documentos")({
  head: () => ({
    meta: [
      { title: "Squad — Documentos" },
      { name: "description", content: "Biblioteca de documentos del club: contratos, permisos, actas y más." },
    ],
  }),
  component: DocumentosPage,
});

function DocumentosPage() {
  const { profile, getModuleAccess, isSuperAdmin } = useApp();
  const clubId = profile?.club_id ?? null;
  const level = getModuleAccess("documentos");
  const canRead = isSuperAdmin || level === "read" || level === "editor" || level === "approver";
  const canEdit = isSuperAdmin || level === "editor" || level === "approver";

  const { data, isLoading } = useDocuments({ clubId });
  const [query, setQuery] = React.useState("");
  const [activeCats, setActiveCats] = React.useState<Set<DocumentCategory>>(new Set());
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DocumentRow | null>(null);
  const [preview, setPreview] = React.useState<DocumentRow | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((d) => {
      if (activeCats.size && !activeCats.has(d.category)) return false;
      if (!q) return true;
      const hay = [
        d.title,
        d.description ?? "",
        d.related_user?.full_name ?? "",
        d.team?.name ?? "",
        ...(d.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, query, activeCats]);

  const toggleCat = (c: DocumentCategory) => {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const openEdit = (doc: DocumentRow) => {
    setEditing(doc);
    setFormOpen(true);
    setPreviewOpen(false);
  };
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader hideTitle title="Documentos" subtitle="Biblioteca del club" />
      <ModuleTabs activeKey="documentos" />

      {!canRead ? (
        <EmptyState icon={FileText} title="Sin acceso" message="Tu rol actual no tiene permisos para ver documentos." />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, persona, etiqueta…"
              className="pl-9"
            />
          </div>

          <div className="-mx-1 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-1 pb-1">
              {DOCUMENT_CATEGORIES.map((c) => {
                const active = activeCats.has(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCat(c.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors whitespace-nowrap",
                      active
                        ? "bg-primary text-primary-foreground ring-primary/40"
                        : "bg-white/5 text-muted-foreground ring-white/10 hover:bg-white/[0.08]",
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
              {activeCats.size ? (
                <button
                  type="button"
                  onClick={() => setActiveCats(new Set())}
                  className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>

          {canEdit ? (
            <Button onClick={openNew} className="w-full glow-primary">
              <Plus className="h-4 w-4 mr-2" /> Subir documento
            </Button>
          ) : null}


          {isLoading ? (
            <CardGridSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={data && data.length ? "Sin resultados" : "Sin documentos"}
              message={
                data && data.length
                  ? "Ajusta la búsqueda o quita filtros."
                  : canEdit
                    ? "Sube el primer documento del club."
                    : "Aún no hay documentos disponibles."
              }
              action={
                canEdit && !(data && data.length) ? (
                  <Button onClick={openNew}>
                    <Plus className="h-4 w-4 mr-2" /> Subir documento
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onOpen={() => {
                    setPreview(doc);
                    setPreviewOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <DocumentFormDialog open={formOpen} onOpenChange={setFormOpen} existing={editing} />
      <DocumentDetailSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        doc={preview}
        canEdit={canEdit}
        onEdit={openEdit}
      />
    </div>
  );
}

function DocCard({ doc, onOpen }: { doc: DocumentRow; onOpen: () => void }) {
  const expiry = expiryStateOf(doc.expiry_date);
  const status =
    expiry === "expired"
      ? { label: "Vencido", variant: "rejected" as const }
      : expiry === "soon"
        ? { label: "Vence pronto", variant: "pending" as const }
        : { label: CATEGORY_LABEL[doc.category], variant: "info" as const };

  return (
    <StandardCard
      interactive
      onClick={onOpen}
      icon={FileText}
      title={doc.title}
      subtitle={doc.description ?? CATEGORY_LABEL[doc.category]}
      status={status}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {doc.related_user?.full_name ? (
          <span className="inline-flex items-center gap-1">
            <UserIcon className="h-3 w-3" /> {doc.related_user.full_name}
          </span>
        ) : null}
        {doc.team?.name ? (
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="h-3 w-3" /> {doc.team.name}
          </span>
        ) : null}
        {doc.expiry_date ? (
          <span className={cn("inline-flex items-center gap-1", expiry === "expired" && "text-status-rejected")}>
            {expiry === "expired" ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
            Vence {doc.expiry_date}
          </span>
        ) : null}
      </div>
    </StandardCard>
  );
}
