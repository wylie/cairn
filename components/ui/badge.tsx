import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "danger" | "muted";

const toneClasses: Record<BadgeTone, string> = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
  muted: "bg-slate-100 text-slate-700"
};

export function Badge({
  children,
  className,
  tone = "default"
}: {
  children: React.ReactNode;
  className?: string;
  tone?: BadgeTone;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}>
      {children}
    </span>
  );
}
