import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import squadLogo from "@/assets/squad-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Squad — Inicio" },
      { name: "description", content: "Panel de bienvenida de Squad para tu club." },
      { property: "og:title", content: "Squad" },
      { property: "og:description", content: "Plataforma de gestión para clubes deportivos profesionales." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext() as { user: { id: string } };

  const { data, isLoading } = useQuery({
    queryKey: ["me", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, club:clubs(name, league_name)")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const name = data?.full_name ?? "";
  const clubName = data?.club?.name ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={squadLogo.url} alt="Squad" className="h-9 w-auto" />
          </div>
          <button
            onClick={signOut}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-xl text-center">
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                Bienvenido
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Hola, {name}
              </h1>
              {clubName ? (
                <p className="mt-4 text-lg text-muted-foreground">
                  Tu club: <span className="text-foreground">{clubName}</span>
                </p>
              ) : (
                <p className="mt-4 text-lg text-muted-foreground">
                  Todavía no perteneces a ningún club.
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
