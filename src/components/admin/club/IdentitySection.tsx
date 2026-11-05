import * as React from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useClub, useClubLogoUrl, useUpdateClub, uploadClubLogo } from "@/hooks/useClubSettings";
import { ClubSheet } from "./parts";

const HEX = /^#[0-9a-fA-F]{6}$/;

function Swatch({ color, label }: { color: string | null; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className="h-5 w-5 rounded-full ring-1 ring-border"
        style={{ background: color && HEX.test(color) ? color : "transparent" }}
      />
      {label}
    </span>
  );
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const valid = HEX.test(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Elegir ${label.toLowerCase()}`}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="#00FF88"
          maxLength={7}
          className="h-11 font-mono uppercase"
        />
      </div>
      {value && !valid ? <p className="text-xs text-destructive">Usa el formato #RRGGBB</p> : null}
    </div>
  );
}

export function IdentitySection({ clubId, canEdit }: { clubId: string; canEdit: boolean }) {
  const clubQ = useClub(clubId);
  const club = clubQ.data;
  const logoQ = useClubLogoUrl(club?.logo_url);
  const update = useUpdateClub();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [league, setLeague] = React.useState("");
  const [primary, setPrimary] = React.useState("");
  const [secondary, setSecondary] = React.useState("");
  const [logoPath, setLogoPath] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const draftLogo = useClubLogoUrl(logoPath);

  function start() {
    setName(club?.name ?? "");
    setLeague(club?.league_name ?? "");
    setPrimary(club?.primary_color ?? "");
    setSecondary(club?.secondary_color ?? "");
    setLogoPath(club?.logo_url ?? null);
    setOpen(true);
  }

  async function onFile(file?: File) {
    if (!file) return;
    if (file.type !== "image/png") return toast.error("El logo debe ser un archivo PNG");
    setUploading(true);
    try {
      setLogoPath(await uploadClubLogo(clubId, file));
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo subir el logo");
    } finally {
      setUploading(false);
    }
  }

  const invalid = !name.trim() || (primary !== "" && !HEX.test(primary)) || (secondary !== "" && !HEX.test(secondary));

  async function save() {
    try {
      await update.mutateAsync({
        id: clubId,
        name: name.trim(),
        league_name: league.trim() || null,
        primary_color: primary || null,
        secondary_color: secondary || null,
        logo_url: logoPath,
      });
      toast.success("Identidad actualizada");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  }

  return (
    <section className="flex flex-col items-center gap-3 rounded-[18px] bg-card p-5 text-center">
      <div className="flex h-28 w-full items-center justify-center">
        {logoQ.data ? (
          <img src={logoQ.data} alt={`Logo de ${club?.name ?? "club"}`} className="h-full max-w-full object-contain" />
        ) : (
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold">{club?.name ?? "…"}</p>
        <p className="text-[13px] text-muted-foreground">{club?.league_name || "Sin liga"}</p>
      </div>
      <div className="flex items-center gap-4">
        <Swatch color={club?.primary_color ?? null} label="Primario" />
        <Swatch color={club?.secondary_color ?? null} label="Secundario" />
      </div>
      {canEdit ? (
        <Button variant="secondary" size="sm" onClick={start} className="rounded-full px-5">Editar</Button>
      ) : null}

      <ClubSheet open={open} onOpenChange={setOpen} title="Identidad del club" full>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-background/60 p-1">
              {draftLogo.data ? <img src={draftLogo.data} alt="Logo" className="h-full w-full object-contain" /> : <ImagePlus className="h-6 w-6 text-muted-foreground" />}
            </div>
            <label className="coord-press cursor-pointer rounded-xl bg-muted/40 px-3 py-2 text-sm font-semibold text-primary">
              <input type="file" accept="image/png" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              {uploading ? "Subiendo…" : logoPath ? "Reemplazar logo" : "Subir logo"}
            </label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="club-name" className="text-xs text-muted-foreground">Nombre</Label>
            <Input id="club-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            {!name.trim() ? <p className="text-xs text-destructive">Escribe el nombre</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="club-league" className="text-xs text-muted-foreground">Liga</Label>
            <Input id="club-league" value={league} onChange={(e) => setLeague(e.target.value)} className="h-11" placeholder="Liga Premier" />
          </div>
          <ColorField id="club-primary" label="Color primario" value={primary} onChange={setPrimary} />
          <ColorField id="club-secondary" label="Color secundario" value={secondary} onChange={setSecondary} />
          <Button className="h-11 w-full" disabled={invalid || uploading || update.isPending} onClick={save}>
            {update.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </ClubSheet>
    </section>
  );
}
