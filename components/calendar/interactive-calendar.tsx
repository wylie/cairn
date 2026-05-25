import type { SessionScheduleCardModel, ScheduleView } from "@/lib/data/session-schedule";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  return parsed;
}

function formatTime(dateIso: string) {
  return new Date(dateIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatRange(startIso: string, endIso: string) {
  return `${formatTime(startIso)}–${formatTime(endIso)}`;
}

function addDays(date: Date, delta: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function viewTitle(view: ScheduleView, dateKey: string) {
  const date = fromDateKey(dateKey);
  if (view === "month") return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (view === "week") {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function shiftDate(dateKey: string, view: ScheduleView, direction: -1 | 1) {
  const base = fromDateKey(dateKey);
  const amount = view === "month" ? 30 : view === "week" ? 7 : 1;
  base.setDate(base.getDate() + amount * direction);
  return toDateKey(base);
}

function statusTone(status?: string) {
  if (status === "cancelled") return "danger" as const;
  if (status === "completed") return "success" as const;
  return "muted" as const;
}

function sessionColor(category?: string) {
  switch (category) {
    case "camp":
      return "border-amber-300 bg-amber-50";
    case "class":
      return "border-sky-300 bg-sky-50";
    case "clinic":
      return "border-purple-300 bg-purple-50";
    case "course":
      return "border-emerald-300 bg-emerald-50";
    default:
      return "border-border bg-card";
  }
}

export function InteractiveCalendar({
  view,
  dateKey,
  entries,
  onViewChange,
  onDateKeyChange,
  onOpenSession,
  onEditSession,
  onCreateAtSlot
}: {
  view: ScheduleView;
  dateKey: string;
  entries: SessionScheduleCardModel[];
  onViewChange: (view: ScheduleView) => void;
  onDateKeyChange: (dateKey: string) => void;
  onOpenSession: (sessionId: string) => void;
  onEditSession: (sessionId: string) => void;
  onCreateAtSlot: (prefill: { date: string; startTime: string; endTime: string }) => void;
}) {
  const selectedDate = fromDateKey(dateKey);
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthGridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index));
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  const sessionsByDay = new Map<string, SessionScheduleCardModel[]>();
  for (const entry of entries) {
    const key = entry.session.startsAt.slice(0, 10);
    const existing = sessionsByDay.get(key) ?? [];
    existing.push(entry);
    sessionsByDay.set(key, existing);
  }
  for (const [key, value] of sessionsByDay) {
    value.sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt));
    sessionsByDay.set(key, value);
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3" aria-label="interactive-calendar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-9" onClick={() => onDateKeyChange(shiftDate(dateKey, view, -1))}>Previous</Button>
          <Button variant="secondary" className="h-9" onClick={() => onDateKeyChange(toDateKey(new Date()))}>Today</Button>
          <Button variant="secondary" className="h-9" onClick={() => onDateKeyChange(shiftDate(dateKey, view, 1))}>Next</Button>
        </div>
        <p className="text-sm font-medium">{viewTitle(view, dateKey)}</p>
        <div className="flex items-center gap-2">
          <input
            aria-label="Calendar jump date"
            type="date"
            value={dateKey}
            onChange={(event) => onDateKeyChange(event.target.value)}
            className="h-9 rounded-md border border-input bg-white px-2 text-sm"
          />
          <div className="flex items-center gap-1">
            {(["day", "week", "month", "agenda"] as ScheduleView[]).map((entry) => (
              <Button key={entry} className="h-9" variant={entry === view ? "primary" : "secondary"} onClick={() => onViewChange(entry)}>
                {entry[0].toUpperCase() + entry.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {view === "agenda" ? (
        <div className="space-y-2" data-testid="agenda-list">
          {entries.length === 0 ? <p className="rounded-md border px-3 py-4 text-sm text-muted-foreground">No sessions in this date range.</p> : null}
          {entries.map((entry) => (
            <article key={entry.session.id} className={`rounded-md border p-2 ${sessionColor(entry.program?.category)}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{entry.session.title ?? entry.program?.title ?? "Session"}</p>
                  <p className="text-xs text-muted-foreground">{entry.session.startsAt.slice(0, 10)} • {formatRange(entry.session.startsAt, entry.session.endsAt)}</p>
                  <p className="text-xs text-muted-foreground">{entry.session.instructorName ?? "Unassigned"} • {entry.registrationCount} / {entry.session.capacity}</p>
                </div>
                <Badge tone={statusTone(entry.session.status)}>{entry.session.status ?? "scheduled"}</Badge>
              </div>
              <div className="mt-2 flex gap-2">
                <Button className="h-8" variant="secondary" onClick={() => onOpenSession(entry.session.id)}>Open</Button>
                <Button className="h-8" variant="secondary" onClick={() => onEditSession(entry.session.id)}>Edit</Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-2" data-testid="month-grid">
          {monthDays.map((day) => {
            const dayKey = toDateKey(day);
            const dayEntries = sessionsByDay.get(dayKey) ?? [];
            const inMonth = day.getMonth() === selectedDate.getMonth();
            return (
              <section key={dayKey} className={`min-h-28 rounded-md border p-2 ${inMonth ? "bg-card" : "bg-secondary/20"}`}>
                <button
                  className="text-xs font-medium"
                  onClick={() => onDateKeyChange(dayKey)}
                >
                  {day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                </button>
                <div className="mt-1 space-y-1">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <button
                      key={entry.session.id}
                      onClick={() => onOpenSession(entry.session.id)}
                      className={`block w-full rounded border px-1 py-0.5 text-left text-[11px] ${sessionColor(entry.program?.category)}`}
                    >
                      <p className="truncate font-medium">{entry.session.title ?? entry.program?.title ?? "Session"}</p>
                      <p className="truncate">{formatTime(entry.session.startsAt)} • {entry.registrationCount}/{entry.session.capacity}</p>
                    </button>
                  ))}
                  {dayEntries.length > 3 ? <p className="text-[11px] text-muted-foreground">+{dayEntries.length - 3} more</p> : null}
                  <Button
                    className="h-7 w-full text-xs"
                    variant="ghost"
                    onClick={() => onCreateAtSlot({ date: dayKey, startTime: "09:00", endTime: "10:00" })}
                  >
                    Add
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {(view === "day" || view === "week") ? (
        <div className="overflow-auto" data-testid={`${view}-grid`}>
          <div className={`grid min-w-[900px] gap-2 ${view === "day" ? "grid-cols-[80px_1fr]" : "grid-cols-[80px_repeat(7,minmax(0,1fr))]"}`}>
            <div />
            {(view === "day" ? [selectedDate] : weekDays).map((day) => (
              <div key={toDateKey(day)} className="px-1 text-xs font-medium text-muted-foreground">
                {day.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}
              </div>
            ))}
            {hours.map((hour) => (
              <div key={`hour-row-${hour}`} className="contents">
                <div key={`label-${hour}`} className="pt-2 text-xs text-muted-foreground">{hour % 12 === 0 ? 12 : hour % 12}:00 {hour < 12 ? "AM" : "PM"}</div>
                {(view === "day" ? [selectedDate] : weekDays).map((day) => {
                  const dayKey = toDateKey(day);
                  const dayEntries = sessionsByDay.get(dayKey) ?? [];
                  const rowEntries = dayEntries.filter((entry) => new Date(entry.session.startsAt).getHours() === hour);
                  return (
                    <div key={`${dayKey}-${hour}`} className="min-h-16 rounded-md border bg-background p-1">
                      <button
                        className="mb-1 w-full rounded border border-dashed px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary"
                        onClick={() => onCreateAtSlot({ date: dayKey, startTime: `${String(hour).padStart(2, "0")}:00`, endTime: `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00` })}
                      >
                        + Add
                      </button>
                      <div className="space-y-1">
                        {rowEntries.map((entry) => (
                          <button
                            key={entry.session.id}
                            onClick={() => onOpenSession(entry.session.id)}
                            className={`block w-full rounded border px-1 py-0.5 text-left text-[11px] ${sessionColor(entry.program?.category)}`}
                          >
                            <p className="truncate font-medium">{entry.session.title ?? entry.program?.title ?? "Session"}</p>
                            <p className="truncate">{formatRange(entry.session.startsAt, entry.session.endsAt)}</p>
                            <p className="truncate">{entry.registrationCount}/{entry.session.capacity}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
