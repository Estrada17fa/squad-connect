import * as React from "react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { REQUEST_TYPES, type RequestType } from "@/lib/requestTypes";
import { cn } from "@/lib/utils";

export function RequestTypePicker({
  open,
  onOpenChange,
  allowedTypes,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  allowedTypes: RequestType[];
  onPick: (t: RequestType) => void;
}) {
  const types = REQUEST_TYPES.filter((t) => allowedTypes.includes(t.key));
  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>Nueva solicitud</EntitySheetTitle>
        <EntitySheetDescription>Elige el tipo de solicitud que quieres crear.</EntitySheetDescription>
      </EntitySheetHeader>
      <EntitySheetBody>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {types.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onPick(t.key)}
                className={cn(
                  "glass flex items-start gap-3 p-3 text-left transition-all",
                  "hover:border-primary/40 hover:bg-primary/[0.06] active:scale-[0.99]",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-semibold text-foreground">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </EntitySheetBody>
    </EntitySheet>
  );
}
