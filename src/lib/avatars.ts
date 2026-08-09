import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";
/** URL firmada de larga duración (10 años) para que el avatar funcione en toda la app. */
const SIGNED_TTL = 60 * 60 * 24 * 365 * 10;

/**
 * Sube la foto ya recortada (cuadrada) al almacén y devuelve una URL utilizable
 * directamente en `profiles.avatar_url`.
 */
export async function uploadAvatar(blob: Blob, userId: string): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;

  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  if (signErr) throw signErr;
  if (!data?.signedUrl) throw new Error("No se pudo generar la URL de la foto");
  return data.signedUrl;
}

/** Recorta la imagen a un cuadrado y la comprime a JPEG. */
export async function cropToSquare(
  image: HTMLImageElement,
  crop: { x: number; y: number; size: number },
  output = 512,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = output;
  canvas.height = output;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, output, output);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))),
      "image/jpeg",
      0.9,
    ),
  );
}
