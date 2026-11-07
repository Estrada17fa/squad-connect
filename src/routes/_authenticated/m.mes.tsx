import { createFileRoute, redirect } from "@tanstack/react-router";

/** La vista de mes vive ahora en la Agenda. */
export const Route = createFileRoute("/_authenticated/m/mes")({
  beforeLoad: () => {
    throw redirect({ to: "/m/agenda", search: { vista: "mes" } });
  },
});
