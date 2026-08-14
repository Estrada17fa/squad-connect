import * as React from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DeleteAction } from "@/components/squad/DeleteAction";
import { supabase } from "@/integrations/supabase/client";
import {
  CREST_BUCKET,
  useDeleteTournamentTeam,
  useSaveTournamentTeam,
  type TournamentTeamRow,
} from "@/hooks/useTournaments";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  tournamentId: string;
  team?: TournamentTeamRow | null;
  /** Grupos configurados en el torneo (vacío = torneo sin grupos). */
  groups?: string[];
}

const NO_GROUP = "__none__";

export function TournamentTeamFormDialog({
  open,
  onOpenChange,
  clubId,
  tournamentId,
  team,
  groups = [],
}: Props) {
  const isEdit = !!team;
  const save = useSaveTournamentTeam();
  const del = useDeleteTournamentTeam();

  const [name, setName] = React.useState("");
  const [shortName, setShortName] = React.useState("");
  const [isOurTeam, setIsOurTeam] = React.useState(false);
  const [groupLabel, setGroupLabel] = React.useState<string>(NO_GROUP);
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(team?.name ?? "");
    setShortName(team?.short_name ?? "");
    setIsOurTeam(team?.is_our_team ?? false);
    setGroupLabel(team?.group_label ?? NO_GROUP);
    setNotes(team?.notes ?? "");
    setFile(null);
  }, [open, team]);


  async function handleSave() {
    if (!name.trim()) return toast.error("El nombre del equipo es obligatorio");
    setBusy(true);
    try {
      let crest = team?.crest_path ?? null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "png";
        const path = `${clubId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(CREST_BUCKET).upload(path, file);
        if (error) throw error;
        if (crest) await supabase.storage.from(CREST_BUCKET).remove([crest]);
        crest = path;
      }
      await save.mutateAsync({
        id: team?.id,
        tournament_id: tournamentId,
        club_id: clubId,
        name: name.trim(),
        short_name: shortName.trim() || null,
        crest_path: crest,
        is_our_team: isOurTeam,
        group_label: groups.length && groupLabel !== NO_GROUP ? groupLabel : null,
        notes: notes.trim() || null,

      });
      toast.success(isEdit ? "Equipo actualizado" : "Equipo agregado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar equipo" : "Nuevo equipo participante"}</EntitySheetTitle>
        <EntitySheetDescription>
          Los equipos que compiten en este torneo. Marca cuál es el equipo del club.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="tt-name">Nombre</Label>
          <Input
            id="tt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Club Deportivo…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tt-short">Nombre corto</Label>
          <Input
            id="tt-short"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="CDX"
          />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/5">
          <div className="min-w-0">
            <p className="text-sm font-medium">Es nuestro equipo</p>
            <p className="text-xs text-muted-foreground">
              Solo un equipo del torneo puede estar marcado como nuestro.
            </p>
          </div>
          <Switch checked={isOurTeam} onCheckedChange={setIsOurTeam} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tt-crest">Escudo (opcional)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="tt-crest"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          {team?.crest_path && !file ? (
            <p className="text-xs text-muted-foreground">Ya tiene un escudo cargado.</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tt-notes">Notas</Label>
          <Textarea
            id="tt-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sede, contacto, observaciones…"
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <DeleteAction
            label="Eliminar equipo"
            title="Eliminar equipo del torneo"
            successMessage="Equipo eliminado"
            loading={del.isPending}
            onDelete={() => del.mutateAsync(team!)}
            onDeleted={() => onOpenChange(false)}
          />
        ) : null}
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar equipo"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
