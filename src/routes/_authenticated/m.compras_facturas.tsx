import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { ComprasPage } from "@/components/pages/ComprasPage";
import { openSearch } from "@/lib/searchSchemas";
import { useCoordModuleVisible } from "@/components/squad/CoordShell";

export const Route = createFileRoute("/_authenticated/m/compras_facturas")({
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
  component: ModuleRoute,
});

function ModuleRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Enlaces viejos: quien gestiona el módulo en Coordinación va ahí (con los mismos parámetros).
  const coordTo = useCoordModuleVisible("compras_facturas");
  if (coordTo) return <Navigate to={coordTo} search={search} replace />;
  return <ComprasPage search={search} onClearSearch={() => navigate({ search: { open: undefined }, replace: true })} />;
}
