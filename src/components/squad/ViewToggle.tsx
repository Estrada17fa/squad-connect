import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/hooks/useViewMode";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  className?: string;
}

/** Toggle Grid / Lista, estilizado con tokens semánticos. */
export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Modo de vista"
      className={cn(
        "inline-flex items-center rounded-full border border-border/60 bg-white/[0.03] p-0.5",
        className,
      )}
    >
      <Btn active={value === "grid"} onClick={() => onChange("grid")} label="Cuadrícula">
        <LayoutGrid className="h-4 w-4" />
      </Btn>
      <Btn active={value === "list"} onClick={() => onChange("list")} label="Lista">
        <List className="h-4 w-4" />
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-8 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
