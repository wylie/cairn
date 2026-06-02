import { Avatar, type AvatarSize } from "@/components/shared/avatar";
import type { Household } from "@/types/domain";

export function HouseholdAvatar({
  household,
  photoUrl,
  name,
  size = "md",
  sizeClassName,
  className
}: {
  household?: Pick<Household, "householdName" | "profilePhotoUrl">;
  photoUrl?: string | null;
  name?: string;
  size?: AvatarSize;
  sizeClassName?: string;
  className?: string;
}) {
  const resolvedName = name?.trim() || household?.householdName?.trim() || "Household";
  const resolvedPhotoUrl = photoUrl ?? household?.profilePhotoUrl;

  return (
    <Avatar
      name={resolvedName}
      photoUrl={resolvedPhotoUrl}
      alt={resolvedPhotoUrl ? `${resolvedName} household photo` : `${resolvedName} household initials avatar`}
      size={size}
      sizeClassName={sizeClassName}
      className={className}
    />
  );
}
