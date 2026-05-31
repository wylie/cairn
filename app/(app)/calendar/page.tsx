"use client";

import { useEffect, useMemo, useState } from "react";
import { InteractiveCalendar } from "@/components/calendar/interactive-calendar";
import { ScheduleFilters } from "@/components/calendar/schedule-filters";
import { SessionDetailPanel } from "@/components/calendar/session-detail-panel";
import { SessionFormPanel } from "@/components/calendar/session-form-panel";
import { SellAccessModal } from "@/components/pos/sell-access-modal";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import {
  buildSessionCards,
  filterScheduleSessions,
  sortSessionsByStart,
type ScheduleView
} from "@/lib/data/session-schedule";
import { data } from "@/lib/data";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { SessionActivityEvent } from "@/types/calendar";

function buildIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function addDays(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function formatDayAgendaTitle(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatSessionTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const end = new Date(endIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${start} - ${end}`;
}

function getSessionDisplay(sessionTitle: string | undefined, programTitle: string | undefined) {
  const programName = programTitle ?? "Session";
  const overrideTitle = sessionTitle?.trim();
  if (!overrideTitle || overrideTitle.toLowerCase() === programName.toLowerCase()) {
    return { programName, overrideTitle: "" };
  }
  return { programName, overrideTitle };
}

function buildRecurringDates(startDate: string, pattern: "none" | "weekly" | "camp_weekdays", count: number) {
  if (pattern === "none") return [startDate];
  const dates: string[] = [];
  let cursor = startDate;
  while (dates.length < count) {
    const day = new Date(`${cursor}T00:00:00Z`).getUTCDay();
    if (pattern === "weekly") {
      dates.push(cursor);
      cursor = addDays(cursor, 7);
      continue;
    }
    if (day !== 0 && day !== 6) dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

const CALENDAR_VIEW_STORAGE_KEY = "cairn:calendar:view";
const VIEW_OPTIONS: ScheduleView[] = ["day", "week", "month", "agenda"];
function getStoredCalendarView(): ScheduleView | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage as unknown as { getItem?: (key: string) => string | null };
  if (typeof storage.getItem !== "function") return null;
  const stored = storage.getItem(CALENDAR_VIEW_STORAGE_KEY);
  if (!stored || !VIEW_OPTIONS.includes(stored as ScheduleView)) return null;
  return stored as ScheduleView;
}
function setStoredCalendarView(view: ScheduleView) {
  if (typeof window === "undefined") return;
  const storage = window.localStorage as unknown as { setItem?: (key: string, value: string) => void };
  if (typeof storage.setItem !== "function") return;
  storage.setItem(CALENDAR_VIEW_STORAGE_KEY, view);
}
type DragMoveState = {
  sessionId: string;
  fromDate: string;
  fromStart: string;
  fromEnd: string;
  toDate: string;
  toStart: string;
  toEnd: string;
  view: ScheduleView;
};

export default function CalendarPage() {
  const {
    programs,
    sessions,
    registrations,
    customers,
    accessProducts,
    createSession,
    updateSession,
    cancelSession,
    registerCustomerForSession,
    cancelRegistration,
    promoteWaitlistedRegistration,
    moveRegistrationToWaitlist,
    markRegistrationAttendance,
    sellAccessProducts,
    updateCustomerWaiver,
    waivers,
    householdMembers
  } = useCustomerState();
  const { activeStaff, assertPermission, staffUsers, requestStaffSwitch } = useWorkstationState();

  const [view, setView] = useState<ScheduleView>(() => {
    return getStoredCalendarView() ?? "week";
  });
  const [search, setSearch] = useState("");
  const [dateKey, setDateKey] = useState("2026-05-21");
  const [locationId, setLocationId] = useState("all");
  const [category, setCategory] = useState<"all" | "class" | "camp" | "clinic" | "course">("all");
  const [programType, setProgramType] = useState<"all" | "recurring_class" | "one_time_event" | "camp" | "clinic" | "team_league" | "appointment_session">("all");
  const [ageGroup, setAgeGroup] = useState<"all" | "youth" | "adult">("all");
  const [instructor, setInstructor] = useState("all");
  const [status, setStatus] = useState<"all" | "scheduled" | "cancelled" | "completed">("all");
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [dayAgendaDateKey, setDayAgendaDateKey] = useState<string | null>(null);
  const [sellCustomerId, setSellCustomerId] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState("");
  const [createPrefill, setCreatePrefill] = useState<{ date: string; startTime: string; endTime: string } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [sessionActivityEvents, setSessionActivityEvents] = useState<SessionActivityEvent[]>([]);
  const [dragSessionId, setDragSessionId] = useState<string | null>(null);
  const [moveDraft, setMoveDraft] = useState<DragMoveState | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const [moveOverrideAccepted, setMoveOverrideAccepted] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setStoredCalendarView(view);
  }, [view]);

  const instructors = staffUsers.filter((entry) => (entry.role === "instructor" || entry.canTeach) && entry.activeInstructor !== false);
  const activePrograms = useMemo(() => programs.filter((entry) => entry.active !== false), [programs]);
  const sessionCards = useMemo(() => buildSessionCards(sessions, programs, registrations), [sessions, programs, registrations]);
  const canEditSchedule = Boolean(activeStaff?.permissions.includes("editPrograms"));
  const canManageRoster = Boolean(
    activeStaff?.permissions.includes("rosterAccess") || activeStaff?.permissions.includes("editPrograms")
  );
  const filtered = useMemo(
    () =>
      filterScheduleSessions(sessionCards, {
        search,
        locationId,
        category,
        programType,
        ageGroup,
        instructor,
        status,
        dateKey
      }),
    [sessionCards, search, locationId, category, programType, ageGroup, instructor, status, dateKey]
  );

  const scopedEntries = useMemo(() => {
    const sorted = sortSessionsByStart(filtered);
    return activeStaff?.role === "instructor" ? sorted.filter((entry) => entry.session.instructorStaffId === activeStaff.id) : sorted;
  }, [filtered, activeStaff?.id, activeStaff?.role]);

  const activeSession = activeSessionId ? sessions.find((entry) => entry.id === activeSessionId) ?? null : null;
  const sellCustomer = sellCustomerId ? customers.find((entry) => entry.id === sellCustomerId) ?? null : null;
  const editingSession = editingSessionId ? sessions.find((entry) => entry.id === editingSessionId) ?? null : null;
  const editingProgramOptions = useMemo(() => {
    if (!editingSession) return activePrograms;
    const linked = programs.find((entry) => entry.id === editingSession.programId);
    if (!linked) return activePrograms;
    if (linked.active === false) return [linked, ...activePrograms.filter((entry) => entry.id !== linked.id)];
    return activePrograms;
  }, [editingSession, programs, activePrograms]);
  const dayAgendaEntries = useMemo(() => {
    if (!dayAgendaDateKey) return [];
    return sortSessionsByStart(scopedEntries.filter((entry) => entry.session.startsAt.slice(0, 10) === dayAgendaDateKey));
  }, [dayAgendaDateKey, scopedEntries]);

  const openCreatePanel = (prefill: { date: string; startTime: string; endTime: string } | null) => {
    setCreatePrefill(prefill);
    setShowCreate(true);
    setEditingSessionId(null);
    setActiveSessionId(null);
    setDayAgendaDateKey(null);
  };

  const openEditPanel = (sessionId: string) => {
    setEditingSessionId(sessionId);
    setShowCreate(false);
    setActiveSessionId(null);
    setDayAgendaDateKey(null);
  };

  const openSessionPanel = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowCreate(false);
    setEditingSessionId(null);
    setDayAgendaDateKey(null);
  };

  const openDayAgendaPanel = (agendaDateKey: string) => {
    setDayAgendaDateKey(agendaDateKey);
    setShowCreate(false);
    setEditingSessionId(null);
    setActiveSessionId(null);
  };

  const requireScheduleEditPermission = () => {
    if (!activeStaff) {
      requestStaffSwitch("Staff PIN Required");
      return { ok: false, message: "Select staff PIN to continue." } as const;
    }
    return assertPermission("editPrograms");
  };
  const requireRosterPermission = () => {
    if (!activeStaff) {
      requestStaffSwitch("Staff PIN Required");
      return { ok: false, message: "Select staff PIN to continue." } as const;
    }
    if (!canManageRoster) {
      return { ok: false as const, message: "You do not have permission to perform this action." };
    }
    return { ok: true as const };
  };
  const recordSessionEvent = (
    sessionId: string,
    action: SessionActivityEvent["action"],
    customerName?: string
  ) => {
    setSessionActivityEvents((prev) => [
      {
        id: `evt_${Math.random().toString(36).slice(2, 9)}`,
        sessionId,
        action,
        customerName,
        createdAt: new Date().toISOString(),
        staffId: activeStaff?.id,
        staffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
      },
      ...prev
    ]);
  };
  const getInstructorConflict = (input: { instructorStaffId?: string; startsAt: string; endsAt: string; sessionId?: string }) => {
    if (!input.instructorStaffId) return null;
    const overlap = sessions.find((entry) => {
      if (input.sessionId && entry.id === input.sessionId) return false;
      if (entry.status === "cancelled") return false;
      if (entry.instructorStaffId !== input.instructorStaffId) return false;
      return input.startsAt < entry.endsAt && input.endsAt > entry.startsAt;
    });
    if (!overlap) return null;
    return `Instructor conflict detected: ${overlap.title ?? "Session"} at ${new Date(overlap.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`;
  };
  const getLocationConflict = (input: { locationId?: string; startsAt: string; endsAt: string; sessionId?: string }) => {
    if (!input.locationId) return null;
    const overlap = sessions.find((entry) => {
      if (input.sessionId && entry.id === input.sessionId) return false;
      if (entry.status === "cancelled") return false;
      if (entry.locationId !== input.locationId) return false;
      return input.startsAt < entry.endsAt && input.endsAt > entry.startsAt;
    });
    if (!overlap) return null;
    return `Location conflict detected: ${overlap.title ?? "Session"} overlaps at ${new Date(overlap.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`;
  };
  const startDragSession = (sessionId: string) => {
    if (!canEditSchedule) return;
    setDragSessionId(sessionId);
  };
  const createMoveDraft = (target: { date: string; startHour?: number }, mode: "slot" | "date") => {
    if (!dragSessionId) return;
    const session = sessions.find((entry) => entry.id === dragSessionId);
    if (!session) return;
    const start = new Date(session.startsAt);
    const end = new Date(session.endsAt);
    const durationMs = Math.max(end.getTime() - start.getTime(), 30 * 60 * 1000);
    const nextStart = new Date(`${target.date}T00:00:00`);
    if (mode === "slot" && typeof target.startHour === "number") {
      nextStart.setHours(target.startHour, 0, 0, 0);
    } else {
      nextStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
    }
    const nextEnd = new Date(nextStart.getTime() + durationMs);
    setMoveDraft({
      sessionId: session.id,
      fromDate: session.startsAt.slice(0, 10),
      fromStart: session.startsAt,
      fromEnd: session.endsAt,
      toDate: target.date,
      toStart: nextStart.toISOString(),
      toEnd: nextEnd.toISOString(),
      view
    });
    setMoveOverrideAccepted(false);
    setActiveDropTarget(null);
  };
  const moveDraftConflicts = useMemo(() => {
    if (!moveDraft) return [] as string[];
    const session = sessions.find((entry) => entry.id === moveDraft.sessionId);
    if (!session) return [] as string[];
    const issues: string[] = [];
    const instructorConflict = getInstructorConflict({
      instructorStaffId: session.instructorStaffId,
      startsAt: moveDraft.toStart,
      endsAt: moveDraft.toEnd,
      sessionId: session.id
    });
    const locationConflict = getLocationConflict({
      locationId: session.locationId,
      startsAt: moveDraft.toStart,
      endsAt: moveDraft.toEnd,
      sessionId: session.id
    });
    if (instructorConflict) issues.push(instructorConflict);
    if (locationConflict) issues.push(locationConflict);
    if ((session.enrolled ?? 0) > 0) {
      issues.push("Capacity/registrations affected: customers are already registered.");
    }
    return issues;
  }, [moveDraft, sessions]);
  const confirmMoveSession = () => {
    if (!moveDraft) return;
    const session = sessions.find((entry) => entry.id === moveDraft.sessionId);
    if (!session) {
      setMoveDraft(null);
      return;
    }
    const hasHardConflict = moveDraftConflicts.some((entry) => entry.toLowerCase().includes("conflict"));
    const canOverrideMove = Boolean(activeStaff?.permissions.includes("overrideAccess"));
    if (hasHardConflict && (!canOverrideMove || !moveOverrideAccepted)) {
      setWarning(canOverrideMove ? "Conflict detected. Manager override required to confirm move." : moveDraftConflicts[0] ?? "Conflict detected.");
      setMoveDraft(null);
      return;
    }
    const result = updateSession({
      sessionId: session.id,
      title: session.title,
      programId: session.programId,
      locationId: session.locationId,
      startsAt: moveDraft.toStart,
      endsAt: moveDraft.toEnd,
      instructorName: session.instructorName,
      instructorStaffId: session.instructorStaffId,
      capacity: session.capacity,
      waitlistEnabled: session.waitlistEnabled ?? false,
      notes: session.notes,
      updatedByStaffId: activeStaff?.id
    });
    if (!result.ok) {
      setWarning(result.message);
      setMoveDraft(null);
      return;
    }
    setFeedback("Session moved.");
    setWarning("");
    setSessionActivityEvents((prev) => [
      {
        id: `evt_${Math.random().toString(36).slice(2, 9)}`,
        sessionId: session.id,
        action: "rescheduled",
        customerName: `${programs.find((entry) => entry.id === session.programId)?.title ?? "Session"} rescheduled`,
        createdAt: new Date().toISOString(),
        staffId: activeStaff?.id,
        staffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
      },
      ...prev
    ]);
    setMoveDraft(null);
    setDragSessionId(null);
    setMoveOverrideAccepted(false);
  };
  const getRegistrationEligibility = (session: NonNullable<typeof activeSession>, customerId: string) => {
    const customer = customers.find((entry) => entry.id === customerId);
    const program = programs.find((entry) => entry.id === session.programId);
    if (!customer || !program) return { state: "blocked" as const, reasons: ["Customer/program not found."] };

    const reasons: string[] = [];
    let state: "ready" | "warning" | "blocked" = "ready";
    const waiver = customer.waiverId ? waivers.find((entry) => entry.id === customer.waiverId) : undefined;
    const hasValidWaiver = waiver?.status === "valid" && (!waiver.expiresAt || waiver.expiresAt >= session.startsAt.slice(0, 10));
    if (program.requiresWaiver && !hasValidWaiver) {
      state = "blocked";
      reasons.push("Waiver missing or expired");
    } else {
      reasons.push("Waiver complete");
    }

    const dob = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
    const age =
      dob && !Number.isNaN(dob.getTime())
        ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
        : undefined;
    if (typeof program.minimumAge === "number" && typeof age === "number" && age < program.minimumAge) {
      state = "blocked";
      reasons.push("Too young");
    }
    if (typeof program.maximumAge === "number" && typeof age === "number" && age > program.maximumAge) {
      state = "blocked";
      reasons.push("Outside age range");
    }

    if (session.enrolled >= session.capacity && !session.waitlistEnabled) {
      state = "blocked";
      reasons.push("Program full");
    } else if (session.enrolled >= session.capacity) {
      if (state !== "blocked") state = "warning";
      reasons.push("Session full (waitlist available)");
    }

    if (program.memberRequired) {
      const hasMembership = customer.checkInStatus === "in" || Boolean(customer.membershipId);
      if (!hasMembership) {
        if (state !== "blocked") state = "warning";
        reasons.push("Not a member (drop-in fee applies)");
      } else {
        reasons.push("Membership valid");
      }
    }

    let guardianName: string | undefined;
    if (program.guardianRequired) {
      const membership = householdMembers.find((entry) => entry.customerId === customer.id);
      const guardian = membership
        ? householdMembers.find(
            (entry) =>
              entry.householdId === membership.householdId &&
              entry.customerId !== customer.id &&
              entry.memberType === "adult" &&
              (entry.relationship === "parent_guardian" || entry.role === "guardian" || entry.role === "primary-adult")
          )
        : undefined;
      if (!guardian) {
        state = "blocked";
        reasons.push("Guardian required");
      } else {
        const guardianCustomer = customers.find((entry) => entry.id === guardian.customerId);
        guardianName = guardianCustomer ? `${guardianCustomer.firstName} ${guardianCustomer.lastName}` : undefined;
        reasons.push("Guardian approved");
      }
    }

    if (reasons.length === 0) reasons.push("Ready to register");
    return { state, reasons, guardianName };
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Schedule"
          description="Schedule operations: create sessions from Program templates, manage registrations, and run day-to-day class flow."
        />
        <div className="flex items-center gap-2">
          <Button
            disabled={!canEditSchedule}
            onClick={() => {
              const allowed = requireScheduleEditPermission();
              if (!allowed.ok) {
                setWarning(allowed.message);
                setFeedback("");
                return;
              }
              openCreatePanel(null);
            }}
          >
            Create Session
          </Button>
        </div>
      </div>

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
      {warning ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}

      <ScheduleFilters
        search={search}
        onSearchChange={setSearch}
        dateKey={dateKey}
        onDateChange={setDateKey}
        locationId={locationId}
        onLocationChange={setLocationId}
        category={category}
        onCategoryChange={(value) => setCategory(value as typeof category)}
        programType={programType}
        onProgramTypeChange={(value) => setProgramType(value as typeof programType)}
        ageGroup={ageGroup}
        onAgeGroupChange={(value) => setAgeGroup(value as typeof ageGroup)}
        instructor={instructor}
        onInstructorChange={setInstructor}
        status={status}
        onStatusChange={(value) => setStatus(value as typeof status)}
        locations={data.locations}
        programs={programs}
        instructors={instructors}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]" data-testid="calendar-layout">
        <div className="space-y-3 min-w-0" aria-label="schedule-results">
          {isHydrated ? (
            <InteractiveCalendar
              view={view}
              dateKey={dateKey}
              entries={scopedEntries}
              onViewChange={setView}
              onDateKeyChange={setDateKey}
              onOpenSession={openSessionPanel}
              onEditSession={(sessionId) => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                openEditPanel(sessionId);
              }}
              onCreateAtSlot={(prefill) => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                openCreatePanel(prefill);
              }}
              onOpenDayAgenda={openDayAgendaPanel}
              onDragSessionStart={startDragSession}
              onDropOnSlot={({ date, startHour }) => createMoveDraft({ date, startHour }, "slot")}
              onDropOnDate={({ date }) => createMoveDraft({ date }, "date")}
              activeDropTarget={activeDropTarget}
              onDragTargetChange={setActiveDropTarget}
              dragEnabled={canEditSchedule}
            />
          ) : (
            <div className="h-[560px] rounded-xl border bg-card p-3" aria-label="calendar-loading-state" />
          )}
        </div>

        <div className="space-y-4 xl:w-[400px]" data-testid="calendar-sidebar">
          {showCreate ? (
            <SessionFormPanel
              mode="create"
              programs={activePrograms}
              locations={data.locations}
              instructors={instructors}
              warning={warning}
              conflictWarning={conflictWarning}
              initialValues={
                createPrefill
                  ? { date: createPrefill.date, startTime: createPrefill.startTime, endTime: createPrefill.endTime }
                  : undefined
              }
              onCancel={() => {
                setShowCreate(false);
                setWarning("");
                setConflictWarning("");
                setCreatePrefill(null);
              }}
              onSave={(values) => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                if (!values.programId || !values.date || !values.startTime || !values.endTime || !values.capacity) {
                  setWarning("Program, date/time, and capacity are required.");
                  setFeedback("");
                  return;
                }
                const startsAt = buildIsoDateTime(values.date, values.startTime);
                const endsAt = buildIsoDateTime(values.date, values.endTime);
                const conflict = getInstructorConflict({
                  instructorStaffId: values.instructorStaffId || undefined,
                  startsAt,
                  endsAt
                });
                if (conflict && !activeStaff?.permissions.includes("overrideAccess")) {
                  setConflictWarning(conflict);
                  setWarning("Manager override required for instructor conflicts.");
                  setFeedback("");
                  return;
                }
                setConflictWarning(conflict ?? "");
                const createdInstructor = staffUsers.find((entry) => entry.id === values.instructorStaffId);
                const recurrenceCount = Math.max(1, Number(values.recurrenceCount || "1"));
                const recurringDates = buildRecurringDates(values.date, values.recurrence, recurrenceCount);
                const seriesId = values.recurrence === "none" ? undefined : `series_${Math.random().toString(36).slice(2, 9)}`;
                const recurrenceRule =
                  values.recurrence === "weekly"
                    ? "FREQ=WEEKLY"
                    : values.recurrence === "camp_weekdays"
                      ? "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
                      : undefined;

                for (const date of recurringDates) {
                  const createResult = createSession({
                    programId: values.programId,
                    startsAt: buildIsoDateTime(date, values.startTime),
                    endsAt: buildIsoDateTime(date, values.endTime),
                    capacity: Number(values.capacity),
                    title: values.title,
                    locationId: values.locationId,
                    instructorName: createdInstructor ? `${createdInstructor.firstName} ${createdInstructor.lastName}` : undefined,
                    instructorStaffId: values.instructorStaffId,
                    waitlistEnabled: values.waitlistEnabled,
                    notes: values.notes,
                    updatedByStaffId: activeStaff?.id,
                    seriesId,
                    recurrenceRule
                  });
                  if (!createResult.ok) {
                    setWarning(createResult.message);
                    setFeedback("");
                    return;
                  }
                }

                setFeedback(recurringDates.length > 1 ? `Created ${recurringDates.length} recurring sessions.` : "Session created.");
                setWarning("");
                setShowCreate(false);
                setConflictWarning("");
                setCreatePrefill(null);
              }}
            />
          ) : null}

          {editingSession ? (
            <SessionFormPanel
              mode="edit"
              key={editingSession.id}
              session={editingSession}
              programs={editingProgramOptions}
              locations={data.locations}
              instructors={instructors}
              warning={warning}
              conflictWarning={conflictWarning}
              onCancel={() => {
                setEditingSessionId(null);
                setWarning("");
                setConflictWarning("");
              }}
              onCancelSession={() => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                const result = cancelSession(editingSession.id, activeStaff?.id);
                if (!result.ok) {
                  setWarning(result.message);
                  setFeedback("");
                  return;
                }
                setFeedback(result.message);
                setWarning("");
                setEditingSessionId(null);
              }}
              onSave={(values) => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                const startsAt = buildIsoDateTime(values.date, values.startTime);
                const endsAt = buildIsoDateTime(values.date, values.endTime);
                const conflict = getInstructorConflict({
                  instructorStaffId: values.instructorStaffId || undefined,
                  startsAt,
                  endsAt,
                  sessionId: editingSession.id
                });
                if (conflict && !activeStaff?.permissions.includes("overrideAccess")) {
                  setConflictWarning(conflict);
                  setWarning("Manager override required for instructor conflicts.");
                  setFeedback("");
                  return;
                }
                setConflictWarning(conflict ?? "");
                const instructor = staffUsers.find((entry) => entry.id === values.instructorStaffId);
                const seriesSessions = editingSession.seriesId
                  ? sessions.filter((entry) => entry.seriesId === editingSession.seriesId)
                  : [editingSession];
                const targets =
                  values.editScope === "single"
                    ? [editingSession]
                    : values.editScope === "future"
                      ? seriesSessions.filter((entry) => entry.startsAt >= editingSession.startsAt)
                      : seriesSessions;

                for (const target of targets) {
                  const result = updateSession({
                    sessionId: target.id,
                    title: values.title,
                    programId: values.programId,
                    locationId: values.locationId,
                    startsAt: target.id === editingSession.id ? startsAt : target.startsAt,
                    endsAt: target.id === editingSession.id ? endsAt : target.endsAt,
                    instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : undefined,
                    instructorStaffId: values.instructorStaffId,
                    capacity: Number(values.capacity),
                    waitlistEnabled: values.waitlistEnabled,
                    notes: values.notes,
                    updatedByStaffId: activeStaff?.id
                  });
                  if (!result.ok) {
                    setWarning(result.message);
                    setFeedback("");
                    return;
                  }
                }
                setFeedback(targets.length > 1 ? `Updated ${targets.length} sessions.` : "Session updated.");
                setWarning("");
                setEditingSessionId(null);
                setConflictWarning("");
              }}
            />
          ) : null}

          {dayAgendaDateKey ? (
            <aside className="rounded-xl border bg-card p-4" data-testid="day-agenda-panel" aria-label="day-agenda-panel">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{formatDayAgendaTitle(dayAgendaDateKey)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {dayAgendaEntries.length} session{dayAgendaEntries.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="h-9"
                    variant="secondary"
                    onClick={() => {
                      setDateKey(dayAgendaDateKey);
                      setView("day");
                      setDayAgendaDateKey(null);
                    }}
                  >
                    View Day
                  </Button>
                  <Button
                    className="h-9"
                    onClick={() => {
                      const allowed = requireScheduleEditPermission();
                      if (!allowed.ok) {
                        setWarning(allowed.message);
                        setFeedback("");
                        return;
                      }
                      openCreatePanel({ date: dayAgendaDateKey, startTime: "09:00", endTime: "10:00" });
                    }}
                  >
                    Add Session
                  </Button>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {dayAgendaEntries.length === 0 ? (
                  <p className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">No sessions for this date.</p>
                ) : null}
                {dayAgendaEntries.map((entry) => {
                  const display = getSessionDisplay(entry.session.title, entry.program?.title);
                  return (
                    <article key={entry.session.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{display.programName}</p>
                      {display.overrideTitle ? <p className="text-xs text-muted-foreground">{display.overrideTitle}</p> : null}
                      <p className="text-xs text-muted-foreground">{formatSessionTimeRange(entry.session.startsAt, entry.session.endsAt)}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.session.instructorName ?? "Unassigned"} • {entry.registrationCount}/{entry.session.capacity}
                        {entry.waitlistCount > 0 ? ` • WL ${entry.waitlistCount}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button className="h-8" variant="secondary" onClick={() => openSessionPanel(entry.session.id)}>View Session</Button>
                        <Button
                          className="h-8"
                          variant="secondary"
                          onClick={() => {
                            const allowed = requireScheduleEditPermission();
                            if (!allowed.ok) {
                              setWarning(allowed.message);
                              setFeedback("");
                              return;
                            }
                            openEditPanel(entry.session.id);
                          }}
                        >
                          Edit Session
                        </Button>
                        <Button className="h-8" variant="secondary" onClick={() => openSessionPanel(entry.session.id)}>Take Attendance</Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </aside>
          ) : null}

          {activeSession && !dayAgendaDateKey ? (
            <SessionDetailPanel
              session={activeSession}
              program={programs.find((entry) => entry.id === activeSession.programId)}
              registrations={registrations}
              customers={customers}
              householdMembers={householdMembers}
              getEligibility={(customerId) => getRegistrationEligibility(activeSession, customerId)}
              onClose={() => setActiveSessionId(null)}
              onRegister={(customerId) => {
                const allowed = requireRosterPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                const result = registerCustomerForSession({ customerId, sessionId: activeSession.id });
                if (!result.ok) {
                  setWarning(result.message);
                  setFeedback("");
                  return;
                }
                const c = customers.find((entry) => entry.id === customerId);
                recordSessionEvent(activeSession.id, result.message.toLowerCase().includes("waitlist") ? "waitlisted" : "registered", c ? `${c.firstName} ${c.lastName}` : undefined);
                setFeedback(result.message);
                setWarning("");
              }}
              onOverrideRegister={(customerId) => {
                if (!activeStaff?.permissions.includes("overrideAccess")) {
                  setWarning("Manager override permission required.");
                  setFeedback("");
                  return;
                }
                const result = registerCustomerForSession({ customerId, sessionId: activeSession.id, override: true });
                if (!result.ok) {
                  setWarning(result.message);
                  setFeedback("");
                  return;
                }
                const c = customers.find((entry) => entry.id === customerId);
                recordSessionEvent(activeSession.id, result.message.toLowerCase().includes("waitlist") ? "waitlisted" : "registered", c ? `${c.firstName} ${c.lastName}` : undefined);
                setFeedback(result.message);
                setWarning("");
              }}
              onRegisterHousehold={(customerIds) => {
                const allowed = requireRosterPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                if (customerIds.length === 0) return;
                const results = customerIds.map((customerId) => registerCustomerForSession({ customerId, sessionId: activeSession.id }));
                const failures = results.filter((entry) => !entry.ok);
                if (failures.length > 0) {
                  setWarning(failures[0].message);
                } else {
                  setWarning("");
                }
                const successCount = results.filter((entry) => entry.ok).length;
                customerIds.forEach((customerId, index) => {
                  if (results[index]?.ok) {
                    const c = customers.find((entry) => entry.id === customerId);
                    recordSessionEvent(activeSession.id, "registered", c ? `${c.firstName} ${c.lastName}` : undefined);
                  }
                });
                setFeedback(`Registered ${successCount} household participant${successCount === 1 ? "" : "s"}.`);
              }}
              onCancelRegistration={(registrationId) => {
                const allowed = requireRosterPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                const result = cancelRegistration(registrationId);
                if (!result.ok) {
                  setWarning(result.message);
                  setFeedback("");
                  return;
                }
                const registration = registrations.find((entry) => entry.id === registrationId);
                const c = registration ? customers.find((entry) => entry.id === registration.customerId) : null;
                recordSessionEvent(activeSession.id, "removed", c ? `${c.firstName} ${c.lastName}` : undefined);
                setFeedback(result.message);
                setWarning("");
              }}
              onMoveToWaitlist={(registrationId) => {
                const allowed = requireRosterPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                const result = moveRegistrationToWaitlist(registrationId);
                if (!result.ok) {
                  setWarning(result.message);
                  setFeedback("");
                  return;
                }
                const registration = registrations.find((entry) => entry.id === registrationId);
                const c = registration ? customers.find((entry) => entry.id === registration.customerId) : null;
                recordSessionEvent(activeSession.id, "waitlisted", c ? `${c.firstName} ${c.lastName}` : undefined);
                setFeedback(result.message);
                setWarning("");
              }}
              onPromoteWaitlist={(registrationId) => {
                const allowed = requireRosterPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  return;
                }
                const result = promoteWaitlistedRegistration(registrationId);
                if (!result.ok) setWarning(result.message);
                else {
                  const registration = registrations.find((entry) => entry.id === registrationId);
                  const c = registration ? customers.find((entry) => entry.id === registration.customerId) : null;
                  recordSessionEvent(activeSession.id, "promoted", c ? `${c.firstName} ${c.lastName}` : undefined);
                  setFeedback(result.message);
                  setWarning("");
                }
              }}
              onMarkAttendance={(registrationId, statusValue) => {
                const allowed = requireRosterPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  return;
                }
                const result = markRegistrationAttendance(registrationId, statusValue, activeStaff?.id);
                if (!result.ok) setWarning(result.message);
                else {
                  const registration = registrations.find((entry) => entry.id === registrationId);
                  const c = registration ? customers.find((entry) => entry.id === registration.customerId) : null;
                  if (statusValue === "checked_in" || statusValue === "attended" || statusValue === "late") {
                    recordSessionEvent(activeSession.id, "checked_in", c ? `${c.firstName} ${c.lastName}` : undefined);
                  }
                  if (statusValue === "absent" || statusValue === "no_show") {
                    recordSessionEvent(activeSession.id, "marked_absent", c ? `${c.firstName} ${c.lastName}` : undefined);
                  }
                  setFeedback(result.message);
                  setWarning("");
                }
              }}
              onSellAccess={(customerId) => setSellCustomerId(customerId)}
              onMarkWaiverSigned={(customerId) => {
                if (!activeStaff) {
                  requestStaffSwitch("Staff PIN Required");
                  setWarning("Select staff PIN to continue.");
                  return;
                }
                const result = updateCustomerWaiver(customerId, {
                  status: "valid",
                  signedAt: new Date().toISOString(),
                  expiresAt: "2027-05-20",
                  signedByStaffId: activeStaff.id,
                  updatedByStaffId: activeStaff.id,
                  updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                });
                if (!result.ok) setWarning(result.message);
                else {
                  setFeedback("Waiver marked signed.");
                  setWarning("");
                }
              }}
              onEditSession={() => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                openEditPanel(activeSession.id);
              }}
              onMoveSession={() => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                openEditPanel(activeSession.id);
              }}
              onCancelSession={() => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                const result = cancelSession(activeSession.id, activeStaff?.id);
                if (!result.ok) {
                  setWarning(result.message);
                  setFeedback("");
                  return;
                }
                setFeedback(result.message);
                setWarning("");
              }}
              onDuplicateSession={() => {
                const allowed = requireScheduleEditPermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                const nextDate = addDays(activeSession.startsAt.slice(0, 10), 7);
                const startTime = new Date(activeSession.startsAt).toISOString().slice(11, 16);
                const endTime = new Date(activeSession.endsAt).toISOString().slice(11, 16);
                const result = createSession({
                  programId: activeSession.programId,
                  startsAt: buildIsoDateTime(nextDate, startTime),
                  endsAt: buildIsoDateTime(nextDate, endTime),
                  capacity: activeSession.capacity,
                  title: `${activeSession.title ?? "Session"} (Copy)`,
                  locationId: activeSession.locationId,
                  instructorName: activeSession.instructorName,
                  instructorStaffId: activeSession.instructorStaffId,
                  waitlistEnabled: activeSession.waitlistEnabled,
                  notes: activeSession.notes,
                  updatedByStaffId: activeStaff?.id,
                  seriesId: activeSession.seriesId,
                  recurrenceRule: activeSession.recurrenceRule
                });
                if (!result.ok) {
                  setWarning(result.message);
                  setFeedback("");
                  return;
                }
                setFeedback("Session duplicated.");
                setWarning("");
              }}
              onTakeAttendance={() => {
                const confirmed = registrations.filter((entry) => entry.sessionId === activeSession.id && entry.status === "confirmed");
                confirmed.forEach((entry) => markRegistrationAttendance(entry.id, "attended", activeStaff?.id));
                setFeedback(`Marked ${confirmed.length} participants present.`);
                setWarning("");
              }}
              canOverride={Boolean(activeStaff?.permissions.includes("overrideAccess"))}
              activityEvents={sessionActivityEvents}
            />
          ) : !showCreate && !editingSession && !dayAgendaDateKey ? (
            <aside className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground">Select a session to view registrations, waitlist, and quick actions.</aside>
          ) : null}
        </div>
      </div>
      {sellCustomer ? (
        <SellAccessModal
          open
          onClose={() => setSellCustomerId(null)}
          customer={sellCustomer}
          products={accessProducts}
          canUsePOS={Boolean(activeStaff?.permissions.includes("usePOS"))}
          canOverrideAccess={Boolean(activeStaff?.permissions.includes("overrideAccess"))}
          onSubmit={({ productIds, checkInAfterSale }) => {
            if (!activeStaff) {
              requestStaffSwitch("Staff PIN Required");
              return { ok: false, message: "Select staff PIN to continue.", transaction: null };
            }
            const result = sellAccessProducts({
              customerId: sellCustomer.id,
              productIds,
              soldByStaffId: activeStaff.id,
              soldByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
              checkInAfterSale
            });
            if (result.ok) {
              setFeedback(result.message);
              setWarning("");
            } else {
              setWarning(result.message);
            }
            return { ...result, transaction: result.transaction ?? null };
          }}
        />
      ) : null}
      {moveDraft ? (
        <ModalShell
          open
          ariaLabel="move-session-confirmation"
          title="Move session?"
          description="Confirm session rescheduling details."
          maxWidthClassName="max-w-lg"
          onClose={() => {
            setMoveDraft(null);
            setDragSessionId(null);
            setMoveOverrideAccepted(false);
          }}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setMoveDraft(null);
                  setDragSessionId(null);
                  setMoveOverrideAccepted(false);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={moveDraftConflicts.some((entry) => entry.toLowerCase().includes("conflict")) && (!activeStaff?.permissions.includes("overrideAccess") || !moveOverrideAccepted)}
                onClick={confirmMoveSession}
              >
                Confirm Move
              </Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            From: {new Date(moveDraft.fromStart).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
          <p className="text-sm text-muted-foreground">
            To: {new Date(moveDraft.toStart).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
          <div className="mt-3 space-y-2 rounded-md border bg-secondary/20 p-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Apply move to:</p>
            <label className="flex items-center gap-2">
              <input type="radio" name="move-scope" checked readOnly />
              <span>This session only</span>
            </label>
            <label className="flex items-center gap-2 opacity-60">
              <input type="radio" name="move-scope" disabled />
              <span>This and future sessions (coming soon)</span>
            </label>
            <label className="flex items-center gap-2 opacity-60">
              <input type="radio" name="move-scope" disabled />
              <span>Entire series (coming soon)</span>
            </label>
          </div>
          {moveDraftConflicts.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900" aria-label="move-conflict-warning">
              <p className="font-medium">Conflict warning</p>
              {moveDraftConflicts.map((entry) => (
                <p key={entry}>• {entry}</p>
              ))}
              {activeStaff?.permissions.includes("overrideAccess") ? (
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={moveOverrideAccepted}
                    onChange={(event) => setMoveOverrideAccepted(event.target.checked)}
                  />
                  <span>Manager override: confirm move despite conflict</span>
                </label>
              ) : (
                <p className="mt-2">Manager override required.</p>
              )}
            </div>
          ) : null}
        </ModalShell>
      ) : null}
    </section>
  );
}
