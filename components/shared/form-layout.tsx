import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormGrid({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)} aria-label={label}>
      {children}
    </div>
  );
}

export function FormField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("space-y-1 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ToggleField({ label, checked, onChange, ariaLabel, className }: { label: string; checked: boolean; onChange: (checked: boolean) => void; ariaLabel: string; className?: string }) {
  return (
    <div className={cn("space-y-1 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <label className="flex h-11 items-center gap-2 rounded-md border border-input bg-white px-3">
        <input
          aria-label={ariaLabel}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{checked ? "Enabled" : "Disabled"}</span>
      </label>
    </div>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex flex-wrap gap-2">{children}</div>;
}
