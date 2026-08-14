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
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteAction } from "@/components/squad/DeleteAction";
import { supabase } from "@/integrations/supabase/client";
import type { TeamOption } from "@/hooks/useAccess";
import { useOurMatches } from "@/hooks/useMatchOps";
import { MEDIA_TYPES, MEDIA_TYPE_LABEL, mediaKindFromFile, type MediaPostType } from "@/lib/multimedia";
import {
  MEDIA_BUCKET,
  useDeleteMediaPost,
  useSaveMediaPost,
  type MediaPost,
} from "@/hooks/useMultimedia";
import { formatDateTime } from "@/lib/calendar-utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Categorías donde el usuario puede publicar. */
  teams: TeamOption[];
  /** Solo editor global puede dirigir a todo el club. */
  canPublishClubWide: boolean;
  post?: MediaPost | null;
  onDeleted?: () => void;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MediaFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  teams,
  canPublishClubWide,
  post,
  onDeleted,
}: Props) {
  const isEdit = !!post;
  const save = useSaveMediaPost();
  const del = useDeleteMediaPost();
  const matchesQ = useOurMatches(clubId);

  const editableTeams = React.useMemo(
    () => teams.flatMap((t) => (t.id ? [{ id: t.id, name: t.name }] : [])),
    [teams],
  );

  const [scope, setScope] = React.useState<"club" | "teams">("teams");
  const [teamIds, setTeamIds] = React.useState<string[]>([]);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<MediaPostType>("entrenamiento");
  const [matchId, setMatchId] = React.useState<string>("");
  const [when, setWhen] = React.useState(() => toLocalInput(new Date().toISOString()));
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setScope(post?.audience ?? (canPublishClubWide ? "club" : "teams"));
    setTeamIds(post?.teams.map((t) => t.team_id) ?? []);
    setTitle(post?.title ?? "");
    setDescription(post?.description ?? "");
    setType(post?.type ?? "entrenamiento");
    setMatchId(post?.match_id ?? "");
    setWhen(toLocalInput(post?.published_at ?? new Date().toISOString()));
    setFiles([]);
  }, [open, post, canPublishClubWide]);

  function toggleTeam(id: string) {
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!isEdit && files.length === 0) return toast.error("Selecciona al menos una foto o video");
    if (scope === "teams" && teamIds.length === 0)
      return toast.error("Selecciona al menos una categoría");

    setBusy(true);
    const uploaded: string[] = [];
    try {
      const uploads: {
        storage_path: string;
        file_name: string;
        mime_type: string | null;
        kind: "image" | "video";
      }[] = [];

      for (const f of files) {
        const ext = f.name.split(".").pop() ?? "bin";
        const path = `${clubId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, f, {
          contentType: f.type || undefined,
        });
        if (error) throw error;
        uploaded.push(path);
        uploads.push({
          storage_path: path,
          file_name: f.name,
          mime_type: f.type || null,
          kind: mediaKindFromFile(f),
        });
      }

      await save.mutateAsync({
        id: post?.id,
        club_id: clubId,
        author_id: userId,
        title: title.trim() || null,
        description: description.trim() || null,
        type,
        audience: scope,
        teamIds: scope === "teams" ? teamIds : [],
        match_id: type === "partido" && matchId ? matchId : null,
        published_at: new Date(when).toISOString(),
        files: uploads,
      });

      toast.success(isEdit ? "Publicación actualizada" : "Publicación creada");
      onOpenChange(false);
    } catch (e: any) {
      if (uploaded.length) await supabase.storage.from(MEDIA_BUCKET).remove(uploaded);
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    await del.mutateAsync(post);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar publicación" : "Nueva publicación"}</EntitySheetTitle>
        <EntitySheetDescription>
          Las fotos y videos aparecen en el feed de Mi Club de las personas destinatarias.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {!isEdit ? (
          <div className="space-y-1.5">
            <Label htmlFor="mm-files">Fotos o videos</Label>
            <label
              htmlFor="mm-files"
              className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground"
            >
              <Upload className="h-4 w-4" />
              <span className="truncate">
                {files.length ? `${files.length} archivo(s) seleccionados` : "Seleccionar archivos"}
              </span>
            </label>
            <input
              id="mm-files"
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <p className="text-xs text-muted-foreground">
              Varios archivos juntos se publican como un álbum con carrusel.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Los archivos no se cambian al editar: elimina la publicación y súbela de nuevo si hace falta.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="mm-title">Título (opcional)</Label>
          <Input
            id="mm-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p.ej. Partido vs Tigres"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mm-desc">Descripción (opcional)</Label>
          <Textarea
            id="mm-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto de las fotos o el video"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mm-type">Tipo</Label>
          <select
            id="mm-type"
            value={type}
            onChange={(e) => setType(e.target.value as MediaPostType)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {MEDIA_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEDIA_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        {type === "partido" ? (
          <div className="space-y-1.5">
            <Label htmlFor="mm-match">Partido (opcional)</Label>
            <select
              id="mm-match"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sin ligar a un partido</option>
              {(matchesQ.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  vs {m.rival?.name ?? "rival"}
                  {m.matchday ? ` · J${m.matchday}` : ""}
                  {m.kickoff_at ? ` · ${formatDateTime(m.kickoff_at)}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="mm-when">Fecha</Label>
          <Input
            id="mm-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mm-scope">Dirigido a</Label>
          <select
            id="mm-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as "club" | "teams")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {canPublishClubWide ? <option value="club">Todo el club</option> : null}
            <option value="teams">Categorías específicas</option>
          </select>
        </div>

        {scope === "teams" ? (
          <div className="space-y-2">
            <Label>Categorías</Label>
            {editableTeams.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tienes categorías donde publicar.</p>
            ) : (
              <div className="space-y-2 rounded-lg bg-white/[0.04] p-3 ring-1 ring-inset ring-white/5">
                {editableTeams.map((t) => (
                  <label key={t.id} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={teamIds.includes(t.id)}
                      onCheckedChange={() => toggleTeam(t.id)}
                    />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <DeleteAction
            label="Eliminar"
            title="¿Eliminar esta publicación?"
            description="Se quitará del feed junto con sus likes y comentarios. Esta acción no se puede deshacer."
            successMessage="Publicación eliminada"
            loading={busy}
            onDelete={handleDelete}
          />
        ) : null}
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancelar
        </Button>
        <Button className="glow-primary" onClick={handleSave} disabled={busy}>
          {isEdit ? "Guardar" : "Publicar"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
