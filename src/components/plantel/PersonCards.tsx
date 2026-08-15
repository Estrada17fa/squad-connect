import * as React from "react";
import { Footprints, Flag, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/squad/StatusBadge";
import type { RosterMember } from "@/hooks/useRoster";
import { AVAILABILITY_META, PREFERRED_FOOT_LABEL } from "@/lib/plantel";
import { initials } from "@/components/usuarios/memberUtils";
import { AccentBar } from "@/components/squad/StandardCard";
import { ACCENT, AVAILABILITY_ACCENT } from "@/lib/accents";

function Frame({
  onClick,
  delay,
  accent,
  accentLabel,
  children,
}: {
  onClick: () => void;
  delay: number;
  accent: string;
  accentLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-card-in glass relative flex w-full items-center gap-3 overflow-hidden p-3 pl-5 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
    >
      <AccentBar color={accent} label={accentLabel} />
      {children}
    </button>
  );
}

export function PlayerCard({
  member,
  index = 0,
  onClick,
}: {
  member: RosterMember;
  index?: number;
  onClick: () => void;
}) {
  const name = member.fullName ?? "Sin nombre";
  const meta = member.availability && member.availability !== "apto" ? AVAILABILITY_META[member.availability] : null;
  const foot = member.preferredFoot ? PREFERRED_FOOT_LABEL[member.preferredFoot] ?? member.preferredFoot : null;

  return (
    <Frame
      onClick={onClick}
      delay={index * 20}
      accent={member.availability ? AVAILABILITY_ACCENT[member.availability] : ACCENT.neutral}
      accentLabel={member.availability ? AVAILABILITY_META[member.availability].label : undefined}
    >
      <div className="relative shrink-0">
        <Avatar className="h-16 w-16 ring-1 ring-white/10">
          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={name} /> : null}
          <AvatarFallback className="font-display text-base">{initials(name)}</AvatarFallback>
        </Avatar>
        {member.jerseyNumber != null ? (
          <span className="absolute -bottom-1.5 -right-1.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1.5 font-display text-sm font-extrabold leading-none text-primary-foreground shadow-lg">
            {member.jerseyNumber}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate font-display text-base font-semibold leading-tight text-foreground">{name}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
            {member.position ?? "Sin posición"}
          </span>
          {meta ? <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge> : null}
        </div>
        {foot || member.nationality ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {foot ? (
              <span className="inline-flex items-center gap-1">
                <Footprints className="h-3.5 w-3.5" /> {foot}
              </span>
            ) : null}
            {member.nationality ? (
              <span className="inline-flex items-center gap-1">
                <Flag className="h-3.5 w-3.5" /> {member.nationality}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Frame>
  );
}

export function StaffCard({
  member,
  index = 0,
  onClick,
}: {
  member: RosterMember;
  index?: number;
  onClick: () => void;
}) {
  const name = member.fullName ?? "Sin nombre";
  const title = member.jobTitle ?? member.roleName ?? "Staff";
  return (
    <Frame onClick={onClick} delay={index * 20} accent={ACCENT.brand}>
      <Avatar className="h-11 w-11 shrink-0">
        {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={name} /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-semibold text-foreground">{name}</p>
        <p className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{title}</span>
        </p>
      </div>
    </Frame>
  );
}
