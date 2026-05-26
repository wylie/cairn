import type { SessionScheduleCardModel, ScheduleView } from "@/lib/data/session-schedule";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";

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

function getSessionDisplay(entry: SessionScheduleCardModel) {
  const programName = entry.program?.title ?? "Session";
  const overrideTitle = entry.session.title?.trim();
  if (!overrideTitle || overrideTitle.toLowerCase() === programName.toLowerCase()) {
    return { programName, overrideTitle: "" };
  }
  return { programName, overrideTitle };
}

function CalendarAddSlotButton({
  onClick,
  className = "",
  testId
}: {
  onClick: () => void;
  className?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={`w-full rounded border border-dashed border-border px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      onClick={onClick}
    >
      + Add
    </button>
  );
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
  const [monthOverflowDayKey, setMonthOverflowDayKey] = useState<string | null>(null);

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
  const monthOverflowEntries = useMemo(
    () => (monthOverflowDayKey ? sessionsByDay.get(monthOverflowDayKey) ?? [] : []),
    [monthOverflowDayKey, sessionsByDay]
  );

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3" aria-label="interactive-calendar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" data-testid="calendar-nav-controls">
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
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/30 p-1" data-testid="calendar-view-toggle">
            {(["day", "week", "month", "agenda"] as ScheduleView[]).map((entry) => (
              <Button key={entry} className="h-8 min-w-16" variant={entry === view ? "primary" : "ghost"} onClick={() => onViewChange(entry)}>
                {entry[0].toUpperCase() + entry.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {view === "agenda" ? (
        <div className="space-y-2" data-testid="agenda-list">
          {entries.length === 0 ? <p className="rounded-md border px-3 py-4 text-sm text-muted-foreground">No sessions in this date range.</p> : null}
          {entries.map((entry) => {
            const display = getSessionDisplay(entry);
            return (
            <article key={entry.session.id} className={`rounded-md border p-2 ${sessionColor(entry.program?.category)}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{display.programName}</p>
                  {display.overrideTitle ? <p className="text-xs text-muted-foreground">{display.overrideTitle}</p> : null}
                  <p className="text-xs text-muted-foreground">{entry.session.startsAt.slice(0, 10)} • {formatRange(entry.session.startsAt, entry.session.endsAt)}</p>
                  <p className="text-xs text-muted-foreground">{entry.session.instructorName ?? "Unassigned"} • {entry.registrationCount} / {entry.session.capacity}{entry.waitlistCount > 0 ? ` • WL ${entry.waitlistCount}` : ""}</p>
                </div>
                <Badge tone={statusTone(entry.session.status)}>{entry.session.status ?? "scheduled"}</Badge>
              </div>
              <div className="mt-2 flex gap-2">
                <Button className="h-8" variant="secondary" onClick={() => onOpenSession(entry.session.id)}>Open</Button>
                <Button className="h-8" variant="secondary" onClick={() => onEditSession(entry.session.id)}>Edit</Button>
              </div>
            </article>
            );
          })}
        </div>
      ) : null}

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-2" data-testid="month-grid">
          {monthDays.map((day) => {
            const dayKey = toDateKey(day);
            const dayEntries = sessionsByDay.get(dayKey) ?? [];
            const inMonth = day.getMonth() === selectedDate.getMonth();
            const visibleEntries = dayEntries.slice(0, 3);
            const overflowCount = Math.max(dayEntries.length - visibleEntries.length, 0);
            return (
              <section key={dayKey} className={`h-44 overflow-hidden rounded-md border p-2 ${inMonth ? "bg-card" : "bg-secondary/20"}`} data-testid="month-day-cell">
                <button
                  className="text-xs font-medium"
                  onClick={() => onDateKeyChange(dayKey)}
                >
                  {day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                </button>
                <div className="mt-1 flex h-[calc(100%-1.25rem)] flex-col gap-1">
                  <div className="space-y-1 overflow-hidden">
                    {visibleEntries.map((entry) => {
                    const display = getSessionDisplay(entry);
                    return (
                      <button
                        key={entry.session.id}
                        onClick={() => onOpenSession(entry.session.id)}
                        className={`block w-full rounded border px-1 py-0.5 text-left text-[11px] ${sessionColor(entry.program?.category)}`}
                      >
                        <p className="truncate font-medium">{display.programName}</p>
                        {display.overrideTitle ? <p className="truncate text-[10px] text-muted-foreground">{display.overrideTitle}</p> : null}
                        <p className="truncate">{formatTime(entry.session.startsAt)} • {entry.registrationCount}/{entry.session.capacity}{entry.waitlistCount > 0 ? ` • WL ${entry.waitlistCount}` : ""}</p>
                      </button>
                    );
                    })}
                  </div>
                  {overflowCount > 0 ? (
                    <button
                      type="button"
                      data-testid="month-overflow-trigger"
                      className="text-left text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => setMonthOverflowDayKey(dayKey)}
                    >
                      +{overflowCount} more
                    </button>
                  ) : null}
                  <div className="mt-auto">
                    <CalendarAddSlotButton
                      testId="calendar-add-slot-button"
                      className="h-7"
                      onClick={() => onCreateAtSlot({ date: dayKey, startTime: "09:00", endTime: "10:00" })}
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {view === "month" && monthOverflowDayKey ? (
        <section className="rounded-xl border bg-card p-3" data-testid="month-overflow-panel" aria-label="month-day-agenda">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Day agenda</p>
              <p className="text-xs text-muted-foreground">{monthOverflowDayKey}</p>
            </div>
            <Button variant="secondary" className="h-8" onClick={() => setMonthOverflowDayKey(null)}>Close</Button>
          </div>
          <div className="space-y-2">
            {monthOverflowEntries.map((entry) => {
              const display = getSessionDisplay(entry);
              return (
                <article key={entry.session.id} className={`rounded-md border p-2 ${sessionColor(entry.program?.category)}`}>
                  <p className="text-sm font-medium">{display.programName}</p>
                  {display.overrideTitle ? <p className="text-xs text-muted-foreground">{display.overrideTitle}</p> : null}
                  <p className="text-xs text-muted-foreground">{formatRange(entry.session.startsAt, entry.session.endsAt)}</p>
                  <p className="text-xs text-muted-foreground">{entry.session.instructorName ?? "Unassigned"} • {entry.registrationCount}/{entry.session.capacity}{entry.waitlistCount > 0 ? ` • WL ${entry.waitlistCount}` : ""}</p>
                  <div className="mt-2 flex gap-2">
                    <Button className="h-8" variant="secondary" onClick={() => onOpenSession(entry.session.id)}>View</Button>
                    <Button className="h-8" variant="secondary" onClick={() => onEditSession(entry.session.id)}>Edit</Button>
                    <Button
                      className="h-8"
                      variant="secondary"
                      onClick={() => onCreateAtSlot({ date: monthOverflowDayKey, startTime: "09:00", endTime: "10:00" })}
                    >
                      Add Session
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {(view === "day" || view === "week") ? (
        <div className="overflow-x-auto overflow-y-visible" data-testid={`${view}-grid`}>
          <div
            data-testid={view === "day" ? "day-grid-layout" : "week-grid-layout"}
            className={`grid gap-2 ${view === "day" ? "w-full grid-cols-[56px_minmax(0,1fr)]" : "min-w-[780px] grid-cols-[56px_repeat(7,minmax(0,1fr))] xl:min-w-0"}`}
          >
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
                      <CalendarAddSlotButton
                        testId="calendar-add-slot-button"
                        className="mb-1"
                        onClick={() => onCreateAtSlot({ date: dayKey, startTime: `${String(hour).padStart(2, "0")}:00`, endTime: `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00` })}
                      />
                      <div className="space-y-1">
                        {rowEntries.map((entry) => {
                          const display = getSessionDisplay(entry);
                          return (
                            <button
                              key={entry.session.id}
                              onClick={() => onOpenSession(entry.session.id)}
                              className={`block w-full rounded border px-1 py-0.5 text-left text-[11px] ${sessionColor(entry.program?.category)}`}
                            >
                              <p className="truncate font-medium">{display.programName}</p>
                              {display.overrideTitle ? <p className="truncate text-[10px] text-muted-foreground">{display.overrideTitle}</p> : null}
                              <p className="truncate">{formatRange(entry.session.startsAt, entry.session.endsAt)}</p>
                              <p className="truncate">{entry.session.instructorName ?? "Unassigned"} • {entry.registrationCount}/{entry.session.capacity}{entry.waitlistCount > 0 ? ` • WL ${entry.waitlistCount}` : ""}</p>
                            </button>
                          );
                        })}
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
