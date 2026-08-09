import * as React from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "./ImageCropDialog";
import { uploadAvatar } from "@/lib/avatars";

/**
 * Campo de foto de perfil: se sube un archivo (nunca una URL) y se recorta
 * cuadrado antes de guardarlo.
 */
export function AvatarUploadField({
  value,
  onChange,
  userId,
  name,
  label = "Foto de perfil",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Carpeta destino del archivo (id del usuario dueño de la foto). */
  userId: string;
  name?: string | null;
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const initials = (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("La imagen no debe pasar de 10 MB");
      return;
    }
    setFile(f);
    setCropOpen(true);
  }

  async function handleCropped(blob: Blob) {
    setUploading(true);
    try {
      const url = await uploadAvatar(blob, userId);
      onChange(url);
      toast.success("Foto lista");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          {value ? <AvatarImage src={value} alt={name ?? "Foto"} /> : null}
          <AvatarFallback className="text-base font-semibold">{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="mr-2 h-3.5 w-3.5" />
            {uploading ? "Subiendo…" : value ? "Cambiar foto" : "Subir foto"}
          </Button>
          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => onChange(null)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Quitar
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        file={file}
        onCropped={handleCropped}
      />
    </div>
  );
}
