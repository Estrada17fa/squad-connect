import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import squadLogo from "@/assets/squad-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/squad/LoadingState";
import { EmptyState } from "@/components/squad/EmptyState";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Squad — Aceptar invitación" },
      { name: "description", content: "Acepta tu invitación para unirte a tu club en Squad." },
    ],
  }),
  component: InvitePage,
});

interface InvitePreview {
  id: string;
  club_id: string;
  club_name: string;
  email: string;
  role_name: string | null;
  team_name: string | null;
  expires_at: string;
  accepted_at: string | null;
}

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["invite", token],
    queryFn: async (): Promise<InvitePreview | null> => {
      const { data, error } = await supabase
        .rpc("get_invitation_by_token", { _token: token });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as InvitePreview | null;
    },
  });

  async function acceptAndSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!q.data) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: q.data.email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        navigate({ to: "/" });
      } else {
        setError("Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aceptar la invitación");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <img src={squadLogo.url} alt="Squad" className="h-24 w-auto" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_0_60px_-30px_hsl(150_100%_50%/0.4)]">
          {q.isLoading ? (
            <LoadingState />
          ) : !q.data ? (
            <EmptyState
              icon={ShieldAlert}
              title="Invitación no válida"
              message="Este link no existe o fue eliminado."
            />
          ) : q.data.accepted_at ? (
            <EmptyState
              icon={ShieldAlert}
              title="Invitación ya utilizada"
              message="Esta invitación ya fue aceptada. Inicia sesión con tu cuenta."
              action={<Button onClick={() => navigate({ to: "/auth" })}>Ir a iniciar sesión</Button>}
            />
          ) : new Date(q.data.expires_at).getTime() < Date.now() ? (
            <EmptyState
              icon={ShieldAlert}
              title="Invitación caducada"
              message="Pide a un Super Admin que te genere una nueva."
            />
          ) : (
            <>
              <div className="mb-4 space-y-1 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Invitación a</p>
                <h1 className="font-display text-2xl font-bold text-foreground">{q.data.club_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {q.data.role_name ?? "Sin rol"}
                  {q.data.team_name ? ` · ${q.data.team_name}` : " · Todo el club"}
                </p>
                <p className="pt-2 text-sm text-foreground">{q.data.email}</p>
              </div>
              <form onSubmit={acceptAndSignUp} className="space-y-3">
                <div>
                  <Label>Nombre completo</Label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <Label>Contraseña</Label>
                  <Input
                    required
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {error ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                <Button type="submit" disabled={submitting} className="glow-primary w-full">
                  {submitting ? "Creando cuenta…" : "Aceptar invitación"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
