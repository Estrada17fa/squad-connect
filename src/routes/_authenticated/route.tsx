import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/squad/AppLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Usar getSession() (local, sin round-trip) en lugar de getUser() para
    // evitar disparar /auth/v1/user en cada navegación y en cada hover-preload.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  return <AppLayout user={{ id: user.id, email: user.email }} />;
}
