import type { ScheduleView } from "@/lib/data/session-schedule";
import { Button } from "@/components/ui/button";

export function ScheduleViewToggle({ view, onChange }: { view: ScheduleView; onChange: (next: ScheduleView) => void }) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Schedule view">
      {([
        ["day", "Day"],
        ["week", "Week"],
        ["month", "Month"],
        ["agenda", "Agenda"]
      ] as const).map(([value, label]) => (
        <Button
          key={value}
          variant={view === value ? "default" : "outline"}
          className="h-10"
          role="tab"
          aria-selected={view === value}
          onClick={() => onChange(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
