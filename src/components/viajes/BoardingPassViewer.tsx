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
 * Visor de pase de abordar DENTRO de la app.
 * Nunca abre pestañas por código (los navegadores móviles lo bloquean):
 * muestra la imagen o el PDF incrustado y ofrece enlaces reales de respaldo.
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
            <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
              <iframe src={view} title={title} className="h-[70vh] w-full" />
            </div>
            <a
              href={view}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 text-sm font-medium text-foreground"
            >
              <ExternalLink className="h-4 w-4" /> Abrir pase
            </a>
            <p className="text-center text-[11px] text-muted-foreground">
              Si no ves el documento arriba, usa el botón "Abrir pase".
            </p>
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
