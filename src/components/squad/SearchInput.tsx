import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const SearchInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={ref}
        {...props}
        className={cn(
          "input-search h-10 w-full pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus-visible:outline-none focus:[box-shadow:0_0_0_2px_hsl(150_100%_50%/0.35)]",
          className,
        )}
      />
    </div>
  );
});
SearchInput.displayName = "SearchInput";

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
}

export function FilterChips<T extends string = string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ChipOption<T>[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn("chip", active && "chip-active")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
