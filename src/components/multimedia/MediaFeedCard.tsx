import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Download, Heart, MessageCircle, Maximize2, Swords } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/calendar-utils";
import { MEDIA_TYPE_ICON, MEDIA_TYPE_LABEL } from "@/lib/multimedia";
import {
  downloadMediaFile,
  useMediaUrls,
  useToggleMediaLike,
  type MediaPost,
} from "@/hooks/useMultimedia";
import { MediaCarousel } from "./MediaCarousel";
import { MediaLightbox } from "./MediaLightbox";
import { MediaComments } from "./MediaComments";

function initials(name: string | null) {
  return (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Tarjeta del feed: media protagonista + acciones + comentarios. */
export function MediaFeedCard({
  post,
  userId,
  canModerate,
}: {
  post: MediaPost;
  userId: string;
  canModerate: boolean;
}) {
  const urlsQ = useMediaUrls(post.files.map((f) => f.storage_path));
  const urls = urlsQ.data ?? {};
  const [index, setIndex] = React.useState(0);
  const [full, setFull] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const toggleLike = useToggleMediaLike(userId);
  const TypeIcon = MEDIA_TYPE_ICON[post.type];
  const audience =
    post.audience === "club"
      ? "Todo el club"
      : post.teams.map((t) => t.name).filter(Boolean).join(", ") || "Categorías";

  return (
    <article className="glass overflow-hidden p-3 sm:p-4">
      <header className="mb-3 flex items-start gap-2.5">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={post.author?.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="text-[10px]">{initials(post.author?.full_name ?? null)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {post.author?.full_name ?? "Club"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateTime(post.published_at)} · {audience}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">
          <TypeIcon className="h-3.5 w-3.5" />
          {MEDIA_TYPE_LABEL[post.type]}
        </span>
      </header>

      <MediaCarousel
        files={post.files}
        urls={urls}
        index={Math.min(index, Math.max(post.files.length - 1, 0))}
        onIndexChange={setIndex}
        onOpenFull={() => setFull(true)}
      />

      <div className="mt-3 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn("px-2", post.liked && "text-primary")}
          onClick={() => toggleLike.mutate(post)}
        >
          <Heart className={cn("mr-1.5 h-4 w-4", post.liked && "fill-current")} />
          <span className="tabular-nums">{post.likeCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          <span className="tabular-nums">{post.commentCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          aria-label="Descargar"
          onClick={async () => {
            const file = post.files[index] ?? post.files[0];
            if (!file) return;
            try {
              await downloadMediaFile(file);
            } catch (e: any) {
              toast.error(e?.message ?? "No se pudo descargar");
            }
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto px-2"
          aria-label="Ver en pantalla completa"
          onClick={() => setFull(true)}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {post.title ? (
        <p className="mt-2 break-words font-display font-semibold text-foreground [overflow-wrap:anywhere]">
          {post.title}
        </p>
      ) : null}
      {post.description ? (
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/80 [overflow-wrap:anywhere]">
          {post.description}
        </p>
      ) : null}

      {post.match ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-foreground/80">
          <TeamCrest path={post.match.rivalCrest} name={post.match.rival ?? "rival"} className="h-4 w-4" />
          vs {post.match.rival ?? "rival"}
          {post.match.matchday ? ` · Jornada ${post.match.matchday}` : ""}
        </span>
      ) : null}


      {showComments ? (
        <div className="mt-3 border-t border-white/5 pt-3">
          <MediaComments postId={post.id} userId={userId} canModerate={canModerate} />
        </div>
      ) : null}

      <MediaLightbox
        open={full}
        onOpenChange={setFull}
        files={post.files}
        urls={urls}
        index={Math.min(index, Math.max(post.files.length - 1, 0))}
        onIndexChange={setIndex}
      />
    </article>
  );
}
