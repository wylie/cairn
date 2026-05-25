import { useMemo, useState } from "react";
import type { ClassCampSession, Customer, HouseholdMember, Program, Registration } from "@/types/domain";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { Button } from "@/components/ui/button";
import { filterCustomers } from "@/lib/data/customer-search";

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
  onCancelSession,
  onDuplicateSession,
  onTakeAttendance,
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
  onCancelSession: () => void;
  onDuplicateSession: () => void;
  onTakeAttendance: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [householdSelection, setHouseholdSelection] = useState<string[]>([]);
  const filteredCustomers = useMemo(() => (query.trim() ? filterCustomers(customers, query).slice(0, 8) : []), [query, customers]);
  const sessionRegistrations = registrations.filter((entry) => entry.sessionId === session.id && entry.status !== "cancelled");
  const activeCandidate = filteredCustomers[0];
  const householdGroup = useMemo(() => {
    if (!activeCandidate) return [] as Customer[];
    const membership = householdMembers.find((entry) => entry.customerId === activeCandidate.id);
    if (!membership) return [];
    return householdMembers
      .filter((entry) => entry.householdId === membership.householdId && entry.customerId !== activeCandidate.id)
      .map((entry) => customers.find((customer) => customer.id === entry.customerId))
      .filter((entry): entry is Customer => Boolean(entry));
  }, [activeCandidate, customers, householdMembers]);
  const candidateEligibility = activeCandidate ? getEligibility(activeCandidate.id) : null;
  const confirmed = sessionRegistrations.filter((entry) => entry.status === "confirmed" || entry.status === "attended" || entry.status === "absent");
  const waitlisted = sessionRegistrations
    .filter((entry) => entry.status === "waitlisted")
    .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));

  return (
    <aside className="rounded-xl border bg-card p-4" aria-label="session-detail-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{session.title ?? program?.title ?? "Session"}</h3>
          <p className="text-sm text-muted-foreground">{program?.title ?? "Unknown Program"}</p>
          <p className="text-sm text-muted-foreground">{new Date(session.startsAt).toLocaleString("en-US")}</p>
          <p className="text-sm text-muted-foreground">Instructor: {session.instructorName ?? "Unassigned"}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button className="h-9" variant="secondary" onClick={onEditSession}>Edit Session</Button>
        <Button className="h-9" variant="secondary" onClick={onDuplicateSession}>Duplicate Session</Button>
        <Button className="h-9" variant="secondary" onClick={onTakeAttendance}>Take Attendance</Button>
        <Button className="h-9" variant="destructiveSubtle" onClick={onCancelSession}>Cancel Session</Button>
        <Button className="h-9" variant="ghost" disabled>Message Participants</Button>
      </div>

      <div className="mt-3 space-y-2">
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
        {activeCandidate && candidateEligibility ? (
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{activeCandidate.firstName} {activeCandidate.lastName}</p>
            <p className={`text-xs ${candidateEligibility.state === "blocked" ? "text-rose-700" : candidateEligibility.state === "warning" ? "text-amber-800" : "text-emerald-700"}`}>
              {candidateEligibility.state === "ready" ? "READY" : candidateEligibility.state === "warning" ? "WARNING" : "BLOCKED"}
            </p>
            {candidateEligibility.reasons.map((reason) => (
              <p key={reason} className="text-xs text-muted-foreground">{reason}</p>
            ))}
            {candidateEligibility.guardianName ? <p className="text-xs text-muted-foreground">Guardian: {candidateEligibility.guardianName}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button className="h-9" onClick={() => onRegister(activeCandidate.id)} disabled={candidateEligibility.state === "blocked"}>Register</Button>
              <Button className="h-9" variant="secondary" onClick={() => onSellAccess(activeCandidate.id)}>Sell Access</Button>
              <Button className="h-9" variant="secondary" onClick={() => onMarkWaiverSigned(activeCandidate.id)}>Mark Waiver Signed</Button>
            </div>
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
        <p className="text-sm font-medium">Registrations</p>
        {confirmed.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button className="h-9" variant="secondary" onClick={() => confirmed.forEach((entry) => onMarkAttendance(entry.id, "attended"))}>Mark all present</Button>
            <Button className="h-9" variant="secondary" onClick={() => confirmed.filter((entry) => entry.status !== "attended" && entry.status !== "checked_in").forEach((entry) => onMarkAttendance(entry.id, "absent"))}>Mark remaining absent</Button>
          </div>
        ) : null}
        {confirmed.length === 0 ? <p className="text-sm text-muted-foreground">No registrations yet.</p> : null}
        {confirmed.map((entry) => {
          const customer = customers.find((item) => item.id === entry.customerId);
          const dob = customer?.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
          const age = dob && !Number.isNaN(dob.getTime())
            ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
            : null;
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
                <p className="text-xs text-muted-foreground">{entry.status}</p>
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
                  <Button className="h-9" variant="outline" onClick={() => onCancelRegistration(entry.id)}>Cancel</Button>
                </div>
              </div>
            </article>
          );
        })}
        {waitlisted.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Waitlist</p>
            {waitlisted.map((entry) => {
              const customer = customers.find((item) => item.id === entry.customerId);
              return (
                <article key={entry.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p>{customer ? `${customer.firstName} ${customer.lastName}` : "Unknown customer"} • Waitlist #{entry.waitlistPosition ?? "—"}</p>
                    <Button className="h-9" variant="secondary" onClick={() => onPromoteWaitlist(entry.id)}>Promote to Registered</Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border bg-secondary/20 p-3 text-xs text-muted-foreground">
        Notes: {session.notes?.trim() ? session.notes : "No notes yet."}
      </div>
    </aside>
  );
}
