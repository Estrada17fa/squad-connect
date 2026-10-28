import { createFileRoute } from "@tanstack/react-router";

// El contenedor (coordinacion.tsx) redirige a la primera área y módulo con acceso.
export const Route = createFileRoute("/_authenticated/coordinacion/")({
  component: () => null,
});
