import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useBoardingPassUrls } from "@/hooks/useTripBoardingPasses";
import { PdfCanvas } from "@/components/viajes/BoardingPassViewer";

const isImage = (p: string) => /\.(jpe?g|png|webp|heic|gif)$/i.test(p);

/** Imagen con zoom de dos dedos (y doble toque) y arrastre cuando está ampliada. */
function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [t, setT] = React.useState({ s: 1, x: 0, y: 0 });
  const g = React.useRef<{ d: number; s: number; px: number; py: number; x: number; y: number } | null>(null);
  const dist = (e: React.TouchEvent) => Math.hypot(e.touches[0]!.clientX - e.touches[1]!.clientX, e.touches[0]!.clientY - e.touches[1]!.clientY);
  return (
    <div
      className="flex h-full w-full touch-none items-center justify-center overflow-hidden"
      onDoubleClick={() => setT((v) => (v.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }))}
      onTouchStart={(e) => {
        if (e.touches.length === 2) g.current = { d: dist(e), s: t.s, px: 0, py: 0, x: t.x, y: t.y };
        else if (e.touches.length === 1) g.current = { d: 0, s: t.s, px: e.touches[0]!.clientX, py: e.touches[0]!.clientY, x: t.x, y: t.y };
      }}
      onTouchMove={(e) => {
        const st = g.current;
        if (!st) return;
        if (e.touches.length === 2 && st.d) setT((v) => ({ ...v, s: Math.min(5, Math.max(1, (st.s * dist(e)) / st.d)) }));
        else if (e.touches.length === 1 && t.s > 1) setT((v) => ({ ...v, x: st.x + e.touches[0]!.clientX - st.px, y: st.y + e.touches[0]!.clientY - st.py }));
      }}
      onTouchEnd={() => { g.current = null; setT((v) => (v.s <= 1.02 ? { s: 1, x: 0, y: 0 } : v)); }}
    >
      <img src={src} alt={alt} draggable={false} className="max-h-full w-full select-none object-contain" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transition: g.current ? "none" : "transform .15s" }} />
    </div>
  );
}

function PassContent({ path, title }: { path: string; title: string }) {
  const { view, isLoading, isError, refetch } = useBoardingPassUrls(path);
  if (isLoading) return <p className="text-sm text-neutral-500">Cargando tu pase…</p>;
  if (isError || !view) return <button onClick={() => refetch()} className="text-sm font-semibold text-neutral-700 underline">No se pudo cargar. Reintentar</button>;
  if (isImage(path)) return <ZoomImage src={view} alt={title} />;
  return <div className="h-full w-full overflow-auto"><PdfCanvas url={view} /></div>;
}

/** Pase a pantalla completa, fondo blanco; "Siguiente" si hay más de uno en el tramo. */
export function PassFullscreen({ paths, title, onClose }: { paths: string[]; title: string; onClose: () => void }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  if (typeof document === "undefined" || !paths.length) return null;
  const path = paths[Math.min(i, paths.length - 1)]!;
  // El pase se muestra sobre blanco (como impreso): colores fijos a propósito, no siguen el tema.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex flex-col bg-white text-neutral-900">
      <div className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <span className="text-sm font-semibold">{title}{paths.length > 1 ? ` · ${i + 1} de ${paths.length}` : ""}</span>
        <button onClick={onClose} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <PassContent key={path} path={path} title={title} />
      </div>
      {paths.length > 1 ? (
        <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
          <button onClick={() => setI((v) => (v + 1) % paths.length)} className="h-12 w-full rounded-2xl bg-neutral-900 text-sm font-semibold text-white">Siguiente</button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
