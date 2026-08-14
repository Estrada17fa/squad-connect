import * as React from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  useAddMediaComment,
  useDeleteMediaComment,
  useMediaComments,
  type MediaComment,
} from "@/hooks/useMultimedia";

function initials(name: string | null) {
  return (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Hilo de comentarios de una publicación. */
export function MediaComments({
  postId,
  userId,
  canModerate,
}: {
  postId: string;
  userId: string;
  canModerate: boolean;
}) {
  const q = useMediaComments(postId);
  const add = useAddMediaComment();
  const del = useDeleteMediaComment();
  const [text, setText] = React.useState("");

  async function send() {
    const body = text.trim();
    if (!body) return;
    try {
      await add.mutateAsync({ post_id: postId, user_id: userId, body });
      setText("");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo comentar");
    }
  }

  async function remove(c: MediaComment) {
    try {
      await del.mutateAsync(c);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar el comentario");
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {(q.data ?? []).map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={c.author?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-[10px]">{initials(c.author?.full_name ?? null)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.author?.full_name ?? "Miembro"}</span>
                {" · "}
                {formatDateTime(c.created_at)}
              </p>
              <p className="break-words text-sm text-foreground/90 [overflow-wrap:anywhere]">{c.body}</p>
            </div>
            {c.user_id === userId || canModerate ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Eliminar comentario"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(c)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        ))}
        {q.data && q.data.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sé el primero en comentar.</p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Escribe un comentario"
        />
        <Button
          size="icon"
          aria-label="Enviar comentario"
          onClick={() => void send()}
          disabled={add.isPending || !text.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
