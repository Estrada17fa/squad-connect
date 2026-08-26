import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/components/squad/AppLayout";
import { PasswordRequirements } from "@/components/squad/PasswordRequirements";
import { checkPassword, friendlyPasswordError } from "@/lib/password";

export const Route = createFileRoute("/_authenticated/cambiar-contrasena")({
  head: () => ({
    meta: [
      { title: "Squad — Crea tu contraseña" },
      {
        name: "description",
        content: "Define tu contraseña personal para acceder a Squad de forma segura.",
      },
      { property: "og:title", content: "Squad — Crea tu contraseña" },
      {
        property: "og:description",
        content: "Define tu contraseña personal para acceder a Squad de forma segura.",
      },
    ],
  }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const check = checkPassword(password);
  const valid = check.isValid && password === confirm;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { error: e2 } = await (supabase as any)
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id);
      if (e2) throw e2;
    },
    onSuccess: async () => {
      toast.success("Contraseña actualizada");
      await qc.invalidateQueries({ queryKey: ["must-change-password", user.id] });
      navigate({ to: "/", replace: true });
    },
    onError: (e: any) => toast.error(friendlyPasswordError(e?.message)),
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex items-stretch gap-4 border-b border-border/60 p-5">
          <div className="w-1 shrink-0 rounded-full bg-primary" aria-hidden />
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Crea tu contraseña</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Por seguridad, define una contraseña personal antes de entrar a la plataforma.
              </p>
            </div>
          </div>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
            />
          </div>
          {password.length > 0 && password.length < 8 ? (
            <p className="text-sm text-destructive">La contraseña debe tener al menos 8 caracteres.</p>
          ) : null}
          {confirm.length > 0 && password !== confirm ? (
            <p className="text-sm text-destructive">Las contraseñas no coinciden.</p>
          ) : null}
          <Button type="submit" className="w-full glow-primary" disabled={!valid || save.isPending}>
            {save.isPending ? "Guardando…" : "Guardar y continuar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
