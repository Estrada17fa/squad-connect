import * as React from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadMediaFile, type MediaFile } from "@/hooks/useMultimedia";

/** Visor a pantalla completa de una publicación. */
export function MediaLightbox({
  open,
  onOpenChange,
  files,
  urls,
  index,
  onIndexChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  files: MediaFile[];
  urls: Record<string, string>;
  index: number;
  onIndexChange: (i: number) => void;
}) {
  const file = files[index];
  const url = file ? urls[file.storage_path] : undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col outline-none">
          <DialogPrimitive.Title className="sr-only">Ver multimedia</DialogPrimitive.Title>
          <div className="flex items-center justify-between p-3">
            <span className="truncate text-sm text-white/70">{file?.file_name}</span>
            <div className="flex items-center gap-1">
              {file ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Descargar"
                  className="text-white/80 hover:text-white"
                  onClick={async () => {
                    try {
                      await downloadMediaFile(file);
                    } catch (e: any) {
                      toast.error(e?.message ?? "No se pudo descargar");
                    }
                  }}
                >
                  <Download className="h-5 w-5" />
                </Button>
              ) : null}
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cerrar"
                  className="text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center p-2">
            {url ? (
              file?.kind === "video" ? (
                <video src={url} controls playsInline className="max-h-full max-w-full" />
              ) : (
                <img src={url} alt={file?.file_name} className="max-h-full max-w-full object-contain" />
              )
            ) : null}

            {files.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Anterior"
                  onClick={() => onIndexChange((index - 1 + files.length) % files.length)}
                  className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Siguiente"
                  onClick={() => onIndexChange((index + 1) % files.length)}
                  className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
