"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { ClassCampSession, Customer, Program, Registration } from "@/types/domain";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} • ${s.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  })} - ${e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function getStatusTone(status: "Open" | "Full" | "Waitlist Active" | "Cancelled"): "success" | "warning" | "danger" {
  if (status === "Open") return "success";
  if (status === "Cancelled") return "danger";
  return "warning";
}

function getSessionStatus(session: ClassCampSession): "Open" | "Full" | "Waitlist Active" | "Cancelled" {
  if (session.status === "cancelled") return "Cancelled";
  if (session.enrolled < session.capacity) return "Open";
  if (session.waitlistEnabled) return "Waitlist Active";
  return "Full";
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
  if (typeof program.minimumAge === "number" && typeof age === "number" && age < program.minimumAge) {
    reasons.push(`Must be at least ${program.minimumAge}.`);
  }
  if (typeof program.maximumAge === "number" && typeof age === "number" && age > program.maximumAge) {
    reasons.push(`Must be ${program.maximumAge} or younger.`);
  }

  if (program.memberRequired && !activeMembershipCustomerIds.has(customer.id)) {
    reasons.push("Membership required.");
  }

  if (session.enrolled >= session.capacity && !session.waitlistEnabled) {
    reasons.push("Session is full and waitlist is disabled.");
  }

  if (reasons.some((r) => r.includes("at least") || r.includes("younger"))) {
    return { state: "blocked", label: "Age Restriction", reasons };
  }
  if (reasons.some((r) => r.includes("cancelled") || r.includes("Already registered") || r.includes("full"))) {
    return { state: "blocked", label: "Blocked", reasons };
  }
  if (reasons.some((r) => r.includes("Membership required"))) {
    return { state: "warning", label: "Membership Required", reasons };
  }
  if (reasons.some((r) => r.includes("waiver"))) {
    return { state: "warning", label: "Needs Waiver", reasons };
  }
  return { state: "eligible", label: "Eligible", reasons: ["All checks passed."] };
}

export default function RegistrationsPage() {
  const {
    sessions,
    programs,
    customers,
    registrations,
    customerAccessRecords,
    getWaiverStatusForCustomer,
    registerCustomerForSession,
    cancelRegistration,
    moveRegistrationToWaitlist,
    promoteWaitlistedRegistration
  } = useCustomerState();
  const { activeStaff, assertPermission } = useWorkstationState();

  const [programFilter, setProgramFilter] = useState("all");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("2026-05-01");
  const [dateTo, setDateTo] = useState("2026-05-31");
  const [ageGroup, setAgeGroup] = useState<"all" | "youth" | "adult">("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [waitlistOnly, setWaitlistOnly] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [feedback, setFeedback] = useState("");

  const activeMembershipCustomerIds = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return new Set(
      customerAccessRecords
        .filter((entry) => entry.type === "membership" && entry.status === "active" && (!entry.expirationDate || entry.expirationDate >= today))
        .map((entry) => entry.customerId)
    );
  }, [customerAccessRecords]);

  const sessionProgramMap = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);

  const filteredSessions = useMemo(() => {
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
      if (waitlistOnly && !session.waitlistEnabled) return false;
      return true;
    });
  }, [sessions, sessionProgramMap, programFilter, instructorFilter, locationFilter, dateFrom, dateTo, ageGroup, availableOnly, waitlistOnly]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? filteredSessions[0] ?? null;
  }, [sessions, selectedSessionId, filteredSessions]);

  const selectedProgram = selectedSession ? sessionProgramMap.get(selectedSession.programId) : undefined;

  const sessionRegistrations = useMemo(() => {
    if (!selectedSession) return [];
    return registrations.filter((entry) => entry.sessionId === selectedSession.id && entry.status !== "cancelled");
  }, [registrations, selectedSession]);

  const registered = useMemo(
    () => sessionRegistrations.filter((entry) => ["confirmed", "attended", "checked_in", "late", "completed", "absent", "no_show", "excused"].includes(entry.status)),
    [sessionRegistrations]
  );
  const waitlisted = useMemo(
    () => sessionRegistrations.filter((entry) => entry.status === "waitlisted").sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999)),
    [sessionRegistrations]
  );

  const customerResults = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter((customer) => {
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        return (
          fullName.includes(q) ||
          customer.email.toLowerCase().includes(q) ||
          customer.phone.toLowerCase().includes(q) ||
          customer.memberId.toLowerCase().includes(q)
        );
      })
      .slice(0, 10);
  }, [customerSearch, customers]);

  const sessionStatus = selectedSession ? getSessionStatus(selectedSession) : "Open";

  const runRegister = (customerId: string, override = false) => {
    if (!selectedSession) return;
    const permission = assertPermission("rosterAccess");
    if (!permission.ok) {
      setFeedback(permission.message);
      return;
    }
    const actorName = activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined;
    const result = registerCustomerForSession({
      customerId,
      sessionId: selectedSession.id,
      override,
      registrationSource: "front_desk",
      registeredByStaffId: activeStaff?.id,
      registeredByStaffName: actorName
    });
    setFeedback(result.message);
  };

  const runRemove = (registrationId: string) => {
    const permission = assertPermission("rosterAccess");
    if (!permission.ok) return setFeedback(permission.message);
    const result = cancelRegistration(registrationId);
    setFeedback(result.message);
  };

  const runMoveToWaitlist = (registrationId: string) => {
    const permission = assertPermission("rosterAccess");
    if (!permission.ok) return setFeedback(permission.message);
    const result = moveRegistrationToWaitlist(registrationId);
    setFeedback(result.message);
  };

  const runPromote = (registrationId: string) => {
    const permission = assertPermission("rosterAccess");
    if (!permission.ok) return setFeedback(permission.message);
    const result = promoteWaitlistedRegistration(registrationId);
    setFeedback(result.message);
  };

  return (
    <section className="space-y-4" data-testid="registrations-workstation">
      <PageHeader title="Registrations" description="Search sessions, validate eligibility, and enroll customers fast." />
      {feedback ? (
        <p role="status" className="rounded-lg border bg-secondary/20 px-3 py-2 text-sm">{feedback}</p>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1fr]" data-testid="registrations-layout">
        <section className="rounded-xl border bg-card p-4 space-y-3" aria-label="session-search-panel">
          <h2 className="text-base font-semibold">Session Search</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Program</span>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                <option value="all">All programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>{program.title}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Instructor</span>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={instructorFilter} onChange={(e) => setInstructorFilter(e.target.value)}>
                <option value="all">All instructors</option>
                {Array.from(new Set(sessions.map((session) => session.instructorName).filter(Boolean))).map((name) => (
                  <option key={name} value={name ?? ""}>{name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Location</span>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                <option value="all">All locations</option>
                {Array.from(new Set(sessions.map((session) => session.locationId))).map((locationId) => (
                  <option key={locationId} value={locationId}>{locationId}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Age group</span>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as "all" | "youth" | "adult")}>
                <option value="all">All ages</option>
                <option value="youth">Youth</option>
                <option value="adult">Adult</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Date from</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Date to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /> Available only
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={waitlistOnly} onChange={(e) => setWaitlistOnly(e.target.checked)} /> Waitlist only
            </label>
          </div>
          <div className="space-y-2 max-h-[56vh] overflow-auto pr-1" data-testid="session-search-results">
            {filteredSessions.map((session) => {
              const program = sessionProgramMap.get(session.programId);
              const selected = selectedSession?.id === session.id;
              return (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full rounded-lg border p-3 text-left ${selected ? "border-primary bg-primary/5" : "hover:bg-secondary/40"}`}
                >
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

        <section className="rounded-xl border bg-card p-4 space-y-3" aria-label="session-details-panel">
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
                  <span className="text-xs text-muted-foreground">{selectedSession.enrolled} registered</span>
                  <span className="text-xs text-muted-foreground">{Math.max(selectedSession.capacity - selectedSession.enrolled, 0)} available</span>
                  <span className="text-xs text-muted-foreground">{waitlisted.length} waitlist</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Registered</h3>
                <div className="mt-2 space-y-2">
                  {registered.length === 0 ? <p className="text-sm text-muted-foreground">No registered attendees.</p> : null}
                  {registered.map((entry) => {
                    const customer = customers.find((c) => c.id === entry.customerId);
                    if (!customer) return null;
                    const age = customer.dateOfBirth
                      ? Math.max(0, Math.floor((new Date(selectedSession.startsAt).getTime() - new Date(`${customer.dateOfBirth}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
                      : "—";
                    return (
                      <article key={entry.id} className="rounded-lg border p-2 text-sm">
                        <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                        <p className="text-xs text-muted-foreground">Age {age} • {entry.status}</p>
                        <p className="text-xs text-muted-foreground">Registered {entry.registeredAt ? formatDateTime(entry.registeredAt) : "—"}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button className="h-8" variant="secondary" onClick={() => runMoveToWaitlist(entry.id)}>Move to waitlist</Button>
                          <Button className="h-8" variant="destructiveSubtle" onClick={() => runRemove(entry.id)}>Remove registration</Button>
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
                  {waitlisted.map((entry) => {
                    const customer = customers.find((c) => c.id === entry.customerId);
                    if (!customer) return null;
                    return (
                      <article key={entry.id} className="rounded-lg border p-2 text-sm">
                        <p className="font-medium">#{entry.waitlistPosition ?? "-"} {customer.firstName} {customer.lastName}</p>
                        <p className="text-xs text-muted-foreground">Added {entry.registeredAt ? formatDateTime(entry.registeredAt) : "—"}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button className="h-8" variant="secondary" onClick={() => runPromote(entry.id)}>Promote from waitlist</Button>
                          <Button className="h-8" variant="destructiveSubtle" onClick={() => runRemove(entry.id)}>Remove</Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold">Registration activity</h3>
                <div className="mt-2 space-y-2">
                  {sessionRegistrations.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
                  {sessionRegistrations.slice().sort((a, b) => (b.registeredAt ?? "").localeCompare(a.registeredAt ?? "")).slice(0, 8).map((entry) => {
                    const customer = customers.find((c) => c.id === entry.customerId);
                    return (
                      <article key={`audit-${entry.id}`} className="rounded-md border p-2 text-xs">
                        <p className="font-medium">{customer ? `${customer.firstName} ${customer.lastName}` : "Unknown customer"} • {entry.status}</p>
                        <p className="text-muted-foreground">
                          {entry.registrationSource ?? "front_desk"} • {entry.registeredByStaffName ?? "Unknown staff"} • {entry.registeredAt ? formatDateTime(entry.registeredAt) : "—"}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3" aria-label="customer-enrollment-panel">
          <h2 className="text-base font-semibold">Customer Enrollment</h2>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Search customer</span>
            <Input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Name, email, phone, member ID"
            />
          </label>
          <div className="space-y-2 max-h-[64vh] overflow-auto pr-1">
            {customerResults.length === 0 ? <p className="text-sm text-muted-foreground">Search to enroll a customer.</p> : null}
            {customerResults.map((customer) => {
              const eligibility = selectedSession
                ? buildEligibility(
                    customer,
                    selectedSession,
                    selectedProgram,
                    registrations,
                    activeMembershipCustomerIds,
                    getWaiverStatusForCustomer
                  )
                : { state: "blocked", label: "Blocked", reasons: ["Select a session first."] as string[] };
              const canOverride = eligibility.state !== "eligible";
              const isFull = selectedSession ? selectedSession.enrolled >= selectedSession.capacity : false;
              return (
                <article key={customer.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                  <p className="text-xs text-muted-foreground">{customer.memberId} • {customer.phone}</p>
                  <div className="mt-1">
                    <Badge tone={eligibility.state === "eligible" ? "success" : eligibility.state === "warning" ? "warning" : "danger"}>{eligibility.label}</Badge>
                  </div>
                  <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                    {eligibility.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      className="h-8"
                      disabled={!selectedSession || eligibility.state === "blocked"}
                      onClick={() => runRegister(customer.id)}
                    >
                      {isFull && selectedSession?.waitlistEnabled ? "Add To Waitlist" : "Register"}
                    </Button>
                    {canOverride ? (
                      <Button
                        className="h-8"
                        variant="caution"
                        disabled={!selectedSession}
                        onClick={() => runRegister(customer.id, true)}
                      >
                        Override & Register
                      </Button>
                    ) : null}
                    <Button className="h-8" variant="secondary">View Customer</Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
