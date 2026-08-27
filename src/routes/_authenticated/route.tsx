import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/squad/AppLayout";
import { LoadingState } from "@/components/squad/LoadingState";
import { resolveSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Espera a que la sesión guardada quede resuelta (arranque en frío, PWA,
    // red lenta) antes de decidir. Solo se redirige si de verdad no hay sesión.
    const session = await resolveSession();
    if (!session?.user) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingState label="Cargando tu sesión..." />
    </div>
  ),
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  return <AppLayout user={{ id: user.id, email: user.email }} />;
}
