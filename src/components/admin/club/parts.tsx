import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Hoja desde abajo (un solo dato) o pantalla completa (listas/formularios largos). */
export function ClubSheet({
  open, onOpenChange, title, description, full, children,
}: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "mx-auto max-w-lg overflow-y-auto rounded-t-[20px] border-0 bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-5",
          full ? "h-[92dvh]" : "max-h-[85dvh]",
        )}
      >
        <SheetHeader className="mb-3 text-left">
          <SheetTitle className="font-display text-lg">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title}</SheetDescription>}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** Fila de ajustes: etiqueta a la izquierda, valor gris a la derecha. */
export function ValueRow({ label, value, onClick, disabled }: { label: React.ReactNode; value?: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className="coord-press flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left outline-none hover:bg-muted/40 focus-visible:bg-muted/50 disabled:hover:bg-transparent"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      {value !== undefined ? <span className="min-w-0 max-w-[55%] truncate text-right text-sm text-muted-foreground">{value}</span> : null}
      {onClick && !disabled ? <span aria-hidden className="text-muted-foreground/60">›</span> : null}
    </button>
  );
}

/** Lista de opciones en hoja: una por fila, con marca en la elegida. */
export function OptionList<T extends string | number>({
  options, value, onPick,
}: { options: { value: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="divide-y divide-border/40 overflow-hidden rounded-[14px] bg-background/60">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onPick(o.value)}
          className="coord-press flex min-h-12 w-full items-center justify-between px-3 text-left text-sm outline-none hover:bg-muted/40"
        >
          <span>{o.label}</span>
          {o.value === value ? <span className="font-bold text-primary">✓</span> : null}
        </button>
      ))}
    </div>
  );
}
