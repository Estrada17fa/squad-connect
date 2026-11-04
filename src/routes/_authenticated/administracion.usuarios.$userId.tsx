import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/administracion/usuarios/$userId")({
  head: () => ({
    meta: [
      { title: "Ficha del miembro — Squad" },
      { name: "description", content: "Datos, categorías, acceso y permisos de un miembro del club." },
      { property: "og:title", content: "Ficha del miembro — Squad" },
      { property: "og:description", content: "Datos, categorías, acceso y permisos de un miembro del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});
