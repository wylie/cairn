import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { FORM_CONTROL_CLASS, FORM_ERROR_CLASS, FORM_HELPER_CLASS, FORM_LABEL_CLASS } from "@/components/shared/form-layout";

const HEX_PATTERN = /^#([0-9A-Fa-f]{6})$/;

type ColorPickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
  className?: string;
};

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value);
}

export function normalizeHexColor(value: string, fallback = "#0693C2"): string {
  const trimmed = value.trim();
  if (isValidHexColor(trimmed)) return trimmed.toUpperCase();
  return fallback;
}

export function ColorPickerField({ label, value, onChange, helperText, disabled, className }: ColorPickerFieldProps) {
  const isValid = useMemo(() => isValidHexColor(value), [value]);
  const pickerValue = isValid ? value : "#000000";

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className={FORM_LABEL_CLASS}>{label}</label>
      <div className="grid grid-cols-[56px_1fr] items-center gap-2">
        <input
          aria-label={`${label} picker`}
          type="color"
          value={pickerValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className={cn(
            "h-11 w-14 cursor-pointer rounded-md border border-input bg-white p-1 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !isValid ? "border-amber-500" : ""
          )}
        />
        <input
          aria-label={label}
          type="text"
          inputMode="text"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(FORM_CONTROL_CLASS, !isValid ? "border-amber-500" : "")}
          placeholder="#000000"
        />
      </div>
      {helperText ? <p className={FORM_HELPER_CLASS}>{helperText}</p> : null}
      {!isValid ? <p className={FORM_ERROR_CLASS}>Enter a valid 6-digit hex color (for example, #0E9AC8).</p> : null}
    </div>
  );
}
