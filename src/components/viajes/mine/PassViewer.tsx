import * as React from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBoardingPassUrls } from "@/hooks/useTripBoardingPasses";
import { PdfCanvas } from "@/components/viajes/BoardingPassViewer";
import { useApp } from "@/components/squad/app-context";

const isImage = (p: string) => /\.(jpe?g|png|webp|heic|gif)$/i.test(p);
const clean = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface PassTarget { flightId: string; title: string; date: string }

/** Pases de UNA persona para un vuelo, en orden de carga. */
export function useMyFlightPasses(flightId: string | null | undefined, userId: string) {
  return useQuery({
    queryKey: ["my-flight-passes", flightId, userId],
    enabled: !!flightId,
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_boarding_passes").select("file_path, created_at").eq("flight_id", flightId!).eq("user_id", userId).order("created_at");
      if (error) throw error;
      return (data ?? []).map((p) => p.file_path as string);
    },
  });
}

/** Imagen ajustada al ANCHO; se desplaza hacia abajo; zoom con dos dedos y doble toque. */
function WidthImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = React.useState(1);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const pinch = React.useRef<{ d: number; s: number } | null>(null);
  const lastTap = React.useRef(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dist = (e: TouchEvent) => Math.hypot(e.touches[0]!.clientX - e.touches[1]!.clientX, e.touches[0]!.clientY - e.touches[1]!.clientY);
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch.current = { d: dist(e), s: scaleRef.current };
      else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap.current < 300) { e.preventDefault(); setScale((s) => (s > 1 ? 1 : 2.5)); lastTap.current = 0; }
        else lastTap.current = now;
      }
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) { e.preventDefault(); setScale(Math.min(5, Math.max(1, (pinch.current.s * dist(e)) / pinch.current.d))); }
    };
    const end = () => { pinch.current = null; setScale((s) => (s < 1.05 ? 1 : s)); };
    el.addEventListener("touchstart", start, { passive: false });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); };
  }, []);
  const scaleRef = React.useRef(scale);
  scaleRef.current = scale;
  return (
    <div ref={ref} data-pass-scroll className="h-full w-full overflow-auto overscroll-contain" style={{ touchAction: "pan-x pan-y" }} onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2.5))}>
      <img src={src} alt={alt} draggable={false} className="block h-auto max-w-none select-none" style={{ width: `${scale * 100}%` }} />
    </div>
  );
}

function PassPage({ path, title, onUrl }: { path: string; title: string; onUrl: (u: string | null) => void }) {
  const { view, isLoading, isError, refetch } = useBoardingPassUrls(path);
  React.useEffect(() => onUrl(view), [view, onUrl]);
  if (isLoading) return <p className="p-6 text-center text-sm text-neutral-400">Cargando tu pase…</p>;
  if (isError || !view) return <button onClick={() => refetch()} className="w-full p-6 text-sm font-semibold text-neutral-200 underline">No se pudo cargar. Reintentar</button>;
  if (isImage(path)) return <WidthImage src={view} alt={title} />;
  return <div data-pass-scroll className="h-full w-full overflow-auto bg-white"><PdfCanvas url={view} /></div>;
}

/** Visor único de pases, a pantalla completa. Fondo oscuro neutro a propósito (no sigue el tema) para que el pase resalte. */
export function PassViewer({ paths, title, date, onClose }: { paths: string[]; title: string; date?: string; onClose: () => void }) {
  const { profile } = useApp();
  const [i, setI] = React.useState(0);
  const [url, setUrl] = React.useState<string | null>(null);
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  if (typeof document === "undefined" || !paths.length) return null;
  const idx = Math.min(i, paths.length - 1);
  const path = paths[idx]!;
  const last = (profile?.full_name ?? "").trim().split(/\s+/).slice(1).join(" ") || (profile?.full_name ?? "Viajero");
  const fileName = `Pase_${clean(last)}_${clean(title.replace(/^.*?·\s*/, ""))}_${(date ?? new Date().toISOString()).slice(0, 10)}${paths.length > 1 ? `_${idx + 1}` : ""}.jpg`;

  const download = async () => {
    try {
      let blob: Blob | null = null;
      if (isImage(path)) {
        if (!url) return;
        blob = await (await fetch(url)).blob();
      } else {
        const canvas = bodyRef.current?.querySelector("canvas");
        if (!canvas) return toast.error("El pase aún se está cargando");
        blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
      }
      if (!blob) throw new Error();
      const file = new File([blob], fileName, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Mi pase" }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      toast.error("No se pudo descargar el pase");
    }
  };

  const btn = "flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-neutral-100 disabled:opacity-40";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 text-neutral-100">
      <div className="flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2">
        <button onClick={onClose} aria-label="Cerrar" className={btn}><X className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          {paths.length > 1 ? <p className="text-xs text-neutral-400">{idx + 1} de {paths.length}</p> : null}
        </div>
        {paths.length > 1 ? <>
          <button aria-label="Pase anterior" disabled={idx === 0} onClick={() => setI(idx - 1)} className={btn}><ChevronLeft className="h-5 w-5" /></button>
          <button aria-label="Pase siguiente" disabled={idx === paths.length - 1} onClick={() => setI(idx + 1)} className={btn}><ChevronRight className="h-5 w-5" /></button>
        </> : null}
        <button onClick={download} disabled={!url} aria-label="Descargar" className="flex h-11 items-center gap-1.5 rounded-full bg-neutral-100 px-4 text-sm font-semibold text-neutral-900 disabled:opacity-40"><Download className="h-4 w-4" /> Descargar</button>
      </div>
      <div ref={bodyRef} className="min-h-0 flex-1">
        <PassPage key={path} path={path} title={title} onUrl={setUrl} />
      </div>
    </div>,
    document.body,
  );
}

/** Abre el visor directo para un vuelo (busca los pases de la persona). */
export function FlightPassViewer({ target, userId, onClose }: { target: PassTarget; userId: string; onClose: () => void }) {
  const q = useMyFlightPasses(target.flightId, userId);
  const empty = !q.isLoading && !q.data?.length;
  React.useEffect(() => { if (empty) onClose(); }, [empty, onClose]);
  if (q.isLoading || !q.data?.length) return null;
  return <PassViewer paths={q.data} title={target.title} date={target.date} onClose={onClose} />;
}
