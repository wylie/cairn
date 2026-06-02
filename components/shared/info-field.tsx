import { cn } from "@/lib/utils";

export function InfoField({
  label,
  value,
  warning,
  className,
  valueClassName
}: {
  label: string;
  value: string;
  warning?: boolean;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("break-words text-sm font-medium leading-5 text-foreground", warning ? "text-amber-700" : "", valueClassName)}>
        {value}
      </p>
    </div>
  );
}
