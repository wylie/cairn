import { useMemo, useState } from "react";
import type { ClassCampSession, Customer, HouseholdMember, Program, Registration } from "@/types/domain";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { Button } from "@/components/ui/button";
import { filterCustomers } from "@/lib/data/customer-search";
import { Badge } from "@/components/ui/badge";

type SessionActivityEvent = {
  id: string;
  sessionId: string;
  customerName?: string;
  action: "registered" | "removed" | "waitlisted" | "promoted" | "checked_in" | "marked_absent";
  occurredAt: string;
  staffName?: string;
};

export function SessionDetailPanel({
  session,
  program,
  registrations,
  customers,
  householdMembers,
  getEligibility,
  onRegister,
  onRegisterHousehold,
  onCancelRegistration,
  onMoveToWaitlist,
  onPromoteWaitlist,
  onMarkAttendance,
  onSellAccess,
  onMarkWaiverSigned,
  onEditSession,
  onMoveSession,
  onCancelSession,
  onDuplicateSession,
  onTakeAttendance,
  onOverrideRegister,
  canOverride,
  activityEvents,
  onClose
}: {
  session: ClassCampSession;
  program?: Program;
  registrations: Registration[];
  customers: Customer[];
  householdMembers: HouseholdMember[];
  getEligibility: (customerId: string) => { state: "ready" | "warning" | "blocked"; reasons: string[]; guardianName?: string };
  onRegister: (customerId: string) => void;
  onRegisterHousehold: (customerIds: string[]) => void;
  onCancelRegistration: (registrationId: string) => void;
  onMoveToWaitlist: (registrationId: string) => void;
  onPromoteWaitlist: (registrationId: string) => void;
  onMarkAttendance: (registrationId: string, status: "attended" | "absent" | "late" | "excused" | "no_show" | "checked_in" | "completed") => void;
  onSellAccess: (customerId: string) => void;
  onMarkWaiverSigned: (customerId: string) => void;
  onEditSession: () => void;
  onMoveSession: () => void;
  onCancelSession: () => void;
  onDuplicateSession: () => void;
  onTakeAttendance: () => void;
  onOverrideRegister: (customerId: string) => void;
  canOverride: boolean;
  activityEvents: SessionActivityEvent[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [householdSelection, setHouseholdSelection] = useState<string[]>([]);
  const [attendanceMode, setAttendanceMode] = useState(false);
  const filteredCustomers = useMemo(() => (query.trim() ? filterCustomers(customers, query).slice(0, 8) : []), [query, customers]);
  const sessionRegistrations = registrations.filter((entry) => entry.sessionId === session.id && entry.status !== "cancelled");
  const householdSeedCandidate = filteredCustomers[0];
  const householdGroup = useMemo(() => {
    if (!householdSeedCandidate) return [] as Customer[];
    const membership = householdMembers.find((entry) => entry.customerId === householdSeedCandidate.id);
    if (!membership) return [];
    return householdMembers
      .filter((entry) => entry.householdId === membership.householdId && entry.customerId !== householdSeedCandidate.id)
      .map((entry) => customers.find((customer) => customer.id === entry.customerId))
      .filter((entry): entry is Customer => Boolean(entry));
  }, [householdSeedCandidate, customers, householdMembers]);
  const confirmed = sessionRegistrations.filter((entry) => entry.status === "confirmed" || entry.status === "attended" || entry.status === "absent");
  const waitlisted = sessionRegistrations
    .filter((entry) => entry.status === "waitlisted")
    .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
  const isFull = session.enrolled >= session.capacity;
  const availableSpots = Math.max(session.capacity - session.enrolled, 0);
  const summaryStatus: "Open" | "Full" | "Waitlist" | "Closed" | "Cancelled" =
    session.status === "cancelled"
      ? "Cancelled"
      : session.status === "completed"
        ? "Closed"
        : isFull && session.waitlistEnabled
          ? "Waitlist"
          : isFull
            ? "Full"
            : "Open";
  const summaryTone = summaryStatus === "Open" ? "success" : summaryStatus === "Cancelled" || summaryStatus === "Closed" ? "danger" : "warning";
  const dayLabel = new Date(session.startsAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  const timeLabel = `${new Date(session.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}–${new Date(session.endsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  const sessionActivity = activityEvents
    .filter((entry) => entry.sessionId === session.id)
    .slice(0, 10);

  const rosterRows = confirmed.map((entry) => {
    const customer = customers.find((item) => item.id === entry.customerId);
    const isCheckedIn = entry.status === "checked_in" || entry.status === "attended" || entry.status === "completed" || entry.status === "late";
    return { entry, customer, isCheckedIn };
  });

  return (
    <aside className="rounded-xl border bg-card p-4" aria-label="session-detail-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{program?.title ?? "Session"}</h3>
          {session.title && session.title.trim() && session.title.trim().toLowerCase() !== (program?.title ?? "").toLowerCase() ? (
            <p className="text-sm text-muted-foreground">{session.title}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">{dayLabel}</p>
          <p className="text-sm text-muted-foreground">{timeLabel}</p>
          <p className="text-sm text-muted-foreground">{session.locationId}</p>
          <p className="text-sm text-muted-foreground">Instructor: {session.instructorName ?? "Unassigned"}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
      <div className="mt-2 rounded-md border bg-secondary/20 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{session.enrolled} / {session.capacity} spots filled</p>
          <Badge tone={summaryTone}>{summaryStatus}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{waitlisted.length} waitlisted • Drop-ins {program?.dropInAllowed ? "allowed" : "not allowed"}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button className="h-9" variant="secondary" onClick={onEditSession}>Edit Session</Button>
        <Button className="h-9" variant="secondary" onClick={onMoveSession}>Move Session</Button>
        <Button className="h-9" variant="secondary" onClick={onDuplicateSession}>Duplicate Session</Button>
        <Button
          className="h-9"
          variant="secondary"
          onClick={() => {
            setAttendanceMode(true);
            onTakeAttendance();
          }}
        >
          Take Attendance
        </Button>
        <Button className="h-9" variant="destructiveSubtle" onClick={onCancelSession}>Cancel Session</Button>
        <Button className="h-9" variant="ghost" disabled>Message Participants</Button>
      </div>

      <div className="mt-3 space-y-2">
        <div className="rounded-md border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
          Capacity: {session.enrolled}/{session.capacity} • Available spots: {availableSpots} • Waitlist: {waitlisted.length}
        </div>
        <CustomerSearchCombobox
          label="Session customer search"
          placeholder="Search customer to register"
          query={query}
          onQueryChange={setQuery}
          customers={filteredCustomers}
          onSelect={(customerId) => {
            onRegister(customerId);
            setQuery("");
          }}
          emptyMessage="No customers found"
        />
        {filteredCustomers.length > 0 ? (
          <div className="space-y-2">
            {filteredCustomers.map((candidate) => {
              const candidateEligibility = getEligibility(candidate.id);
              const dob = candidate.dateOfBirth ? new Date(`${candidate.dateOfBirth}T00:00:00Z`) : null;
              const age = dob && !Number.isNaN(dob.getTime()) ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425))) : null;
              return (
                <div key={candidate.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{candidate.firstName} {candidate.lastName}</p>
                      <p className="text-xs text-muted-foreground">{candidate.memberId} • {candidate.phone || "No phone"}</p>
                      <p className="text-xs text-muted-foreground">Age: {age ?? "—"} • Waiver: {candidate.waiverId ? "On file" : "Missing"}</p>
                    </div>
                    <p className={`text-xs ${candidateEligibility.state === "blocked" ? "text-rose-700" : candidateEligibility.state === "warning" ? "text-amber-800" : "text-emerald-700"}`}>
                      {candidateEligibility.state === "ready" ? "READY" : candidateEligibility.state === "warning" ? "WARNING" : "BLOCKED"}
                    </p>
                  </div>
                  <div className="mt-1">
                    {candidateEligibility.reasons.map((reason) => (
                      <p key={reason} className="text-xs text-muted-foreground">{reason}</p>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button className="h-9" onClick={() => onRegister(candidate.id)} disabled={candidateEligibility.state === "blocked"}>
                      {isFull && session.waitlistEnabled ? "Add to Waitlist" : "Register"}
                    </Button>
                    {candidateEligibility.state === "blocked" && canOverride ? (
                      <Button className="h-9" variant="caution" onClick={() => onOverrideRegister(candidate.id)}>
                        Override & Register
                      </Button>
                    ) : null}
                    <Button className="h-9" variant="secondary" onClick={() => onSellAccess(candidate.id)}>Sell Access</Button>
                    <Button className="h-9" variant="secondary" onClick={() => onMarkWaiverSigned(candidate.id)}>Mark Waiver Signed</Button>
                  </div>
                </div>
              );
            })}
            {householdGroup.length > 0 ? (
              <div className="mt-3 space-y-2 rounded-md border border-dashed p-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Household quick register</p>
                <div className="space-y-1">
                  {householdGroup.map((entry) => (
                    <label key={entry.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={householdSelection.includes(entry.id)}
                        onChange={(event) =>
                          setHouseholdSelection((prev) =>
                            event.target.checked ? [...prev, entry.id] : prev.filter((id) => id !== entry.id)
                          )
                        }
                      />
                      <span>{entry.firstName} {entry.lastName}</span>
                    </label>
                  ))}
                </div>
                <Button
                  className="h-9"
                  variant="secondary"
                  disabled={householdSelection.length === 0}
                    onClick={() => {
                      onRegisterHousehold(householdSelection);
                      setHouseholdSelection([]);
                    }}
                  >
                    Register Selected Household
                  </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium">Registered roster</p>
        {confirmed.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button className="h-9" variant="secondary" onClick={() => confirmed.forEach((entry) => onMarkAttendance(entry.id, "attended"))}>Mark all present</Button>
            <Button className="h-9" variant="secondary" onClick={() => confirmed.filter((entry) => entry.status !== "attended" && entry.status !== "checked_in").forEach((entry) => onMarkAttendance(entry.id, "absent"))}>Mark remaining absent</Button>
          </div>
        ) : null}
        {confirmed.length === 0 ? <p className="text-sm text-muted-foreground">No registrations yet.</p> : null}
        {attendanceMode ? (
          <div className="space-y-2 rounded-md border p-3" aria-label="attendance-mode">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Attendance mode</p>
              <Button className="h-8" variant="secondary" onClick={() => setAttendanceMode(false)}>Exit</Button>
            </div>
            {rosterRows.map(({ entry, customer, isCheckedIn }) => (
              <article key={entry.id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">{customer ? `${customer.firstName} ${customer.lastName}` : "Unknown customer"}</p>
                  <p className="text-xs text-muted-foreground">{isCheckedIn ? "Present" : "Not checked in"}</p>
                </div>
                <div className="flex gap-2">
                  <Button className="h-10 px-4" variant="primary" onClick={() => onMarkAttendance(entry.id, "attended")}>Present</Button>
                  <Button className="h-10 px-4" variant="secondary" onClick={() => onMarkAttendance(entry.id, "absent")}>Absent</Button>
                </div>
              </article>
            ))}
          </div>
        ) : confirmed.map((entry) => {
          const customer = customers.find((item) => item.id === entry.customerId);
          const dob = customer?.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
          const age = dob && !Number.isNaN(dob.getTime()) ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425))) : null;
          return (
            <article key={entry.id} className="rounded-lg border p-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p>{customer ? `${customer.firstName} ${customer.lastName}` : "Unknown customer"}</p>
                  <p className="text-xs text-muted-foreground">Age: {age ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Emergency: {customer?.emergencyContactName ?? "Not set"}</p>
                  <p className="text-xs text-muted-foreground">Waiver: {program?.requiresWaiver ? "Required" : "Optional"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment: {entry.paymentStatus ?? "unpaid"}</p>
                  <p className="text-xs text-muted-foreground">Notes: {entry.notes ?? "None"}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{entry.status} • {entry.status === "checked_in" || entry.status === "attended" || entry.status === "late" ? "✓ Present" : "Not checked in"}</p>
                <div className="flex flex-wrap gap-2">
                  <Button className="h-9" variant="secondary" onClick={() => onMarkAttendance(entry.id, "checked_in")}>Check In</Button>
                  <Button className="h-9" variant="secondary" onClick={() => onMarkAttendance(entry.id, "attended")}>Present</Button>
                  <Button className="h-9" variant="secondary" onClick={() => onMarkAttendance(entry.id, "late")}>Late</Button>
                  <Button className="h-9" variant="secondary" onClick={() => onMarkAttendance(entry.id, "absent")}>Absent</Button>
                  <Button className="h-9" variant="secondary" onClick={() => onMarkAttendance(entry.id, "excused")}>Excused</Button>
                  {session.waitlistEnabled ? (
                    <Button className="h-9" variant="outline" onClick={() => onMoveToWaitlist(entry.id)}>
                      Move to Waitlist
                    </Button>
                  ) : null}
                  <Button className="h-9" variant="outline" onClick={() => onCancelRegistration(entry.id)}>Remove</Button>
                </div>
              </div>
            </article>
          );
        })}
        {waitlisted.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Waitlist roster</p>
            {waitlisted.map((entry) => {
              const customer = customers.find((item) => item.id === entry.customerId);
              return (
                <article key={entry.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p>{entry.waitlistPosition ? `#${entry.waitlistPosition}` : "#—"} • {customer ? `${customer.firstName} ${customer.lastName}` : "Unknown customer"}</p>
                      <p className="text-xs text-muted-foreground">Joined {entry.registeredAt ? new Date(entry.registeredAt).toLocaleString("en-US") : "unknown"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button className="h-9" variant="secondary" onClick={() => onPromoteWaitlist(entry.id)}>Promote</Button>
                      <Button className="h-9" variant="outline" onClick={() => onCancelRegistration(entry.id)}>Remove</Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-2 rounded-lg border bg-secondary/10 p-3" aria-label="session-activity-log">
        <p className="text-sm font-medium">Registration activity</p>
        {sessionActivity.length === 0 ? <p className="text-xs text-muted-foreground">No activity yet.</p> : null}
        {sessionActivity.map((event) => (
          <div key={event.id} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{event.customerName ?? "Customer"}</span>{" "}
            {event.action.replaceAll("_", " ")} • {new Date(event.occurredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            {event.staffName ? ` • ${event.staffName}` : ""}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border bg-secondary/20 p-3 text-xs text-muted-foreground">
        Notes: {session.notes?.trim() ? session.notes : "No notes yet."}
      </div>
    </aside>
  );
}
