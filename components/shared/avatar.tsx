import { cn } from "@/lib/utils";

const sizeClassMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-[72px] w-[72px] text-base",
  xl: "h-[120px] w-[120px] text-lg"
} as const;

export type AvatarSize = keyof typeof sizeClassMap;

export function Avatar({
  name,
  photoUrl,
  alt,
  size = "md",
  sizeClassName,
  className
}: {
  name: string;
  photoUrl?: string | null;
  alt?: string;
  size?: AvatarSize;
  sizeClassName?: string;
  className?: string;
}) {
  const resolvedName = name.trim() || "Person";
  const nameParts = resolvedName.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.[0] ?? "";
  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1]?.[0] ?? "" : "";
  const initials = `${firstInitial}${lastInitial}`.toUpperCase() || "P";
  const resolvedSizeClassName = sizeClassName ?? sizeClassMap[size];
  const sharedClassName = cn(
    "aspect-square shrink-0 overflow-hidden rounded-full border border-border/90 bg-card object-cover shadow-[0_1px_2px_rgba(16,24,40,0.08)]",
    resolvedSizeClassName,
    className
  );

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={alt ?? `${resolvedName} profile photo`}
        className={sharedClassName}
        loading="lazy"
      />
    );
  }

  return (
    <div
      aria-label={alt ?? `${resolvedName} initials avatar`}
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center rounded-full border border-border/90 bg-secondary font-semibold text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.08)]",
        resolvedSizeClassName,
        className
      )}
    >
      {initials}
    </div>
  );
}
