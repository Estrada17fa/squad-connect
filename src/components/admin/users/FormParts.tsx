import * as React from "react";
import { toast } from "sonner";
import { Camera, ChevronDown, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ImageCropDialog } from "@/components/perfil/ImageCropDialog";
import { uploadAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";

/** Círculo grande de foto con ícono de cámara (sube y recorta). */
export function PhotoCircle({ value, onChange, userId }: { value: string | null; onChange: (url: string | null) => void; userId: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Selecciona una imagen");
    if (f.size > 10 * 1024 * 1024) return toast.error("La imagen no debe pasar de 10 MB");
    setFile(f);
    setCropOpen(true);
  }
  async function handleCropped(blob: Blob) {
    setUploading(true);
    try {
      onChange(await uploadAvatar(blob, userId));
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={value ? "Cambiar foto" : "Subir foto"}
        onClick={() => inputRef.current?.click()}
        className="coord-press relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {value ? <img src={value} alt="Foto" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7" />}
        {uploading ? <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs">Subiendo…</span> : null}
      </button>
      {value ? (
        <button type="button" onClick={() => onChange(null)} className="text-xs text-muted-foreground">Quitar foto</button>
      ) : (
        <span className="text-xs text-muted-foreground">Foto (opcional)</span>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <ImageCropDialog open={cropOpen} onOpenChange={setCropOpen} file={file} onCropped={handleCropped} />
    </div>
  );
}

/** Selector de fecha propio de la app (sin el del navegador). Valor ISO yyyy-MM-dd. */
export function BirthDatePicker({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const date = value ? parseISO(value) : undefined;
  const now = new Date();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !date && "text-muted-foreground",
          )}
        >
          {date ? format(date, "d MMM yyyy", { locale: es }) : "Elegir fecha"}
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          captionLayout="dropdown"
          startMonth={new Date(now.getFullYear() - 80, 0)}
          endMonth={now}
          defaultMonth={date ?? new Date(now.getFullYear() - 18, 0)}
          selected={date}
          onSelect={(d) => { if (d) { onChange(format(d, "yyyy-MM-dd")); setOpen(false); } }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Sección plegable "Más datos (opcional)". */
export function MoreFields({ children, defaultOpen }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="coord-press flex min-h-11 w-full items-center justify-between text-sm font-semibold">
        Más datos (opcional)
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="space-y-3 pt-1">{children}</div> : null}
    </div>
  );
}

/** Barra fija abajo, sobre la navegación inferior: "Atrás" en texto + acción principal a lo ancho. */
export function StickyFooterActions({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="h-20" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 bg-background/95 px-4 py-2 backdrop-blur sm:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} className="coord-press min-h-11 shrink-0 px-2 text-sm font-semibold text-muted-foreground">Atrás</button>
          ) : null}
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </>
  );
}
