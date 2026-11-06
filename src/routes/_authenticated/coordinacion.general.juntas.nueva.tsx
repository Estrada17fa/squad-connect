import { createFileRoute, redirect } from "@tanstack/react-router";

// Nueva junta ahora se abre en ventana dentro de la lista de Juntas.
export const Route = createFileRoute("/_authenticated/coordinacion/general/juntas/nueva")({
  beforeLoad: () => {
    throw redirect({ to: "/coordinacion/general/tareas", search: { tab: "juntas", nueva: 1 }, replace: true });
  },
});
