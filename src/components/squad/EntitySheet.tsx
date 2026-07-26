import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * EntitySheet — Contenedor unificado para detalles y formularios de entidades.
 * - Móvil (< sm): bottom sheet con max-h 92dvh.
 * - Desktop: side sheet a la derecha (max-w-lg por defecto).
 * - Header/footer sticky, body con scroll, respeta safe-area.
 */

interface EntitySheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  /** Ancho máximo del sheet en desktop. */
  size?: "md" | "lg" | "xl";
}

const SIZE: Record<NonNullable<EntitySheetProps["size"]>, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

export function EntitySheet({ open, onOpenChange, children, size = "lg" }: EntitySheetProps) {
  const isMobile = useIsMobile();
  const sideClasses = isMobile
    ? "inset-x-0 bottom-0 w-full max-h-[92dvh] rounded-t-2xl border-t border-white/10 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
    : `inset-y-0 right-0 h-full w-full ${SIZE[size]} border-l border-white/10 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right`;

  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <SheetPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col bg-background shadow-2xl outline-none",
            "transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            sideClasses,
          )}
        >
          {/* Handle visual en móvil */}
          <div className="sm:hidden pt-2 pb-1 flex justify-center">
            <div className="h-1.5 w-10 rounded-full bg-white/15" />
          </div>
          <SheetPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </SheetPrimitive.Close>
          {children}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}

export function EntitySheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-white/5 px-5 pt-4 pb-3 pr-12 bg-background/95 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function EntitySheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn("font-display text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function EntitySheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("mt-1 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function EntitySheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4", className)}
      {...props}
    />
  );
}

export function EntitySheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-white/5 px-5 py-3 bg-background/95 backdrop-blur",
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:items-center",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  );
}
