import { cn } from "@/lib/utils";
import type { Customer } from "@/types/domain";

export function CustomerAvatar({
  customer,
  sizeClassName = "h-10 w-10",
  className
}: {
  customer: Pick<Customer, "firstName" | "lastName" | "profilePhotoUrl">;
  sizeClassName?: string;
  className?: string;
}) {
  const initials = `${customer.firstName[0] ?? ""}${customer.lastName[0] ?? ""}`.toUpperCase();
  const label = `${customer.firstName} ${customer.lastName}`;

  if (customer.profilePhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customer.profilePhotoUrl}
        alt={`${label} profile photo`}
        className={cn("rounded-full border object-cover", sizeClassName, className)}
      />
    );
  }

  return (
    <div
      aria-label={`${label} initials avatar`}
      className={cn(
        "flex items-center justify-center rounded-full border bg-secondary text-xs font-semibold text-foreground",
        sizeClassName,
        className
      )}
    >
      {initials}
    </div>
  );
}
