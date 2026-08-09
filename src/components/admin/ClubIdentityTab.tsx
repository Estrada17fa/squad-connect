import * as React from "react";
import { toast } from "sonner";
import { Building2, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/squad/LoadingState";
import { DetailField, DetailGrid, DetailValue } from "@/components/squad/DetailSheet";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import {
  useClub,
  useClubLogoUrl,
  useUpdateClub,
  uploadClubLogo,
} from "@/hooks/useClubSettings";

/** Identidad del club: nombre y logo. */
export function ClubIdentityTab({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const clubQ = useClub(clubId);
  const update = useUpdateClub();
  const [name, setName] = React.useState("");
  const [logoPath, setLogoPath] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const logoUrlQ = useClubLogoUrl(logoPath);

  const reset = React.useCallback(() => {
    setName(clubQ.data?.name ?? "");
    setLogoPath(clubQ.data?.logo_url ?? null);
  }, [clubQ.data]);

  React.useEffect(() => {
    reset();
  }, [reset]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "image/png" || !file.name.toLowerCase().endsWith(".png")) {
      toast.error("El logo debe ser un archivo PNG");
      return;
    }
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
    if (!name.trim()) {
      toast.error("El club necesita un nombre");
      return false;
    }
    try {
      await update.mutateAsync({ id: clubId, name: name.trim(), logo_url: logoPath });
      toast.success("Identidad del club actualizada");
      return true;
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
      return false;
    }
  }

  if (clubQ.isLoading) return <LoadingState />;

  const logoPreview = (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30">
      {logoUrlQ.data ? (
        <img src={logoUrlQ.data} alt={`Logo de ${name}`} className="h-full w-full object-contain" />
      ) : (
        <ImagePlus className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );

  return (
    <SettingsPanel
      title="Identidad"
      description="Nombre y logo con los que se identifica el club."
      icon={Building2}
      canEdit={canEdit}
      saving={update.isPending || uploading}
      onSave={save}
      onCancel={reset}
      read={
        <DetailGrid>
          <DetailField label="Nombre del club">
            <DetailValue value={clubQ.data?.name ?? ""} />
          </DetailField>
          <DetailField label="Logo">
            <div className="flex items-center gap-3">
              {logoPreview}
              <span className="text-sm text-muted-foreground">
                {logoPath ? "Logo cargado" : "Sin logo"}
              </span>
            </div>
          </DetailField>
        </DetailGrid>
      }
      edit={
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="club-name">Nombre del club</Label>
            <Input id="club-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {logoPreview}
              <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm text-primary">
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                {uploading ? "Subiendo…" : logoPath ? "Cambiar logo" : "Subir logo"}
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Solo archivos PNG.</p>
          </div>
        </div>
      }
    />
  );
}
