import * as React from "react";
import { ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cropToSquare } from "@/lib/avatars";

const VIEW = 280;

/**
 * Recorte cuadrado (previsualizado en redondo, como se ve el avatar).
 * Arrastra para encuadrar y usa el zoom para acercar.
 */
export function ImageCropDialog({
  open,
  onOpenChange,
  file,
  onCropped,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  file: File | null;
  onCropped: (blob: Blob) => void | Promise<void>;
}) {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  const [url, setUrl] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [busy, setBusy] = React.useState(false);
  const drag = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const base = img ? Math.min(img.naturalWidth, img.naturalHeight) : 0;
  const srcSize = base / zoom;
  const maxX = img ? img.naturalWidth - srcSize : 0;
  const maxY = img ? img.naturalHeight - srcSize : 0;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(max, 0));
  const cropX = clamp(offset.x, maxX);
  const cropY = clamp(offset.y, maxY);

  // Escala de presentación: el recuadro de VIEW px muestra `srcSize` px de origen.
  const displayScale = img ? VIEW / srcSize : 1;

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !img) return;
    const dx = (e.clientX - drag.current.x) / displayScale;
    const dy = (e.clientY - drag.current.y) / displayScale;
    drag.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: clamp(o.x - dx, maxX), y: clamp(o.y - dy, maxY) }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function confirm() {
    if (!img) return;
    setBusy(true);
    try {
      const blob = await cropToSquare(img, { x: cropX, y: cropY, size: srcSize });
      await onCropped(blob);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
          <DialogDescription>
            Arrastra para encuadrar y acerca con el control de zoom.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-full border border-border/60 bg-muted touch-none"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {url && img ? (
              <img
                src={url}
                alt="Previsualización"
                draggable={false}
                className="absolute left-0 top-0 max-w-none select-none"
                style={{
                  width: img.naturalWidth * displayScale,
                  height: img.naturalHeight * displayScale,
                  transform: `translate(${-cropX * displayScale}px, ${-cropY * displayScale}px)`,
                }}
              />
            ) : null}
          </div>

          <div className="flex w-full items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.05}
              onValueChange={([v]) => setZoom(v ?? 1)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!img || busy} className="glow-primary">
            {busy ? "Guardando…" : "Usar foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
