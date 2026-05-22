import { Search } from "lucide-react";
import type { KeyboardEventHandler } from "react";
import { Input } from "@/components/ui/input";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  showLabel = false,
  autoFocus,
  className,
  onKeyDown
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  showLabel?: boolean;
  autoFocus?: boolean;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="space-y-1">
      {showLabel ? <span className="text-sm text-muted-foreground">{label}</span> : <span className="sr-only">{label}</span>}
      <label className="relative block w-full">
        <Search data-testid="search-input-icon" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className={`h-11 pl-9 ${className ?? ""}`.trim()}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
        />
      </label>
    </div>
  );
}
