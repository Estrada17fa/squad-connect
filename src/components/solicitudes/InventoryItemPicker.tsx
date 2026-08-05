import * as React from "react";
import { Search, Check, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useInventoryCatalog, useInventoryThumbnails, type InventoryCatalogItem } from "@/hooks/useInventory";
import { categoryIcon, SIN_CATEGORIA } from "@/lib/inventory";
import { cn } from "@/lib/utils";

export { categoryIcon };


interface Props {
  clubId: string;
  itemId: string | null;
  itemName: string;
  onChange: (item: InventoryCatalogItem | null) => void;
}

export function InventoryItemPicker({ clubId, itemId, itemName, onChange }: Props) {
  const catalogQ = useInventoryCatalog(clubId);
  const items = catalogQ.data ?? [];
  const thumbsQ = useInventoryThumbnails(items.map((i) => i.image_path));
  const thumbs = thumbsQ.data ?? {};

  const [search, setSearch] = React.useState("");
  const [cat, setCat] = React.useState<string>("all");

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const i of items) set.add(i.category?.trim() || SIN_CATEGORIA);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [items]);

  const selected = items.find((i) => i.id === itemId) ?? null;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const c = i.category?.trim() || SIN_CATEGORIA;
      if (cat !== "all" && c !== cat) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, cat]);

  if (selected || (itemId && itemName)) {
    const Icon = categoryIcon(selected?.category);
    const thumb = selected?.image_path ? thumbs[selected.image_path] : undefined;
    return (
      <div className="glass flex items-center gap-3 p-3">
        <Thumb src={thumb} Icon={Icon} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{selected?.name ?? itemName}</p>
          <p className="text-xs text-muted-foreground">
            {selected
              ? `${selected.available_quantity} disponible${selected.available_quantity === 1 ? "" : "s"}${
                  selected.unit ? ` · ${selected.unit}` : ""
                }`
              : "Artículo seleccionado"}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar artículo…"
          className="pl-9"
        />
      </div>

      {categories.length > 1 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ key: "all", label: "Todas" }, ...categories.map((c) => ({ key: c, label: c }))].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setCat(o.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                cat === o.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border/50 p-2">
        {catalogQ.isLoading ? (
          <p className="p-3 text-sm text-muted-foreground">Cargando catálogo…</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {items.length === 0
              ? "El inventario de tu club aún no tiene artículos."
              : "Ningún artículo coincide con la búsqueda."}
          </p>
        ) : (
          filtered.map((i) => {
            const Icon = categoryIcon(i.category);
            const thumb = i.image_path ? thumbs[i.image_path] : undefined;
            const out = i.available_quantity <= 0;
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => onChange(i)}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-primary/40 hover:bg-white/[0.04]"
              >
                <Thumb src={thumb} Icon={Icon} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{i.name}</p>
                  <p className={cn("text-xs", out ? "text-destructive" : "text-muted-foreground")}>
                    {out
                      ? "Sin disponibilidad"
                      : `${i.available_quantity} disponible${i.available_quantity === 1 ? "" : "s"}`}
                    {i.category ? ` · ${i.category}` : ""}
                  </p>
                </div>
                {itemId === i.id ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function Thumb({ src, Icon }: { src?: string; Icon: LucideIcon }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-primary">
      <Icon className="h-5 w-5" />
    </span>
  );
}
