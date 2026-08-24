import * as React from "react";
import { AlertTriangle, FileText, Info, Megaphone } from "lucide-react";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/components/usuarios/memberUtils";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, useAttachmentUrl, type AnnouncementPriority } from "@/hooks/useAnnouncements";


const PRIORITY_VARIANT: Record<AnnouncementPriority, StatusVariant> = {
  urgente: "rejected",
  importante: "pending",
  normal: "neutral",
};

const PRIORITY_ICON: Record<AnnouncementPriority, React.ComponentType<{ className?: string }>> = {
  urgente: AlertTriangle,
  importante: Info,
  normal: Megaphone,
};

export function PriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <StatusBadge variant={PRIORITY_VARIANT[priority]}>
      <Icon className="mr-1 h-3 w-3" />
      {PRIORITY_LABEL[priority]}
    </StatusBadge>
  );
}

export function AnnouncementChip({
  icon: Icon,
  avatarUrl,
  avatarName,
  children,
  tone = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  /** Foto de perfil (autor). Si no hay, se muestran las iniciales de `avatarName`. */
  avatarUrl?: string | null;
  avatarName?: string | null;
  children: React.ReactNode;
  tone?: "default" | "primary";
}) {
  const showAvatar = avatarUrl !== undefined || avatarName !== undefined;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-0.5 text-xs ring-1 ring-inset ring-white/5",
        showAvatar ? "pl-0.5 pr-2.5" : "px-2.5",
        tone === "primary"
          ? "bg-primary/10 text-primary"
          : "bg-white/[0.06] text-muted-foreground",
      )}
    >
      {showAvatar ? (
        <Avatar className="h-5 w-5">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-white/10 text-[9px] font-medium">
            {initials(avatarName || "?")}
          </AvatarFallback>
        </Avatar>
      ) : Icon ? (
        <Icon className="h-3 w-3" />
      ) : null}
      {children}
    </span>
  );
}


/** Vista previa del adjunto privado: imagen inline o enlace al PDF. */
export function AttachmentPreview({
  path,
  name,
  type,
}: {
  path: string;
  name?: string | null;
  type?: string | null;
}) {
  const { data: url, isLoading } = useAttachmentUrl(path);
  const isImage = (type ?? "").startsWith("image/");

  if (isLoading) {
    return <div className="h-40 w-full animate-pulse rounded-lg bg-white/[0.06]" />;
  }
  if (!url) return null;

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={name ?? "Adjunto del comunicado"}
          loading="lazy"
          className="max-h-80 w-full rounded-lg object-contain ring-1 ring-inset ring-white/5"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3 ring-1 ring-inset ring-white/5 transition-colors hover:bg-white/[0.07]"
    >
      <FileText className="h-5 w-5 shrink-0 text-primary" />
      <span className="min-w-0 truncate text-sm text-foreground">{name ?? "Ver adjunto"}</span>
    </a>
  );
}
