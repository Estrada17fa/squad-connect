import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/squad/EmptyState";
import { LoadingState } from "@/components/squad/LoadingState";
import { useNotifications, type NotificationRow } from "@/hooks/useNotifications";
import { notificationTarget } from "@/lib/notificationTargets";
import { cn } from "@/lib/utils";

function relativeTime(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const days = Math.round(h / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(new Date(iso));
}

type NotificationsApi = ReturnType<typeof useNotifications>;

export function NotificationPanel({
  open,
  onOpenChange,
  canOpenModule,
  api,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** true si el usuario todavía tiene acceso a ese módulo. */
  canOpenModule: (key: string) => boolean;
  /** Se comparte una sola instancia del hook para no duplicar el canal realtime. */
  api: NotificationsApi;
}) {
  const navigate = useNavigate();
  const { items, isLoading, markRead, markAllRead, unreadCount } = api;


  async function handleClick(n: NotificationRow) {
    await markRead(n.id);
    const target = notificationTarget(n);
    if (!target) {
      toast.info("Esta notificación ya no tiene un elemento asociado.");
      return;
    }
    if (!canOpenModule(target.module)) {
      toast.info("Ya no tienes acceso a este módulo.");
      return;
    }
    onOpenChange(false);
    navigate({ to: target.to as any, search: target.search as any });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="glass w-full border-l border-border/60 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/50 px-5 py-4">
          <SheetTitle className="flex items-center justify-between gap-3 text-left">
            <span className="font-display">Notificaciones</span>
            {unreadCount > 0 ? (
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => markAllRead()}>
                <CheckCheck className="mr-1.5 h-4 w-4" /> Marcar todas
              </Button>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        <div className="max-h-[calc(100dvh-70px)] overflow-y-auto px-3 py-3">
          {isLoading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="Sin notificaciones"
              message="Aquí verás avisos de solicitudes, tareas, juntas y préstamos."
            />
          ) : (
            <ul className="space-y-2">
              {items.map((n) => {
                const unread = !n.read_at;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                        unread
                          ? "border-primary/35 bg-primary/[0.07] hover:bg-primary/[0.12]"
                          : "border-border/50 hover:bg-white/[0.04]",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {unread ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(150_100%_50%/0.9)]" />
                        ) : (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm text-foreground",
                              unread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {n.title}
                          </p>
                          {n.body ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                          ) : null}
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {relativeTime(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NotificationBell({
  userId,
  canOpenModule,
}: {
  userId: string;
  canOpenModule: (key: string) => boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const api = useNotifications(userId);
  const { unreadCount } = api;

  return (
    <>
      <button
        type="button"
        aria-label={`Notificaciones${unreadCount ? ` (${unreadCount} sin leer)` : ""}`}
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-foreground hover:bg-white/10"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      <NotificationPanel open={open} onOpenChange={setOpen} api={api} canOpenModule={canOpenModule} />
    </>
  );
}
