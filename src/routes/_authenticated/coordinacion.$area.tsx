import { createFileRoute } from "@tanstack/react-router";

// El contenedor (coordinacion.tsx) redirige al primer módulo con acceso del área
// (o a la primera área válida si esta no existe o no tiene acceso).
export const Route = createFileRoute("/_authenticated/coordinacion/$area")({
  component: () => null,
});
