import { Avatar, type AvatarSize } from "@/components/shared/avatar";
import type { Customer } from "@/types/domain";

export function StaffAvatar({
  staff,
  photoUrl,
  name,
  size = "md",
  sizeClassName,
  className
}: {
  staff?: Pick<Customer, "firstName" | "lastName" | "profilePhotoUrl">;
  photoUrl?: string | null;
  name?: string;
  size?: AvatarSize;
  sizeClassName?: string;
  className?: string;
}) {
  const resolvedName = name?.trim() || (staff ? `${staff.firstName} ${staff.lastName}`.trim() : "Staff member");
  const resolvedPhotoUrl = photoUrl ?? staff?.profilePhotoUrl;

  return (
    <Avatar
      name={resolvedName}
      photoUrl={resolvedPhotoUrl}
      alt={resolvedPhotoUrl ? `${resolvedName} staff photo` : `${resolvedName} staff initials avatar`}
      size={size}
      sizeClassName={sizeClassName}
      className={className}
    />
  );
}
