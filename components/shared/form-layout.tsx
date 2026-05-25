import type React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const FORM_CONTROL_CLASS =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
export const FORM_TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y";
export const FORM_LABEL_CLASS = "text-sm font-medium text-muted-foreground";
export const FORM_HELPER_CLASS = "text-xs text-muted-foreground";
export const FORM_ERROR_CLASS = "text-xs text-amber-700";

export function FormGrid({
  children,
  className,
  label,
  ...props
}: { children: ReactNode; className?: string; label?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2", className)} aria-label={label} {...props}>
      {children}
    </div>
  );
}

export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

export function FormSection({
  title,
  description,
  children,
  className
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className={FORM_HELPER_CLASS}>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FormField({
  label,
  children,
  helperText,
  errorText,
  className
}: {
  label: string;
  children: ReactNode;
  helperText?: string;
  errorText?: string;
  className?: string;
}) {
  return (
    <label className={cn("space-y-1.5 text-sm", className)}>
      <span className={FORM_LABEL_CLASS}>{label}</span>
      {children}
      {helperText ? <span className={FORM_HELPER_CLASS}>{helperText}</span> : null}
      {errorText ? <span className={FORM_ERROR_CLASS}>{errorText}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FORM_CONTROL_CLASS, props.className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(FORM_CONTROL_CLASS, props.className)} />;
}

export function TextareaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(FORM_TEXTAREA_CLASS, props.className)} />;
}

export function CheckboxField({
  label,
  checked,
  onChange,
  ariaLabel,
  helperText,
  className
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  helperText?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm">
        <input aria-label={ariaLabel ?? label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
      {helperText ? <p className={FORM_HELPER_CLASS}>{helperText}</p> : null}
    </div>
  );
}

export function RadioField({
  label,
  checked,
  onChange,
  name,
  value,
  ariaLabel,
  helperText,
  className
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  value: string;
  ariaLabel?: string;
  helperText?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm">
        <input
          aria-label={ariaLabel ?? label}
          type="radio"
          checked={checked}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
      {helperText ? <p className={FORM_HELPER_CLASS}>{helperText}</p> : null}
    </div>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
  ariaLabel,
  className
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <CheckboxField label={label} checked={checked} ariaLabel={ariaLabel} onChange={onChange} helperText={checked ? "Enabled" : "Disabled"} className={className} />
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>;
}
