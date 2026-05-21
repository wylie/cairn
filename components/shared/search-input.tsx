import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  autoFocus,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <label className="relative block w-full">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={`pl-9 ${className ?? ""}`.trim()}
        autoFocus={autoFocus}
      />
    </label>
  );
}
