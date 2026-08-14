import * as React from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaFile } from "@/hooks/useMultimedia";

/**
 * Carrusel de la publicación: imagen o video a pantalla completa del ancho de
 * la tarjeta. Si el álbum trae varios archivos, se navega con flechas y puntos.
 */
export function MediaCarousel({
  files,
  urls,
  index,
  onIndexChange,
  onOpenFull,
  className,
}: {
  files: MediaFile[];
  urls: Record<string, string>;
  index: number;
  onIndexChange: (i: number) => void;
  onOpenFull?: () => void;
  className?: string;
}) {
  const file = files[index];
  const url = file ? urls[file.storage_path] : undefined;

  if (!file) return null;

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-black/40", className)}>
      <div className="flex aspect-square w-full items-center justify-center">
        {!url ? (
          <ImageIcon className="h-8 w-8 animate-pulse text-muted-foreground" />
        ) : file.kind === "video" ? (
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={onOpenFull}
            className="h-full w-full"
            aria-label="Ver en pantalla completa"
          >
            <img src={url} alt={file.file_name} className="h-full w-full object-cover" />
          </button>
        )}
      </div>

      {files.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => onIndexChange((index - 1 + files.length) % files.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white/90 hover:bg-black/80"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => onIndexChange((index + 1) % files.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white/90 hover:bg-black/80"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {files.map((f, i) => (
              <span
                key={f.id}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i === index ? "bg-primary" : "bg-white/40",
                )}
              />
            ))}
          </div>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] tabular-nums text-white/90">
            {index + 1}/{files.length}
          </span>
        </>
      ) : null}

      {file.kind === "video" && !url ? (
        <Play className="absolute inset-0 m-auto h-10 w-10 text-white/70" />
      ) : null}
    </div>
  );
}
