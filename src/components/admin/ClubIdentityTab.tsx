import * as React from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/squad/LoadingState";
import {
  useClub,
  useClubLogoUrl,
  useUpdateClub,
  uploadClubLogo,
} from "@/hooks/useClubSettings";

/** Identidad del club: nombre, logo y colores de marca. */
export function ClubIdentityTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const clubQ = useClub(clubId);
  const update = useUpdateClub();
  const [name, setName] = React.useState("");
  const [primary, setPrimary] = React.useState("#00ff9d");
  const [secondary, setSecondary] = React.useState("#111111");
  const [logoPath, setLogoPath] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const logoUrlQ = useClubLogoUrl(logoPath);

  React.useEffect(() => {
    if (!clubQ.data) return;
    setName(clubQ.data.name ?? "");
    setPrimary(clubQ.data.primary_color || "#00ff9d");
    setSecondary(clubQ.data.secondary_color || "#111111");
    setLogoPath(clubQ.data.logo_url ?? null);
  }, [clubQ.data]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadClubLogo(clubId, file);
      setLogoPath(path);
      toast.success("Logo subido. Guarda los cambios para aplicarlo.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo subir el logo");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) return toast.error("El club necesita un nombre");
    try {
      await update.mutateAsync({
        id: clubId,
        name: name.trim(),
        logo_url: logoPath,
        primary_color: primary,
        secondary_color: secondary,
      });
      toast.success("Identidad del club actualizada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  if (clubQ.isLoading) return <LoadingState />;

  return (
    <div className="glass space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="club-name">Nombre del club</Label>
        <Input
          id="club-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30">
            {logoUrlQ.data ? (
              <img src={logoUrlQ.data} alt={`Logo de ${name}`} className="h-full w-full object-contain" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          {canEdit ? (
            <label className="cursor-pointer text-sm text-primary">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              {uploading ? "Subiendo…" : logoPath ? "Cambiar logo" : "Subir logo"}
            </label>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="club-primary">Color primario</Label>
          <div className="flex items-center gap-2">
            <input
              id="club-primary"
              type="color"
              value={primary}
              disabled={!canEdit}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-9 w-10 rounded-md border border-border bg-transparent"
            />
            <Input value={primary} onChange={(e) => setPrimary(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="club-secondary">Color secundario</Label>
          <div className="flex items-center gap-2">
            <input
              id="club-secondary"
              type="color"
              value={secondary}
              disabled={!canEdit}
              onChange={(e) => setSecondary(e.target.value)}
              className="h-9 w-10 rounded-md border border-border bg-transparent"
            />
            <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
      </div>

      {canEdit ? (
        <Button onClick={save} disabled={update.isPending} className="w-full glow-primary">
          Guardar identidad
        </Button>
      ) : null}
    </div>
  );
}
