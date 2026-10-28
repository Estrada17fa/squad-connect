import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ComprasPage } from "@/components/pages/ComprasPage";
import { openSearch } from "@/lib/searchSchemas";

export const Route = createFileRoute("/_authenticated/coordinacion/administrativa/compras_facturas")({
  validateSearch: openSearch,
  head: () => ({
    meta: [
      { title: "Squad — Compras y facturas" },
      { name: "description", content: "Gastos del club, facturas recibidas, proveedores y reportes." },
      { property: "og:title", content: "Squad — Compras y facturas" },
      {
        property: "og:description",
        content: "Gastos con comprobante y factura, catálogo de proveedores y reportes del club.",
      },
    ],
  }),
  component: CoordModuleRoute,
});

function CoordModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return <ComprasPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
