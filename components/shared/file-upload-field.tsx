import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FORM_CONTROL_CLASS, FORM_HELPER_CLASS, FORM_LABEL_CLASS } from "@/components/shared/form-layout";

type FileUploadFieldProps = {
  label: string;
  accept?: string;
  filename?: string;
  helperText?: string;
  onFileSelect: (file: File | null) => void;
  onRemove?: () => void;
  className?: string;
};

export function FileUploadField({ label, accept, filename, helperText, onFileSelect, onRemove, className }: FileUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={inputId} className={FORM_LABEL_CLASS}>
        {label}
      </label>
      <div className={cn(FORM_CONTROL_CLASS, "flex items-center justify-between gap-2 py-0 pr-1 pl-2")}>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => onFileSelect(event.currentTarget.files?.[0] ?? null)}
        />
        <span className="truncate text-sm text-muted-foreground">{filename || "No file selected"}</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="secondary" className="h-9" onClick={() => inputRef.current?.click()}>
            {filename ? "Replace" : "Choose file"}
          </Button>
          {filename && onRemove ? (
            <Button type="button" variant="secondary" className="h-9" onClick={onRemove}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {helperText ? <p className={FORM_HELPER_CLASS}>{helperText}</p> : null}
    </div>
  );
}
