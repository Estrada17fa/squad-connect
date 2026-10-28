import { createFileRoute } from "@tanstack/react-router";

// Respaldo para direcciones que no existen (p. ej. /coordinacion/foo/bar):
// el contenedor (coordinacion.tsx) redirige a la primera opción válida.
export const Route = createFileRoute("/_authenticated/coordinacion/$area/$module")({
  component: () => null,
});
