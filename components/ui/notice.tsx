import { cn } from "@/lib/utils";

type NoticeTone = "success" | "warning" | "danger" | "info";

const toneClasses: Record<NoticeTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-sky-200 bg-sky-50 text-sky-900"
};

export function Notice({
  children,
  tone = "info",
  className,
  role
}: {
  children: React.ReactNode;
  tone?: NoticeTone;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </div>
  );
}
