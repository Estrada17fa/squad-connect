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
import { supabase } from "@/integrations/supabase/client";
import type { TeamOption } from "@/hooks/useAccess";
import {
  ANNOUNCEMENT_BUCKET,
  PRIORITY_LABEL,
  useDeleteAnnouncement,
  useSaveAnnouncement,
  type AnnouncementPriority,
  type AnnouncementRow,
} from "@/hooks/useAnnouncements";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Categorías donde el usuario puede publicar. */
  teams: TeamOption[];
  /** Solo editor_global puede dirigir a todo el club. */
  canPublishClubWide: boolean;
  announcement?: AnnouncementRow | null;
  /** Se ejecuta tras eliminar (para cerrar también la ficha de lectura). */
  onDeleted?: () => void;
}

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  teams,
  canPublishClubWide,
  announcement,
}: Props) {
  const isEdit = !!announcement;
  const save = useSaveAnnouncement();
  const del = useDeleteAnnouncement();

  const editableTeams = React.useMemo(
    () => teams.flatMap((t) => (t.id ? [{ id: t.id, name: t.name }] : [])),
    [teams],
  );

  const [scope, setScope] = React.useState<"club" | "teams">("teams");
  const [teamIds, setTeamIds] = React.useState<string[]>([]);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [priority, setPriority] = React.useState<AnnouncementPriority>("normal");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setScope(announcement?.audience ?? (canPublishClubWide ? "club" : "teams"));
    setTeamIds(announcement?.teams.map((t) => t.team_id) ?? []);
    setTitle(announcement?.title ?? "");
    setBody(announcement?.body ?? "");
    setPriority(announcement?.priority ?? "normal");
    setFile(null);
  }, [open, announcement, canPublishClubWide]);

  function toggleTeam(id: string) {
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!title.trim()) return toast.error("El título es obligatorio");
    if (!body.trim()) return toast.error("El contenido es obligatorio");
    if (scope === "teams" && teamIds.length === 0)
      return toast.error("Selecciona al menos una categoría");

    setBusy(true);
    try {
      let path = announcement?.attachment_path ?? null;
      let name = announcement?.attachment_name ?? null;
      let type = announcement?.attachment_type ?? null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const newPath = `${clubId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(ANNOUNCEMENT_BUCKET).upload(newPath, file);
        if (error) throw error;
        if (path) await supabase.storage.from(ANNOUNCEMENT_BUCKET).remove([path]);
        path = newPath;
        name = file.name;
        type = file.type || null;
      }

      await save.mutateAsync({
        id: announcement?.id,
        club_id: clubId,
        title: title.trim(),
        body: body.trim(),
        priority,
        audience: scope,
        teamIds: scope === "teams" ? teamIds : [],
        attachment_path: path,
        attachment_name: name,
        attachment_type: type,
        author_id: userId,
      });
      toast.success(isEdit ? "Comunicado actualizado" : "Comunicado publicado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!announcement) return;
    try {
      await del.mutateAsync(announcement);
      toast.success("Comunicado eliminado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar comunicado" : "Nuevo comunicado"}</EntitySheetTitle>
        <EntitySheetDescription>
          Se publica en el tablón y avisa a las personas destinatarias.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="an-title">Título</Label>
          <Input
            id="an-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p.ej. Cambio de horario del entrenamiento"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="an-body">Contenido</Label>
          <Textarea
            id="an-body"
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe el aviso completo…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="an-priority">Prioridad</Label>
          <select
            id="an-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {(["normal", "importante", "urgente"] as AnnouncementPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="an-scope">Dirigido a</Label>
          <select
            id="an-scope"
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
              <p className="text-xs text-muted-foreground">
                No tienes categorías donde publicar.
              </p>
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

        <div className="space-y-1.5">
          <Label htmlFor="an-file">Adjunto (imagen o PDF)</Label>
          <label
            htmlFor="an-file"
            className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground"
          >
            <Upload className="h-4 w-4" />
            <span className="truncate">
              {file ? file.name : announcement?.attachment_name ?? "Subir archivo"}
            </span>
          </label>
          <input
            id="an-file"
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <Button variant="ghost" className="text-destructive" onClick={handleDelete} disabled={busy}>
            Eliminar
          </Button>
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
