import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "danger" | "muted";

const toneClasses: Record<BadgeTone, string> = {
  default: "border border-slate-200 bg-secondary/70 text-secondary-foreground",
  success: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  warning: "border border-amber-200 bg-amber-100 text-amber-800",
  danger: "border border-rose-200 bg-rose-100 text-rose-800",
  muted: "border border-slate-200 bg-slate-100 text-slate-700"
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
    <span
      className={cn(
        "inline-flex min-h-7 items-center justify-center rounded-full px-3 py-1 text-center text-[11px] font-semibold leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
