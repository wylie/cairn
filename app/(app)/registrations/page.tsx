"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { formatDate, formatDateTime, formatTime } from "@/lib/format/date";
import type { ClassCampSession, Customer, Program, Registration } from "@/types/domain";
import { buildCustomerDetailHref } from "@/lib/navigation/detail-navigation";

type RegistrationFilter = "all" | "registered" | "waitlisted" | "checked_in" | "attended" | "absent" | "cancelled";

function formatDateRange(start: string, end: string) {
  return `${formatDate(start, "-", { weekday: "short", month: "short", day: "numeric" })} • ${formatTime(start)} - ${formatTime(end)}`;
}

function getDefaultRegistrationDateRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10)
  };
}

function getSessionStatus(session: ClassCampSession): "Open" | "Full" | "Waitlist Active" | "Cancelled" {
  if (session.status === "cancelled") return "Cancelled";
  if (session.enrolled < session.capacity) return "Open";
  if (session.waitlistEnabled) return "Waitlist Active";
  return "Full";
}

function getStatusTone(status: "Open" | "Full" | "Waitlist Active" | "Cancelled"): "success" | "warning" | "danger" {
  if (status === "Open") return "success";
  if (status === "Cancelled") return "danger";
  return "warning";
}

type EligibilityResult = {
  state: "eligible" | "warning" | "blocked";
  label: "Eligible" | "Needs Waiver" | "Age Restriction" | "Membership Required" | "Blocked";
  reasons: string[];
};

function buildEligibility(
  customer: Customer,
  session: ClassCampSession,
  program: Program | undefined,
  registrations: Registration[],
  activeMembershipCustomerIds: Set<string>,
  getWaiverStatusForCustomer: (customerId: string, templateId?: string) => "valid" | "missing" | "expired" | "expiring_soon" | "outdated_version"
): EligibilityResult {
  const reasons: string[] = [];
  if (!program) {
    return { state: "blocked", label: "Blocked", reasons: ["Program not found for this session."] };
  }
  const existing = registrations.find((r) => r.customerId === customer.id && r.sessionId === session.id && r.status !== "cancelled");
  if (existing) reasons.push("Already registered for this session.");
  if (session.status === "cancelled") reasons.push("Session is cancelled.");

  if (program.requiresWaiver) {
    const requiredTemplates = program.requiredWaiverTemplateIds ?? ["wtpl_general"];
    const hasAllRequired = requiredTemplates.every((templateId) => {
      const status = getWaiverStatusForCustomer(customer.id, templateId);
      return status === "valid" || status === "expiring_soon";
    });
    if (!hasAllRequired) reasons.push("Missing waiver.");
  }

  const dob = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00`) : null;
  const age = dob ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425))) : null;
  if (typeof program.minimumAge === "number" && typeof age === "number" && age < program.minimumAge) reasons.push(`Must be at least ${program.minimumAge}.`);
  if (typeof program.maximumAge === "number" && typeof age === "number" && age > program.maximumAge) reasons.push(`Must be ${program.maximumAge} or younger.`);
  if (program.memberRequired && !activeMembershipCustomerIds.has(customer.id)) reasons.push("Membership required.");
  if (session.enrolled >= session.capacity && !session.waitlistEnabled) reasons.push("Session full and waitlist disabled.");

  if (reasons.some((r) => r.includes("at least") || r.includes("younger"))) return { state: "blocked", label: "Age Restriction", reasons };
  if (reasons.some((r) => r.includes("cancelled") || r.includes("Already registered") || r.includes("full"))) return { state: "blocked", label: "Blocked", reasons };
  if (reasons.some((r) => r.includes("Membership required"))) return { state: "warning", label: "Membership Required", reasons };
  if (reasons.some((r) => r.includes("waiver"))) return { state: "warning", label: "Needs Waiver", reasons };
  return { state: "eligible", label: "Eligible", reasons: ["All checks passed."] };
}

export default function RegistrationsPage() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString?.() ?? "";
  const todayKey = new Date().toISOString().slice(0, 10);
  const orgSlug = parseOrgSlugFromPathname(pathname) ?? "summit";
  const {
    sessions,
    programs,
    customers,
    registrations,
    registrationActivity,
    customerAccessRecords,
    getWaiverStatusForCustomer,
    registerCustomerForSession,
    cancelRegistration,
    moveRegistrationToWaitlist,
    promoteWaitlistedRegistration,
    markRegistrationAttendance,
    transferRegistration,
    duplicateRegistration,
    reorderWaitlistedRegistration,
    addRegistrationNote
  } = useCustomerState();
  const { activeStaff, assertPermission } = useWorkstationState();

  const [sessionQuery, setSessionQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const defaultDateRange = getDefaultRegistrationDateRange();
  const [programFilter, setProgramFilter] = useState("all");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(searchParams?.get?.("dateFrom") ?? defaultDateRange.dateFrom);
  const [dateTo, setDateTo] = useState(searchParams?.get?.("dateTo") ?? defaultDateRange.dateTo);
  const [ageGroup, setAgeGroup] = useState<"all" | "youth" | "adult">("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [waitlistOnly, setWaitlistOnly] = useState(false);
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>((searchParams?.get?.("status") as RegistrationFilter) || "all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(searchParams?.get?.("sessionId") ?? null);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [transferTargetByRegistration, setTransferTargetByRegistration] = useState<Record<string, string>>({});
  const [noteDraftByRegistration, setNoteDraftByRegistration] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");

  const createdFilter = searchParams?.get?.("created");

  const activeMembershipCustomerIds = useMemo(() => {
    return new Set(
      customerAccessRecords
        .filter((entry) => entry.type === "membership" && entry.status === "active" && (!entry.expirationDate || entry.expirationDate >= todayKey))
        .map((entry) => entry.customerId)
    );
  }, [customerAccessRecords, todayKey]);

  const sessionProgramMap = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);

  const filteredSessions = useMemo(() => {
    const q = sessionQuery.trim().toLowerCase();
    return sessions.filter((session) => {
      const p = sessionProgramMap.get(session.programId);
      if (!p) return false;
      if (programFilter !== "all" && session.programId !== programFilter) return false;
      if (instructorFilter !== "all" && (session.instructorName ?? "") !== instructorFilter) return false;
      if (locationFilter !== "all" && session.locationId !== locationFilter) return false;
      const dayKey = session.startsAt.slice(0, 10);
      if (dateFrom && dayKey < dateFrom) return false;
      if (dateTo && dayKey > dateTo) return false;
      if (ageGroup === "youth" && (p.minimumAge ?? 0) >= 18) return false;
      if (ageGroup === "adult" && (p.maximumAge ?? 99) < 18) return false;
      if (availableOnly && session.enrolled >= session.capacity) return false;
      if (waitlistOnly && (session.waitlistCount ?? 0) === 0) return false;
      if (createdFilter === "today") {
        const hasTodayRegistration = registrations.some(
          (entry) => entry.sessionId === session.id && (entry.registeredAt ?? "").slice(0, 10) === todayKey
        );
        if (!hasTodayRegistration) return false;
      }
      if (!q) return true;
      const haystack = `${session.title ?? ""} ${p.title} ${session.instructorName ?? ""} ${session.locationId}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sessions, sessionProgramMap, sessionQuery, programFilter, instructorFilter, locationFilter, dateFrom, dateTo, ageGroup, availableOnly, waitlistOnly, createdFilter, registrations, todayKey]);

  const selectedSession = useMemo(() => sessions.find((s) => s.id === selectedSessionId) ?? filteredSessions[0] ?? null, [sessions, selectedSessionId, filteredSessions]);
  const selectedProgram = selectedSession ? sessionProgramMap.get(selectedSession.programId) : undefined;

  const sessionRegistrations = useMemo(() => {
    if (!selectedSession) return [];
    const base = registrations.filter((entry) => entry.sessionId === selectedSession.id);
    const createdFiltered = createdFilter === "today"
      ? base.filter((entry) => (entry.registeredAt ?? "").slice(0, 10) === todayKey)
      : base;
    if (registrationFilter === "all") return createdFiltered;
    if (registrationFilter === "registered") return createdFiltered.filter((entry) => entry.status === "confirmed");
    if (registrationFilter === "waitlisted") return createdFiltered.filter((entry) => entry.status === "waitlisted");
    if (registrationFilter === "cancelled") return createdFiltered.filter((entry) => entry.status === "cancelled");
    return createdFiltered.filter((entry) => entry.status === registrationFilter);
  }, [registrations, selectedSession, registrationFilter, createdFilter, todayKey]);

  const registered = useMemo(
    () => sessionRegistrations.filter((entry) => ["confirmed", "attended", "checked_in", "late", "completed", "absent", "no_show", "excused"].includes(entry.status)),
    [sessionRegistrations]
  );
  const waitlisted = useMemo(
    () => sessionRegistrations.filter((entry) => entry.status === "waitlisted").sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999)),
    [sessionRegistrations]
  );

  const customerResults = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((customer) => {
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        return fullName.includes(q) || customer.email.toLowerCase().includes(q) || customer.phone.toLowerCase().includes(q) || customer.memberId.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [customerSearch, customers]);

  const selectedRegistration = useMemo(
    () => registrations.find((entry) => entry.id === selectedRegistrationId) ?? registered[0] ?? waitlisted[0] ?? null,
    [registrations, selectedRegistrationId, registered, waitlisted]
  );

  const selectedRegistrationTimeline = useMemo(() => {
    if (!selectedRegistration) return [];
    return registrationActivity
      .filter((entry) => entry.registrationId === selectedRegistration.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [registrationActivity, selectedRegistration]);

  const dashboard = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const sessionsToday = sessions.filter((entry) => entry.startsAt.slice(0, 10) === todayKey && entry.status !== "cancelled");
    const registrationsToday = registrations.filter((entry) => (entry.registeredAt ?? "").slice(0, 10) === todayKey).length;
    const activeWaitlists = sessions.filter((entry) => (entry.waitlistCount ?? 0) > 0).length;
    const atCapacity = sessions.filter((entry) => entry.status !== "cancelled" && entry.enrolled >= entry.capacity).length;
    const attendanceToday = registrations.filter(
      (entry) => ["checked_in", "attended", "late", "completed"].includes(entry.status) && (entry.updatedAt ?? entry.registeredAt ?? "").slice(0, 10) === todayKey
    ).length;
    return {
      registrationsToday,
      upcomingSessions: sessionsToday.length,
      activeWaitlists,
      atCapacity,
      attendanceToday
    };
  }, [sessions, registrations]);

  const sessionStatus = selectedSession ? getSessionStatus(selectedSession) : "Open";

  const ensureRosterPermission = () => {
    const permission = assertPermission("rosterAccess");
    if (!permission.ok) {
      setFeedback(permission.message);
      return false;
    }
    return true;
  };

  const runRegister = (customerId: string, override = false) => {
    if (!selectedSession || !ensureRosterPermission()) return;
    const result = registerCustomerForSession({
      customerId,
      sessionId: selectedSession.id,
      override,
      registrationSource: "front_desk",
      registeredByStaffId: activeStaff?.id,
      registeredByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
    });
    setFeedback(result.message);
  };

  const runTransfer = (registrationId: string) => {
    if (!ensureRosterPermission()) return;
    const target = transferTargetByRegistration[registrationId];
    if (!target) return setFeedback("Select a target session.");
    const result = transferRegistration({
      registrationId,
      targetSessionId: target,
      override: true,
      updatedByStaffId: activeStaff?.id,
      updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
    });
    setFeedback(result.message);
  };

  const runDuplicate = (registrationId: string) => {
    if (!ensureRosterPermission()) return;
    const target = transferTargetByRegistration[registrationId];
    const result = duplicateRegistration({
      registrationId,
      targetSessionId: target || undefined,
      updatedByStaffId: activeStaff?.id,
      updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
    });
    setFeedback(result.message);
  };

  const runRemove = (registrationId: string) => {
    if (!ensureRosterPermission()) return;
    const result = cancelRegistration(registrationId);
    setFeedback(result.message);
  };

  const runMoveToWaitlist = (registrationId: string) => {
    if (!ensureRosterPermission()) return;
    const result = moveRegistrationToWaitlist(registrationId);
    setFeedback(result.message);
  };

  const runPromote = (registrationId: string) => {
    if (!ensureRosterPermission()) return;
    const result = promoteWaitlistedRegistration(registrationId);
    setFeedback(result.message);
  };

  const runReorderWaitlist = (registrationId: string, direction: "up" | "down") => {
    if (!ensureRosterPermission()) return;
    const result = reorderWaitlistedRegistration(registrationId, direction);
    setFeedback(result.message);
  };

  const runAddNote = (registrationId: string) => {
    if (!ensureRosterPermission()) return;
    const note = noteDraftByRegistration[registrationId] ?? "";
    const result = addRegistrationNote(registrationId, note, activeStaff?.id);
    setFeedback(result.message);
    if (result.ok) setNoteDraftByRegistration((prev) => ({ ...prev, [registrationId]: "" }));
  };

  return (
    <section className="space-y-4" data-testid="registrations-workstation">
      <PageHeader
        title="Registrations"
        description="Operational center for rosters, waitlists, attendance, transfers, and cancellations."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/customers">
              <Button variant="secondary">Add Customer</Button>
            </Link>
            <Link href="/calendar">
              <Button variant="secondary">Create Session</Button>
            </Link>
            <Link href="/programs">
              <Button variant="secondary">View Programs</Button>
            </Link>
          </div>
        }
      />
      <div className="rounded-xl border bg-card p-3 lg:hidden">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Mobile workflow</p>
        <p className="mt-1 text-sm text-muted-foreground">Search sessions first, then manage the roster and enrollment from stacked cards below.</p>
      </div>
      {feedback ? <p role="status" className="rounded-lg border bg-secondary/20 px-3 py-2 text-sm">{feedback}</p> : null}

      <div className="grid gap-3 md:grid-cols-5">
        <button type="button" className="rounded-xl border bg-card p-4 text-left" onClick={() => setRegistrationFilter("all")}>
          <p className="text-sm text-muted-foreground">Registrations Today</p><p className="text-2xl font-semibold">{dashboard.registrationsToday}</p>
        </button>
        <button type="button" className="rounded-xl border bg-card p-4 text-left" onClick={() => setAvailableOnly(false)}>
          <p className="text-sm text-muted-foreground">Upcoming Sessions</p><p className="text-2xl font-semibold">{dashboard.upcomingSessions}</p>
        </button>
        <button type="button" className="rounded-xl border bg-card p-4 text-left" onClick={() => setRegistrationFilter("waitlisted")}>
          <p className="text-sm text-muted-foreground">Active Waitlists</p><p className="text-2xl font-semibold">{dashboard.activeWaitlists}</p>
        </button>
        <button type="button" className="rounded-xl border bg-card p-4 text-left" onClick={() => setAvailableOnly(true)}>
          <p className="text-sm text-muted-foreground">Sessions At Capacity</p><p className="text-2xl font-semibold">{dashboard.atCapacity}</p>
        </button>
        <button type="button" className="rounded-xl border bg-card p-4 text-left" onClick={() => setRegistrationFilter("attended")}>
          <p className="text-sm text-muted-foreground">Attendance Today</p><p className="text-2xl font-semibold">{dashboard.attendanceToday}</p>
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr_1fr]" data-testid="registrations-layout">
        <section className="rounded-xl border bg-card p-4 space-y-3" aria-label="session-search-panel">
          <h2 className="text-base font-semibold">Session Search</h2>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Search sessions</span>
            <Input value={sessionQuery} onChange={(e) => setSessionQuery(e.target.value)} placeholder="Session title, program, instructor" />
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Program</span><select aria-label="Program" className="h-10 w-full rounded-md border bg-background px-3" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}><option value="all">All programs</option>{programs.map((program) => (<option key={program.id} value={program.id}>{program.title}</option>))}</select></label>
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Instructor</span><select aria-label="Instructor" className="h-10 w-full rounded-md border bg-background px-3" value={instructorFilter} onChange={(e) => setInstructorFilter(e.target.value)}><option value="all">All instructors</option>{Array.from(new Set(sessions.map((session) => session.instructorName).filter(Boolean))).map((name) => (<option key={name} value={name ?? ""}>{name}</option>))}</select></label>
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Location</span><select aria-label="Location" className="h-10 w-full rounded-md border bg-background px-3" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}><option value="all">All locations</option>{Array.from(new Set(sessions.map((session) => session.locationId))).map((locationId) => (<option key={locationId} value={locationId}>{locationId}</option>))}</select></label>
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Age group</span><select className="h-10 w-full rounded-md border bg-background px-3" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as "all" | "youth" | "adult")}><option value="all">All ages</option><option value="youth">Youth</option><option value="adult">Adult</option></select></label>
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Date from</span><Input aria-label="Date from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Date to</span><Input aria-label="Date to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /> Available only</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={waitlistOnly} onChange={(e) => setWaitlistOnly(e.target.checked)} /> Waitlist only</label>
          </div>
          <div className="space-y-2 max-h-[52vh] overflow-auto pr-1" data-testid="session-search-results">
            {filteredSessions.map((session) => {
              const program = sessionProgramMap.get(session.programId);
              const selected = selectedSession?.id === session.id;
              return (
                <button type="button" key={session.id} onClick={() => setSelectedSessionId(session.id)} className={`w-full rounded-lg border p-3 text-left ${selected ? "border-primary bg-primary/5" : "hover:bg-secondary/40"}`}>
                  <p className="font-medium">{session.title?.trim() || program?.title || "Session"}</p>
                  <p className="text-xs text-muted-foreground">{program?.title ?? "Unknown program"}</p>
                  <p className="text-xs text-muted-foreground">{formatDateRange(session.startsAt, session.endsAt)}</p>
                  <p className="text-xs text-muted-foreground">Instructor: {session.instructorName ?? "Unassigned"}</p>
                  <p className="text-xs text-muted-foreground">Capacity {session.enrolled}/{session.capacity} • Waitlist {session.waitlistCount ?? 0}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3 xl:sticky xl:top-28" aria-label="session-details-panel">
          <h2 className="text-base font-semibold">Session Details</h2>
          {!selectedSession ? <p className="text-sm text-muted-foreground">Select a session to view details.</p> : (
            <>
              <div className="rounded-lg border bg-secondary/20 p-3">
                <p className="font-semibold">{selectedProgram?.title ?? "Program"}</p>
                <p className="text-sm text-muted-foreground">{selectedSession.title?.trim() || "Session"}</p>
                <p className="text-sm text-muted-foreground">{formatDateRange(selectedSession.startsAt, selectedSession.endsAt)}</p>
                <p className="text-sm text-muted-foreground">Location: {selectedSession.locationId}</p>
                <p className="text-sm text-muted-foreground">Instructor: {selectedSession.instructorName ?? "Unassigned"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={getStatusTone(sessionStatus)}>{sessionStatus}</Badge>
                  <span className="text-xs text-muted-foreground">{selectedSession.enrolled}/{selectedSession.capacity} registered</span>
                  <span className="text-xs text-muted-foreground">{Math.max(selectedSession.capacity - selectedSession.enrolled, 0)} available</span>
                  <span className="text-xs text-muted-foreground">{waitlisted.length} waitlisted</span>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm"><span className="mb-1 block text-muted-foreground">Registration status</span><select className="h-10 w-full rounded-md border bg-background px-3" value={registrationFilter} onChange={(e) => setRegistrationFilter(e.target.value as RegistrationFilter)}><option value="all">All</option><option value="registered">Registered</option><option value="waitlisted">Waitlisted</option><option value="checked_in">Checked In</option><option value="attended">Attended</option><option value="absent">Absent</option><option value="cancelled">Cancelled</option></select></label>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Registered Roster</h3>
                  <div className="flex gap-2">
                    <Button className="h-8" variant="secondary" onClick={() => registered.forEach((entry) => markRegistrationAttendance(entry.id, "checked_in", activeStaff?.id))}>Check In all</Button>
                    <Button className="h-8" variant="secondary" onClick={() => registered.forEach((entry) => markRegistrationAttendance(entry.id, "absent", activeStaff?.id))}>Mark all absent</Button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {registered.length === 0 ? <p className="text-sm text-muted-foreground">No registered attendees.</p> : null}
                  {registered.map((entry) => {
                    const customer = customers.find((c) => c.id === entry.customerId);
                    if (!customer) return null;
                    const sessionOptions = filteredSessions.filter((s) => s.id !== selectedSession.id);
                    const checkedIn = ["checked_in", "attended", "late", "completed"].includes(entry.status);
                    return (
                      <article key={entry.id} className="rounded-lg border p-2 text-sm" onClick={() => setSelectedRegistrationId(entry.id)}>
                        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <CustomerAvatar customer={customer} sizeClassName="h-9 w-9" />
                              <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Registered: {formatDateTime(entry.registeredAt)} • Status: {entry.status} • {entry.registrationSource ?? "front_desk"}</p>
                            <p className="text-xs text-muted-foreground">Check-in: {checkedIn ? "✓ Present" : "Not checked in"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <Button className="h-8" variant="secondary" onClick={() => markRegistrationAttendance(entry.id, "checked_in", activeStaff?.id)}>Check In</Button>
                            <Button className="h-8" variant="secondary" onClick={() => markRegistrationAttendance(entry.id, "attended", activeStaff?.id)}>Mark Attended</Button>
                            <Button className="h-8" variant="secondary" onClick={() => markRegistrationAttendance(entry.id, "absent", activeStaff?.id)}>Mark Absent</Button>
                            <Button className="h-8" variant="secondary" onClick={() => runMoveToWaitlist(entry.id)}>Move to waitlist</Button>
                            <Button className="h-8" variant="destructiveSubtle" onClick={() => runRemove(entry.id)}>Remove</Button>
                          </div>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                          <select className="h-9 rounded-md border bg-background px-2 text-xs" value={transferTargetByRegistration[entry.id] ?? ""} onChange={(e) => setTransferTargetByRegistration((prev) => ({ ...prev, [entry.id]: e.target.value }))}>
                            <option value="">Move to another session</option>
                            {sessionOptions.map((session) => <option key={session.id} value={session.id}>{session.title?.trim() || sessionProgramMap.get(session.programId)?.title || "Session"} • {formatDateTime(session.startsAt)}</option>)}
                          </select>
                          <Button className="h-9" variant="secondary" onClick={() => runTransfer(entry.id)}>Transfer</Button>
                          <Button className="h-9" variant="secondary" onClick={() => runDuplicate(entry.id)}>Duplicate</Button>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                          <Input value={noteDraftByRegistration[entry.id] ?? ""} onChange={(e) => setNoteDraftByRegistration((prev) => ({ ...prev, [entry.id]: e.target.value }))} placeholder="Add staff note" />
                          <Button className="h-9" variant="secondary" onClick={() => runAddNote(entry.id)}>Add Note</Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Waitlist</h3>
                <div className="mt-2 space-y-2">
                  {waitlisted.length === 0 ? <p className="text-sm text-muted-foreground">No waitlisted attendees.</p> : null}
                  {waitlisted.map((entry, index) => {
                    const customer = customers.find((c) => c.id === entry.customerId);
                    if (!customer) return null;
                    return (
                      <article key={entry.id} className="rounded-lg border p-2 text-sm" onClick={() => setSelectedRegistrationId(entry.id)}>
                        <div className="flex items-center gap-2">
                          <CustomerAvatar customer={customer} sizeClassName="h-9 w-9" />
                          <p className="font-medium">#{entry.waitlistPosition ?? index + 1} {customer.firstName} {customer.lastName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Added {formatDateTime(entry.registeredAt)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button className="h-8" variant="secondary" onClick={() => runPromote(entry.id)}>Promote from waitlist</Button>
                          <Button className="h-8" variant="secondary" onClick={() => runReorderWaitlist(entry.id, "up")}>Move up</Button>
                          <Button className="h-8" variant="secondary" onClick={() => runReorderWaitlist(entry.id, "down")}>Move down</Button>
                          <Button className="h-8" variant="secondary" onClick={() => setFeedback(`${customer.firstName} ${customer.lastName} notified (mock).`)}>Notify promoted customer</Button>
                          <Button className="h-8" variant="destructiveSubtle" onClick={() => runRemove(entry.id)}>Remove</Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3 xl:sticky xl:top-28" aria-label="customer-enrollment-panel">
          <h2 className="text-base font-semibold">Customer Enrollment</h2>
          <label className="text-sm"><span className="mb-1 block text-muted-foreground">Search customer</span><Input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Name, email, phone, member ID" /></label>
          <div className="space-y-2 max-h-[38vh] overflow-auto pr-1">
            {customerResults.length === 0 ? <p className="text-sm text-muted-foreground">Search to enroll a customer.</p> : null}
            {customerResults.map((customer) => {
              const eligibility = selectedSession
                ? buildEligibility(customer, selectedSession, selectedProgram, registrations, activeMembershipCustomerIds, getWaiverStatusForCustomer)
                : { state: "blocked", label: "Blocked", reasons: ["Select a session first."] as string[] };
              const isFull = selectedSession ? selectedSession.enrolled >= selectedSession.capacity : false;
              return (
                <article key={customer.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CustomerAvatar customer={customer} sizeClassName="h-10 w-10" />
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{customer.memberId} • {customer.phone}</p>
                  <div className="mt-1"><Badge tone={eligibility.state === "eligible" ? "success" : eligibility.state === "warning" ? "warning" : "danger"}>{eligibility.label}</Badge></div>
                  <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">{eligibility.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button className="h-8" disabled={!selectedSession || eligibility.state === "blocked"} onClick={() => runRegister(customer.id)}>{isFull && selectedSession?.waitlistEnabled ? "Add To Waitlist" : "Register"}</Button>
                    {eligibility.state !== "eligible" ? <Button className="h-8" variant="caution" disabled={!selectedSession} onClick={() => runRegister(customer.id, true)}>Override & Register</Button> : null}
                    <Link className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium hover:bg-secondary" href={buildCustomerDetailHref({
                      customerId: customer.id,
                      currentPathname: pathname,
                      currentSearch
                    })}>View Customer</Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="rounded-xl border p-3 space-y-2" aria-label="registration-timeline">
            <h3 className="text-sm font-semibold">Registration activity</h3>
            {!selectedRegistration ? <p className="text-xs text-muted-foreground">Select a registration from roster or waitlist.</p> : (
              <>
                <p className="text-xs text-muted-foreground">Registration ID: {selectedRegistration.id}</p>
                <div className="max-h-[22vh] space-y-2 overflow-auto pr-1">
                  {selectedRegistrationTimeline.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
                  ) : selectedRegistrationTimeline.map((event) => (
                    <article key={event.id} className="rounded-md border p-2 text-xs">
                      <p className="font-medium">{event.action.replaceAll("_", " ")}</p>
                      <p className="text-muted-foreground">{formatDateTime(event.createdAt)} • {event.staffName ?? "System"}</p>
                      {event.note ? <p className="text-muted-foreground">{event.note}</p> : null}
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
