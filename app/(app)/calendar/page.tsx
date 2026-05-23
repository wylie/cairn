"use client";

import { useMemo, useState } from "react";
import { ScheduleFilters } from "@/components/calendar/schedule-filters";
import { SessionDetailPanel } from "@/components/calendar/session-detail-panel";
import { SessionFormPanel } from "@/components/calendar/session-form-panel";
import { SessionScheduleCard } from "@/components/calendar/session-schedule-card";
import { ScheduleViewToggle } from "@/components/calendar/schedule-view-toggle";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  buildSessionCards,
  filterScheduleSessions,
  sessionsForDay,
  sessionsForWeek,
  sortSessionsByStart,
  type ScheduleView
} from "@/lib/data/session-schedule";
import { data } from "@/lib/data";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";

function buildIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function CalendarPage() {
  const {
    programs,
    sessions,
    registrations,
    customers,
    createSession,
    updateSession,
    cancelSession,
    registerCustomerForSession,
    cancelRegistration
  } = useCustomerState();
  const { activeStaff, assertPermission, staffUsers, requestStaffSwitch } = useWorkstationState();

  const [view, setView] = useState<ScheduleView>("week");
  const [search, setSearch] = useState("");
  const [dateKey, setDateKey] = useState("2026-05-21");
  const [locationId, setLocationId] = useState("all");
  const [category, setCategory] = useState<"all" | "class" | "camp" | "clinic" | "course">("all");
  const [instructor, setInstructor] = useState("all");
  const [status, setStatus] = useState<"all" | "scheduled" | "cancelled" | "completed">("all");
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const instructors = staffUsers.filter((entry) => (entry.role === "instructor" || entry.canTeach) && entry.activeInstructor !== false);
  const activePrograms = useMemo(() => programs.filter((entry) => entry.active !== false), [programs]);
  const sessionCards = useMemo(() => buildSessionCards(sessions, programs, registrations), [sessions, programs, registrations]);
  const filtered = useMemo(
    () =>
      filterScheduleSessions(sessionCards, {
        search,
        locationId,
        category,
        instructor,
        status,
        dateKey
      }),
    [sessionCards, search, locationId, category, instructor, status, dateKey]
  );

  const visibleCards = useMemo(() => {
    const sorted = sortSessionsByStart(filtered);
    if (view === "day") return sessionsForDay(sorted, dateKey);
    if (view === "week") return sessionsForWeek(sorted, dateKey);
    return sorted;
  }, [filtered, view, dateKey]);

  const activeSession = activeSessionId ? sessions.find((entry) => entry.id === activeSessionId) ?? null : null;
  const editingSession = editingSessionId ? sessions.find((entry) => entry.id === editingSessionId) ?? null : null;
  const editingProgramOptions = useMemo(() => {
    if (!editingSession) return activePrograms;
    const linked = programs.find((entry) => entry.id === editingSession.programId);
    if (!linked) return activePrograms;
    if (linked.active === false) return [linked, ...activePrograms.filter((entry) => entry.id !== linked.id)];
    return activePrograms;
  }, [editingSession, programs, activePrograms]);

  const requireSchedulePermission = () => {
    if (!activeStaff) {
      requestStaffSwitch("Staff PIN Required");
      return { ok: false, message: "Select staff PIN to continue." } as const;
    }
    return assertPermission("editPrograms");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Schedule"
          description="Schedule operations: create sessions from Program templates, manage registrations, and run day-to-day class flow."
        />
        <div className="flex items-center gap-2">
          <ScheduleViewToggle view={view} onChange={setView} />
          <Button
            onClick={() => {
              const allowed = requireSchedulePermission();
              if (!allowed.ok) {
                setWarning(allowed.message);
                setFeedback("");
                return;
              }
              setShowCreate(true);
              setEditingSessionId(null);
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
        instructor={instructor}
        onInstructorChange={setInstructor}
        status={status}
        onStatusChange={(value) => setStatus(value as typeof status)}
        locations={data.locations}
        programs={programs}
        instructors={instructors}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3" aria-label="schedule-results">
          {visibleCards.length === 0 ? <p className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground">No sessions found.</p> : null}
          {visibleCards.map((entry) => (
            <SessionScheduleCard
              key={entry.session.id}
              entry={entry}
              onOpen={(sessionId) => setActiveSessionId(sessionId)}
              onEdit={(sessionId) => {
                const allowed = requireSchedulePermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                setEditingSessionId(sessionId);
                setShowCreate(false);
              }}
            />
          ))}
        </div>

        <div className="space-y-4">
          {showCreate ? (
            <SessionFormPanel
              mode="create"
              programs={activePrograms}
              locations={data.locations}
              instructors={instructors}
              warning={warning}
              onCancel={() => {
                setShowCreate(false);
                setWarning("");
              }}
              onSave={(values) => {
                const allowed = requireSchedulePermission();
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
                const createdInstructor = staffUsers.find((entry) => entry.id === values.instructorStaffId);
                const createResult = createSession({
                  programId: values.programId,
                  startsAt,
                  endsAt,
                  capacity: Number(values.capacity),
                  title: values.title,
                  locationId: values.locationId,
                  instructorName: createdInstructor ? `${createdInstructor.firstName} ${createdInstructor.lastName}` : undefined,
                  instructorStaffId: values.instructorStaffId,
                  waitlistEnabled: values.waitlistEnabled,
                  notes: values.notes,
                  updatedByStaffId: activeStaff?.id
                });
                if (!createResult.ok) {
                  setWarning(createResult.message);
                  setFeedback("");
                  return;
                }
                setFeedback("Session created.");
                setWarning("");
                setShowCreate(false);
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
              onCancel={() => {
                setEditingSessionId(null);
                setWarning("");
              }}
              onCancelSession={() => {
                const allowed = requireSchedulePermission();
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
                const allowed = requireSchedulePermission();
                if (!allowed.ok) {
                  setWarning(allowed.message);
                  setFeedback("");
                  return;
                }
                const startsAt = buildIsoDateTime(values.date, values.startTime);
                const endsAt = buildIsoDateTime(values.date, values.endTime);
                const instructor = staffUsers.find((entry) => entry.id === values.instructorStaffId);
                const result = updateSession({
                  sessionId: editingSession.id,
                  title: values.title,
                  programId: values.programId,
                  locationId: values.locationId,
                  startsAt,
                  endsAt,
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
                setFeedback("Session updated.");
                setWarning("");
                setEditingSessionId(null);
              }}
            />
          ) : null}

          {activeSession ? (
            <SessionDetailPanel
              session={activeSession}
              program={programs.find((entry) => entry.id === activeSession.programId)}
              registrations={registrations}
              customers={customers}
              onClose={() => setActiveSessionId(null)}
              onRegister={(customerId) => {
                const allowed = requireSchedulePermission();
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
                setFeedback(result.message);
                setWarning("");
              }}
              onCancelRegistration={(registrationId) => {
                const allowed = requireSchedulePermission();
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
                setFeedback(result.message);
                setWarning("");
              }}
            />
          ) : (
            <aside className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground">Select a session to view registrations, waitlist, and quick actions.</aside>
          )}
        </div>
      </div>
    </section>
  );
}
