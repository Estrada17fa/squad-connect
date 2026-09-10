import * as React from "react";
import { Download, FileText, ExternalLink, RefreshCw } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
  EntitySheetDescription,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { useBoardingPassUrls } from "@/hooks/useTripBoardingPasses";

function isImage(path: string) {
  return /\.(jpe?g|png|webp|heic|gif)$/i.test(path);
}

/**
 * Dibuja el PDF como imágenes dentro de la app.
 * El visor nativo del navegador móvil no incrusta PDFs (muestra una caja gris
 * con el nombre del archivo), así que lo renderizamos nosotros con pdfjs.
 */
function PdfCanvas({ url, onFail }: { url: string; onFail?: () => void }) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    let doc: any = null;
    const host = hostRef.current;
    setState("loading");

    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudo descargar el pase");
        const data = await res.arrayBuffer();
        if (cancelled) return;

        doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled || !host) return;
        host.replaceChildren();

        const width = Math.max(host.clientWidth || 320, 320);
        const dpr = Math.min(window.devicePixelRatio || 1, 3);

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = (width / base.width) * dpr;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Sin canvas");
          host.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled) return;
        }
        setState("ready");
      } catch {
        if (cancelled) return;
        setState("error");
        onFail?.();
      }
    })();

    return () => {
      cancelled = true;
      try {
        doc?.destroy?.();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, attempt]);

  return (
    <div className="space-y-3">
      {state === "loading" ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Cargando tu pase…
        </div>
      ) : null}
      {state === "error" ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">No se pudo mostrar tu pase. Intenta de nuevo.</p>
          <Button type="button" variant="outline" onClick={() => setAttempt((a) => a + 1)}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
          </Button>
        </div>
      ) : null}
      <div
        ref={hostRef}
        className={
          state === "ready"
            ? "max-h-[70vh] touch-pan-x touch-pan-y overflow-auto rounded-xl border border-border/60 bg-white"
            : "hidden"
        }
      />
    </div>
  );
}

/**
 * Visor de pase de abordar DENTRO de la app.
 * Nunca abre pestañas por código (los navegadores móviles lo bloquean):
 * dibuja el documento y ofrece descarga y enlace real de respaldo.
 */
export function BoardingPassViewer({
  open,
  onOpenChange,
  filePath,
  title = "Pase de abordar",
  subtitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filePath: string | null;
  title?: string;
  subtitle?: string;
}) {
  const { view, download, isLoading, isError, refetch } = useBoardingPassUrls(open ? filePath : null);
  const image = filePath ? isImage(filePath) : false;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="xl">
      <EntitySheetHeader>
        <EntitySheetTitle>{title}</EntitySheetTitle>
        {subtitle ? <EntitySheetDescription>{subtitle}</EntitySheetDescription> : null}
      </EntitySheetHeader>

      <EntitySheetBody>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Cargando tu pase…
          </div>
        ) : isError || !view ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar tu pase. Intenta de nuevo.</p>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
            </Button>
          </div>
        ) : image ? (
          <div className="overflow-auto rounded-xl border border-border/60 bg-white">
            <img src={view} alt={title} className="w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            <PdfCanvas url={view} />
            <a
              href={view}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground underline underline-offset-4"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir en el navegador
            </a>
          </div>
        )}
      </EntitySheetBody>

      <EntitySheetFooter>
        {download ? (
          <a
            href={download}
            download
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> Descargar
          </a>
        ) : (
          <span className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" /> Pase de abordar
          </span>
        )}
      </EntitySheetFooter>
    </EntitySheet>
  );
}
