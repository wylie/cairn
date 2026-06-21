import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatReleaseType, type ReleaseType } from "@/lib/version";
import type { ReleaseNoteSection } from "@/lib/releases/release-notes";

type ReleaseBadgeProps = {
  className?: string;
};

const versionBadgeClass = "border-slate-300 bg-slate-100 text-slate-800";

const releaseTypeClasses: Record<ReleaseType, string> = {
  major: "border-rose-200 bg-rose-100 text-rose-800",
  minor: "border-indigo-200 bg-indigo-100 text-indigo-800",
  patch: "border-cyan-200 bg-cyan-100 text-cyan-800"
};

const releaseSectionClasses: Record<ReleaseNoteSection, string> = {
  added: "border-emerald-200 bg-emerald-100 text-emerald-800",
  improved: "border-sky-200 bg-sky-100 text-sky-800",
  changed: "border-yellow-200 bg-yellow-100 text-yellow-800",
  fixed: "border-slate-300 bg-slate-100 text-slate-700",
  knownIssues: "border-amber-200 bg-amber-100 text-amber-800"
};

const releaseSectionLabels: Record<ReleaseNoteSection, string> = {
  added: "Added",
  improved: "Improved",
  fixed: "Fixed",
  changed: "Changed",
  knownIssues: "Known Issues"
};

export function getVersionBadgeClass() {
  return versionBadgeClass;
}

export function getReleaseTypeBadgeClass(type: ReleaseType) {
  return releaseTypeClasses[type];
}

export function getReleaseSectionBadgeClass(section: ReleaseNoteSection) {
  return releaseSectionClasses[section];
}

export function getReleaseSectionLabel(section: ReleaseNoteSection) {
  return releaseSectionLabels[section];
}

export function ReleaseTypeBadge({ releaseType, className }: ReleaseBadgeProps & { releaseType: ReleaseType }) {
  return (
    <Badge tone="muted" className={cn(getReleaseTypeBadgeClass(releaseType), className)}>
      {formatReleaseType(releaseType)}
    </Badge>
  );
}

export function VersionBadge({ version, className }: ReleaseBadgeProps & { version: string }) {
  return (
    <Badge tone="muted" className={cn(getVersionBadgeClass(), className)}>
      v{version.replace(/^v/i, "")}
    </Badge>
  );
}

export function ReleaseSectionBadge({ section, className }: ReleaseBadgeProps & { section: ReleaseNoteSection }) {
  return (
    <Badge tone="muted" className={cn(getReleaseSectionBadgeClass(section), className)}>
      {getReleaseSectionLabel(section)}
    </Badge>
  );
}
