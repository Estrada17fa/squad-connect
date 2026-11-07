import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { cn } from "@/lib/utils";

/**
 * Piezas del nuevo look para formularios y hojas de Coordinación › Viajes.
 * Solo presentación: cada formulario conserva su propia lógica de guardado.
 */

/** Clase de campo relleno, sin borde, ~44 px. */
export const fieldCls = "h-11 w-full rounded-xl border-0 bg-muted px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60";
export const areaCls = "min-h-[88px] w-full rounded-xl border-0 bg-muted px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/50";

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const TextField = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextField({ className, ...p }, ref) {
  return <input ref={ref} {...p} className={cn(fieldCls, className)} />;
});
export function TextArea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(areaCls, className)} />;
}

export function FormSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
      {children}
    </section>
  );
}

/** Control segmentado para opciones cortas. */
export function SegmentedField<T extends string>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" className="flex gap-0.5 rounded-xl bg-muted p-0.5">
      {items.map((it) => (
        <button key={it.key} type="button" role="radio" aria-checked={value === it.key} onClick={() => onChange(it.key)}
          className={cn("min-h-10 flex-1 rounded-[10px] px-2 text-xs font-semibold transition-colors", value === it.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Fecha + hora con el selector de la app. Valor en formato local "aaaa-mm-ddThh:mm" (o ""). */
export function DateTimeField({ value, onChange, placeholder = "Elegir fecha y hora", clearable }: { value: string; onChange: (v: string) => void; placeholder?: string; clearable?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const d = value ? new Date(value) : null;
  const valid = d && !isNaN(d.getTime()) ? d : null;
  const set = (base: Date, h: number, m: number) => onChange(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(h)}:${pad(m)}`);
  const label = valid ? (() => { const s = format(valid, "EEE d MMM · HH:mm", { locale: es }); return s.charAt(0).toUpperCase() + s.slice(1); })() : placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-2">
        <PopoverTrigger asChild>
          <button type="button" className={cn(fieldCls, "flex items-center gap-2 text-left", !valid && "text-muted-foreground")}>
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </button>
        </PopoverTrigger>
        {clearable && valid ? <button type="button" onClick={() => onChange("")} aria-label="Quitar fecha" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><X className="h-4 w-4" /></button> : null}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" locale={es} selected={valid ?? undefined} defaultMonth={valid ?? new Date()}
          onSelect={(day) => { if (day) set(day, valid ? valid.getHours() : 12, valid ? valid.getMinutes() : 0); }} />
        <div className="space-y-2 border-t border-border/40 p-3">
          <p className="text-xs font-semibold text-muted-foreground">Hora</p>
          <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
            {HOURS.map((h) => (
              <button key={h} type="button" onClick={() => set(valid ?? new Date(), h, valid ? valid.getMinutes() : 0)}
                className={cn("h-9 min-w-9 shrink-0 rounded-lg text-xs font-semibold", valid?.getHours() === h ? "bg-primary text-primary-foreground" : "bg-muted")}>{pad(h)}</button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {MINUTES.map((m) => (
              <button key={m} type="button" onClick={() => set(valid ?? new Date(), valid ? valid.getHours() : 12, m)}
                className={cn("h-9 rounded-lg text-xs font-semibold", valid?.getMinutes() === m ? "bg-primary text-primary-foreground" : "bg-muted")}>:{pad(m)}</button>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(false)} className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground">Listo</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Menú "⋯" con Editar / Eliminar (confirmación incluida). */
export function MoreMenu({ onEdit, onDelete, deleteLabel = "Eliminar", confirmTitle, confirmDescription, deleting, extra }: {
  onEdit?: (() => void) | null; onDelete?: (() => void) | null; deleteLabel?: string; confirmTitle?: string; confirmDescription?: string; deleting?: boolean;
  extra?: { label: string; icon?: typeof Pencil; onSelect: () => void }[];
}) {
  const [confirm, setConfirm] = React.useState(false);
  if (!onEdit && !onDelete && !extra?.length) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Más opciones" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><MoreHorizontal className="h-5 w-5" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {onEdit ? <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem> : null}
          {extra?.map((x) => { const I = x.icon; return <DropdownMenuItem key={x.label} onSelect={x.onSelect}>{I ? <I className="mr-2 h-4 w-4" /> : null}{x.label}</DropdownMenuItem>; })}
          {onDelete ? <DropdownMenuItem onSelect={() => setConfirm(true)}><Trash2 className="mr-2 h-4 w-4" /> {deleteLabel}</DropdownMenuItem> : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {onDelete ? (
        <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={confirmTitle ?? `¿${deleteLabel}?`} description={confirmDescription ?? "Esta acción no se puede deshacer."}
          loading={deleting} onConfirm={() => { onDelete(); setConfirm(false); }} />
      ) : null}
    </>
  );
}

/** Hoja base: X arriba a la izquierda, título, menú opcional y botón principal fijo abajo. */
export function TripSheet({ open, onOpenChange, title, menu, primary, children, back }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; menu?: React.ReactNode; back?: boolean;
  primary?: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean; loadingLabel?: string } | null;
  children: React.ReactNode;
}) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <SheetPrimitive.Content aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[22px] bg-background outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom">
          <div className="flex shrink-0 justify-center pt-2"><span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" /></div>
          <div className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-1">
            <SheetPrimitive.Close aria-label={back ? "Atrás" : "Cerrar"} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              {back ? <span className="text-2xl leading-none">‹</span> : <X className="h-5 w-5" />}
            </SheetPrimitive.Close>
            <SheetPrimitive.Title className="min-w-0 flex-1 truncate text-center font-display text-base font-semibold">{title}</SheetPrimitive.Title>
            <div className="flex h-10 w-10 items-center justify-center">{menu}</div>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">{children}</div>
          {primary ? (
            <div className="shrink-0 border-t border-border/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={primary.onClick} disabled={primary.disabled || primary.loading}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50">
                {primary.loading ? primary.loadingLabel ?? "Guardando…" : primary.label}
              </button>
            </div>
          ) : null}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}

/** Encabezado visual de una hoja de detalle. */
export function DetailHero({ icon: Icon, title, sub, badge }: { icon: typeof Pencil; title: React.ReactNode; sub?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-card p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Icon className="h-6 w-6" /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-lg font-semibold">{title}</div>
        {sub ? <div className="truncate text-sm text-muted-foreground">{sub}</div> : null}
      </div>
      {badge}
    </div>
  );
}

export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{children}</p>;
}
