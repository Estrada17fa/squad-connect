import * as React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass flex flex-col items-center justify-center gap-4 px-6 py-14 text-center animate-card-in",
        className,
      )}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-primary"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, hsl(150 100% 50% / 0.22), hsl(150 100% 50% / 0.02) 70%, transparent 100%)",
          boxShadow: "inset 0 0 0 1px hsl(150 100% 50% / 0.18)",
        }}
      >
        <Icon className="h-7 w-7 drop-shadow-[0_0_10px_hsl(150_100%_50%/0.55)]" />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        {message ? (
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{message}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
