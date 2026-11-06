import { createFileRoute, redirect } from "@tanstack/react-router";

// Pantalla vieja: redirige a la nueva Administración conservando los parámetros.
export const Route = createFileRoute("/_authenticated/m/usuarios")({
  validateSearch: (s: Record<string, unknown>) => s,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/administracion/usuarios", search: search as never, replace: true });
  },
});
