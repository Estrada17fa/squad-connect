import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/administracion/torneos/$id")({
  component: () => <Outlet />,
});
