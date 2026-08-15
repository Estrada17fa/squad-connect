import * as React from "react";
import { Pencil } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * DetailSheet — patrón universal "abrir = ver, editar = acción deliberada".
 *
 * Siempre abre en modo LECTURA. Si `canEdit`, muestra el botón "Editar" en la
 * cabecera que cambia al modo edición. `renderEdit` recibe `done()` para volver
 * a lectura tras guardar y `cancel()` para descartar.
 */

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  canEdit?: boolean;
  size?: "md" | "lg" | "xl";
  /** Acciones no destructivas/estado visibles en modo lectura (junto a "Editar"). */
  headerActions?: React.ReactNode;
  /** Foto/avatar/escudo a buen tamaño en la cabecera. */
  media?: React.ReactNode;
  /** Icono de tipo (se usa si no hay `media`). */
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  /** Color de acento (var CSS o hsl) para el icono y la barra superior. */
  accent?: string;
  /** Badges de estado/tipo bajo el título. */
  badges?: React.ReactNode;
  /** Ficha de información (modo lectura). */
  children: React.ReactNode;
  /** Formulario del modo edición. */
  renderEdit?: (helpers: { done: () => void; cancel: () => void }) => React.ReactNode;
  /** Pie del modo lectura. Por defecto un botón "Cerrar". */
  footer?: React.ReactNode;
  editLabel?: string;
}


export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  canEdit,
  size = "lg",
  headerActions,
  media,
  icon: Icon,
  accent,
  badges,
  children,
  renderEdit,
  footer,
  editLabel = "Editar",
}: DetailSheetProps) {
  const [editing, setEditing] = React.useState(false);

  // Al abrir (o cambiar de elemento) siempre volvemos a lectura.
  React.useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);
  React.useEffect(() => {
    if (open) setEditing(false);
  }, [open]);

  const showEdit = editing && !!renderEdit && !!canEdit;
  const showActions = !showEdit && ((canEdit && renderEdit) || !!headerActions);

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size={size}>
      <EntitySheetHeader className="pb-4">
        {accent ? (
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
          />
        ) : null}
        <div className="flex items-start gap-3">
          {media ? (
            <div className="shrink-0">{media}</div>
          ) : Icon ? (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: accent ? `color-mix(in oklab, ${accent} 18%, transparent)` : undefined,
              }}
            >
              <Icon className="h-6 w-6" style={{ color: accent }} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <EntitySheetTitle className="text-xl leading-tight">{title}</EntitySheetTitle>
            {description ? <EntitySheetDescription>{description}</EntitySheetDescription> : null}
            {badges ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div> : null}
          </div>
        </div>
        {showActions ? (
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {canEdit && renderEdit ? (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> {editLabel}
              </Button>
            ) : null}
            {headerActions}
          </div>
        ) : null}
      </EntitySheetHeader>


      {showEdit ? (
        <>{renderEdit!({ done: () => setEditing(false), cancel: () => setEditing(false) })}</>
      ) : (
        <>
          <EntitySheetBody>{children}</EntitySheetBody>
          {footer !== undefined ? (
            footer ? <EntitySheetFooter>{footer}</EntitySheetFooter> : null
          ) : (
            <EntitySheetFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </EntitySheetFooter>
          )}
        </>
      )}
    </EntitySheet>
  );
}

/* ---------------------------------- Primitivas de lectura --------------------------------- */

export function DetailSection({
  title,
  icon: Icon,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Acción opcional alineada a la derecha del encabezado. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3 border-t border-white/5 pt-4 first:border-0 first:pt-0", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
            <span className="truncate">{title}</span>
          </h3>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}


export function DetailField({
  label,
  icon: Icon,
  children,
  className,
  full,
}: {
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  /** Ocupa el ancho completo de la rejilla (correo, dirección, notas…). */
  full?: boolean;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", full && "sm:col-span-2", className)}>
      <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 break-words text-sm text-foreground [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

export function DetailGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>{children}</div>;
}

export function DetailEmpty({ children = "—" }: { children?: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

export function DetailValue({ value }: { value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return <DetailEmpty />;
  return <span className="block whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{String(value)}</span>;
}

/** Dato accionable (correo/teléfono) con el mismo corte de palabras largas. */
export function DetailLink({
  value,
  type = "email",
  className,
}: {
  value?: string | null;
  type?: "email" | "tel";
  className?: string;
}) {
  if (!value) return <DetailEmpty />;
  const href = type === "email" ? `mailto:${value}` : `tel:${value.replace(/\s+/g, "")}`;
  return (
    <a
      href={href}
      className={cn(
        "block break-words text-primary underline-offset-4 hover:underline [overflow-wrap:anywhere]",
        className,
      )}
    >
      {value}
    </a>
  );
}

/* ------------------------------ Mini-tarjetas y vacíos ----------------------------- */

/**
 * Mini-tarjeta escaneable para elementos repetidos dentro de una ficha
 * (una lesión, un gasto, un partido, un comentario, un vuelo…).
 */
export function DetailItemCard({
  icon: Icon,
  accent,
  title,
  subtitle,
  meta,
  badge,
  onClick,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Dato a la derecha (hora, monto, cantidad). */
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button", onClick } : {})}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left",
        onClick && "transition-colors hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.995]",
        className,
      )}
    >
      {accent ? <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} /> : null}
      <div className={cn("flex items-start gap-3", accent && "pl-2")}>
        {Icon ? (
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]"
            style={accent ? { backgroundColor: `color-mix(in oklab, ${accent} 16%, transparent)` } : undefined}
          >
            <Icon className="h-4 w-4" style={accent ? { color: accent } : undefined} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title}</span>
            {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
          {badge ? <div className="mt-1.5 flex flex-wrap gap-1.5">{badge}</div> : null}
          {children ? <div className="mt-2 text-sm text-foreground">{children}</div> : null}
        </div>
      </div>
    </Comp>
  );
}

/** Estado vacío suave dentro de una sección de la ficha. */
export function DetailEmptyBlock({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-white/8 bg-white/[0.02] px-3 py-4 text-sm text-muted-foreground">
      {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-70" /> : null}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** Badge de color para la cabecera y las mini-tarjetas. */
export function DetailBadge({
  color,
  icon: Icon,
  children,
  className,
}: {
  color?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-foreground",
        className,
      )}
      style={
        color
          ? {
              backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
              borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
              color,
            }
          : undefined
      }
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}
