import { cn } from "@/lib/utils";
import type { Customer } from "@/types/domain";

const sizeClassMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-[72px] w-[72px] text-base",
  xl: "h-[120px] w-[120px] text-lg"
} as const;

type CustomerAvatarSize = keyof typeof sizeClassMap;

export function CustomerAvatar({
  customer,
  photoUrl,
  name,
  size = "md",
  sizeClassName,
  className
}: {
  customer?: Pick<Customer, "firstName" | "lastName" | "profilePhotoUrl">;
  photoUrl?: string | null;
  name?: string;
  size?: CustomerAvatarSize;
  sizeClassName?: string;
  className?: string;
}) {
  const resolvedName = name?.trim() || (customer ? `${customer.firstName} ${customer.lastName}`.trim() : "Customer");
  const resolvedPhotoUrl = photoUrl ?? customer?.profilePhotoUrl;
  const nameParts = resolvedName.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.[0] ?? "";
  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1]?.[0] ?? "" : "";
  const initials = `${firstInitial}${lastInitial}`.toUpperCase() || "C";
  const resolvedSizeClassName = sizeClassName ?? sizeClassMap[size];

  if (resolvedPhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedPhotoUrl}
        alt={`${resolvedName} profile photo`}
        className={cn("rounded-full border object-cover", resolvedSizeClassName, className)}
      />
    );
  }

  return (
    <div
      aria-label={`${resolvedName} initials avatar`}
      className={cn(
        "flex items-center justify-center rounded-full border bg-secondary text-xs font-semibold text-foreground",
        resolvedSizeClassName,
        className
      )}
    >
      {initials}
    </div>
  );
}
