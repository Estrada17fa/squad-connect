import * as React from "react";


/** Imagen con zoom de dos dedos (y doble toque) y arrastre cuando está ampliada. */
export function ZoomImage({ src, alt }: { src: string; alt: string }) {
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

