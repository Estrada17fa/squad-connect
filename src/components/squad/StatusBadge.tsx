import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant = "pending" | "approved" | "rejected" | "info";

const styles: Record<StatusVariant, string> = {
  pending: "bg-status-pending text-status-pending-foreground",
  approved: "bg-status-approved text-status-approved-foreground",
  rejected: "bg-status-rejected text-status-rejected-foreground",
  info: "bg-status-info text-status-info-foreground",
};

export function StatusBadge({
  variant,
  className,
  children,
}: {
  variant: StatusVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-white/5",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
