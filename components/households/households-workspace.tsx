"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSettingsState } from "@/lib/state/settings-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatCurrency } from "@/lib/transactions";
import { buildDetailHref } from "@/lib/navigation/detail-navigation";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatHouseholdRole(role: string) {
  switch (role) {
    case "primary-adult":
      return "Primary Adult";
    case "secondary-adult":
      return "Secondary Adult";
    case "guardian":
      return "Guardian";
    case "dependent":
      return "Dependent";
    case "child":
      return "Child";
    case "emergency-contact-only":
      return "Emergency Contact";
    case "other":
      return "Other";
    default:
      return titleCase(role);
  }
}

function buildHouseholdHref(householdId: string, pathname: string, currentSearch = "") {
  return buildDetailHref({
    destination: "household",
    entityId: householdId,
    currentPathname: pathname,
    currentSearch
  });
}

export function HouseholdsWorkspace({
  initialHouseholdId,
  pathname = "/households",
  currentSearch = ""
}: {
  initialHouseholdId?: string;
  pathname?: string;
  currentSearch?: string;
}) {
  const {
    households,
    householdMembers,
    customers,
    customerAccessRecords,
    waivers,
    registrations,
    sessions,
    programs,
    checkInRecords,
    transactions,
    operationsAlerts,
    operationsTasks,
    familyCheckIn
  } = useCustomerState();
  const { settings } = useSettingsState();
  const { activeStaff } = useWorkstationState();
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(initialHouseholdId ?? households[0]?.id ?? "");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const householdRows = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return households.map((household) => {
      const members = householdMembers
        .filter((entry) => entry.householdId === household.id)
        .map((entry) => ({
          membership: entry,
          customer: customers.find((customer) => customer.id === entry.customerId)
        }))
        .filter((entry): entry is { membership: (typeof householdMembers)[number]; customer: NonNullable<typeof entry.customer> } => Boolean(entry.customer));
      const memberIds = members.map((entry) => entry.customer.id);
      const primaryContact = customers.find((entry) => entry.id === household.primaryContactCustomerId);
      const billingContact = customers.find((entry) => entry.id === household.billingCustomerId);
      const activeMemberships = customerAccessRecords.filter(
        (entry) =>
          (entry.householdId === household.id || memberIds.includes(entry.customerId)) &&
          (entry.type === "membership" || entry.type === "household-membership") &&
          entry.status === "active"
      );
      const waiverRows = members.map((member) => ({
        ...member,
        waiver: waivers.find((entry) => entry.customerId === member.customer.id)
      }));
      const missingWaivers = waiverRows.filter((entry) => entry.waiver?.status !== "valid");
      const expiringWaivers = waiverRows.filter((entry) => {
        const expiresAt = entry.waiver?.expiresAt;
        return Boolean(expiresAt && expiresAt >= todayKey && expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      });
      const expiredWaivers = waiverRows.filter((entry) => entry.waiver?.status === "expired");
      const upcomingRegistrations = registrations
        .filter((entry) => memberIds.includes(entry.customerId))
        .map((entry) => ({
          registration: entry,
          session: sessions.find((session) => session.id === entry.sessionId)
        }))
        .filter((entry) => entry.session)
        .sort((a, b) => (a.session?.startsAt ?? "").localeCompare(b.session?.startsAt ?? ""));
      const waitlists = upcomingRegistrations.filter((entry) => entry.registration.status === "waitlisted");
      const attendanceHistory = registrations.filter((entry) => memberIds.includes(entry.customerId) && ["attended", "completed", "checked_in"].includes(entry.status));
      const recentVisits = checkInRecords
        .filter((entry) => memberIds.includes(entry.customerId))
        .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
      const currentlyIn = recentVisits.filter((entry) => entry.status === "checked-in" && !entry.checkOutTime);
      const recentPurchases = transactions
        .filter(
          (entry) =>
            entry.householdId === household.id ||
            (entry.purchaserCustomerId ? memberIds.includes(entry.purchaserCustomerId) : false) ||
            memberIds.includes(entry.customerId) ||
            (entry.purchasedForCustomerIds ?? []).some((id) => memberIds.includes(id))
        )
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
      const outstandingBalance = recentPurchases
        .filter((entry) => entry.receiptStatus === "pending")
        .reduce((sum, entry) => sum + entry.total, 0);
      const paymentMethods = members.flatMap((member) =>
        (member.customer.paymentMethods ?? []).map((method) => ({
          ...method,
          customerName: `${member.customer.firstName} ${member.customer.lastName}`
        }))
      );
      const alerts = operationsAlerts.filter(
        (entry) =>
          memberIds.includes(entry.customerId ?? "") ||
          activeMemberships.some((membership) => membership.id === entry.membershipId) ||
          recentPurchases.some((purchase) => purchase.id === entry.transactionId)
      );
      const tasks = operationsTasks.filter(
        (entry) =>
          memberIds.includes(entry.customerId ?? "") ||
          activeMemberships.some((membership) => membership.id === entry.membershipId) ||
          recentPurchases.some((purchase) => purchase.id === entry.productId)
      );
      const topVisitor = members
        .map((member) => ({
          customer: member.customer,
          visits: recentVisits.filter((visit) => visit.customerId === member.customer.id && visit.checkInTime.startsWith(todayKey.slice(0, 7))).length
        }))
        .sort((a, b) => b.visits - a.visits)[0];

      return {
        household,
        members,
        memberIds,
        primaryContact,
        billingContact,
        activeMemberships,
        missingWaivers,
        expiringWaivers,
        expiredWaivers,
        upcomingRegistrations,
        waitlists,
        attendanceHistory,
        recentVisits,
        currentlyIn,
        recentPurchases,
        outstandingBalance,
        paymentMethods,
        alerts,
        tasks,
        topVisitor
      };
    });
  }, [
    checkInRecords,
    customerAccessRecords,
    customers,
    householdMembers,
    households,
    operationsAlerts,
    operationsTasks,
    registrations,
    sessions,
    transactions,
    waivers
  ]);

  const filteredHouseholds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return householdRows;
    return householdRows.filter((row) => {
      const haystack = [
        row.household.householdName,
        row.primaryContact ? `${row.primaryContact.firstName} ${row.primaryContact.lastName}` : "",
        row.billingContact ? `${row.billingContact.firstName} ${row.billingContact.lastName}` : "",
        ...row.members.map((entry) => `${entry.customer.firstName} ${entry.customer.lastName}`)
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [householdRows, query]);

  const selected = filteredHouseholds.find((row) => row.household.id === selectedHouseholdId) ?? filteredHouseholds[0];
  const householdHealthCards = selected
    ? [
        { label: "Members", value: `${selected.members.length}` },
        { label: "Active Memberships", value: `${selected.activeMemberships.length}` },
        { label: "Waivers Missing", value: `${selected.missingWaivers.length}` },
        { label: "Programs Registered", value: `${selected.upcomingRegistrations.length}` },
        { label: "Outstanding Balance", value: formatCurrency(selected.outstandingBalance) },
        { label: "Recent Visits", value: `${selected.recentVisits.length}` }
      ]
    : [];

  const actingGuardian = selected?.members.find((entry) => entry.membership.canCheckInOthers);
  const selectedCheckInIds = selectedMemberIds.length > 0 ? selectedMemberIds : selected?.members.map((entry) => entry.customer.id) ?? [];
  const topVisitingHouseholds = [...householdRows]
    .sort((a, b) => (b.topVisitor?.visits ?? 0) - (a.topVisitor?.visits ?? 0))
    .slice(0, 4);
  const upcomingRenewals = householdRows.filter((row) =>
    row.activeMemberships.some((membership) => membership.expirationDate && membership.expirationDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  );

  return (
    <section className="space-y-4" data-testid="households-workspace">
      <PageHeader
        title="Households"
        description="Manage family units, shared memberships, waivers, billing, registrations, check-ins, and communication from one operational workspace."
      />

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="household-dashboard-widgets">
        <SummaryCard label="Households Missing Waivers" value={`${householdRows.filter((row) => row.missingWaivers.length > 0).length}`} />
        <SummaryCard label="Households With Outstanding Balance" value={`${householdRows.filter((row) => row.outstandingBalance > 0).length}`} />
        <SummaryCard label="Households With Upcoming Renewals" value={`${upcomingRenewals.length}`} />
        <SummaryCard label="Top Visiting Households" value={topVisitingHouseholds[0]?.household.householdName ?? "No visit data"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card aria-label="household-list">
          <CardHeader>
            <CardTitle>Household Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SearchInput
              label="Search households"
              placeholder="Search household, member, or contact"
              value={query}
              onChange={setQuery}
            />
            <div className="space-y-2">
              {filteredHouseholds.map((row) => (
                <button
                  key={row.household.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition ${selected?.household.id === row.household.id ? "border-primary bg-primary/5" : "hover:bg-secondary/30"}`}
                  onClick={() => {
                    setSelectedHouseholdId(row.household.id);
                    setSelectedMemberIds(row.members.map((entry) => entry.customer.id));
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.household.householdName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.primaryContact ? `${row.primaryContact.firstName} ${row.primaryContact.lastName}` : "No primary contact"} · {row.members.length} members
                      </p>
                    </div>
                    <Badge tone={row.missingWaivers.length > 0 || row.outstandingBalance > 0 ? "warning" : "success"}>
                      {row.missingWaivers.length > 0 || row.outstandingBalance > 0 ? "Needs attention" : "Healthy"}
                    </Badge>
                  </div>
                </button>
              ))}
              {filteredHouseholds.length === 0 ? <p className="text-sm text-muted-foreground">No households match this search.</p> : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!selected ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Select a household to view the operational dashboard.</CardContent></Card>
          ) : (
            <>
              <Card aria-label="household-detail">
                <CardHeader>
                  <CardTitle>{selected.household.householdName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        if (!actingGuardian || !activeStaff?.id) {
                          setFeedback("Select active staff and a guardian-enabled household member to check in the household.");
                          return;
                        }
                        const result = familyCheckIn({
                          actingCustomerId: actingGuardian.customer.id,
                          memberIds: selectedCheckInIds,
                          staffUserId: activeStaff.id,
                          staffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                        });
                        setFeedback(result.message);
                      }}
                    >
                      Check In Household
                    </Button>
                    <Button variant="secondary">Register for Program</Button>
                    <Button variant="secondary">Sign Waivers</Button>
                    <Button variant="secondary">Renew Membership</Button>
                    <Button variant="secondary">Sell Access</Button>
                    <Button variant="secondary">View Receipts</Button>
                    <Button variant="secondary">Send Message</Button>
                    <Button variant="secondary">Add Member</Button>
                    <Link href={buildHouseholdHref(selected.household.id, pathname, currentSearch)}>
                      <Button variant="secondary">Open Detail Page</Button>
                    </Link>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {householdHealthCards.map((card) => (
                      <SummaryCard key={card.label} label={card.label} value={card.value} />
                    ))}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <InfoCard title="Primary Contact">
                      <p>{selected.primaryContact ? `${selected.primaryContact.firstName} ${selected.primaryContact.lastName}` : "Not assigned"}</p>
                      <p className="text-muted-foreground">{selected.primaryContact?.email ?? "No email on file"}</p>
                      <p className="text-muted-foreground">{selected.primaryContact?.phone ?? "No phone on file"}</p>
                    </InfoCard>
                    <InfoCard title="Billing">
                      <p>Billing contact: {selected.billingContact ? `${selected.billingContact.firstName} ${selected.billingContact.lastName}` : "Not assigned"}</p>
                      <p>Outstanding balance: {formatCurrency(selected.outstandingBalance)}</p>
                      <p>Upcoming renewals: {selected.activeMemberships.filter((entry) => entry.expirationDate).length}</p>
                    </InfoCard>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <SectionCard title="Household Members" ariaLabel="household-members-section">
                  <div className="space-y-3">
                    {selected.members.map((entry) => {
                      const waiver = selected.missingWaivers.find((row) => row.customer.id === entry.customer.id)?.waiver ?? waivers.find((row) => row.customerId === entry.customer.id);
                      const membership = selected.activeMemberships.find((row) => row.customerId === entry.customer.id || row.coveredCustomerIds?.includes(entry.customer.id));
                      const nextProgram = selected.upcomingRegistrations.find((row) => row.registration.customerId === entry.customer.id);
                      const nextSession = nextProgram?.session;
                      const nextProgramTitle = nextSession
                        ? (programs.find((program) => program.id === nextSession.programId)?.title ?? nextSession.title ?? "Session")
                        : null;
                      const lastVisit = selected.recentVisits.find((row) => row.customerId === entry.customer.id);
                      return (
                        <div key={entry.customer.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar customer={entry.customer} sizeClassName="h-10 w-10" />
                              <div>
                                <p className="font-medium">{entry.customer.firstName} {entry.customer.lastName}</p>
                                <p className="text-xs text-muted-foreground">{formatHouseholdRole(entry.membership.role)}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              aria-label={`Select ${entry.customer.firstName} ${entry.customer.lastName} for household check-in`}
                              checked={selectedCheckInIds.includes(entry.customer.id)}
                              onChange={(event) =>
                                setSelectedMemberIds((prev) =>
                                  event.target.checked ? [...new Set([...prev, entry.customer.id])] : prev.filter((id) => id !== entry.customer.id)
                                )
                              }
                            />
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <p>Membership: {membership ? titleCase(membership.status) : "No active membership"}</p>
                            <p>Waiver: {waiver?.status ? titleCase(waiver.status) : "Missing"}</p>
                            <p>Upcoming program: {nextSession && nextProgramTitle ? `${nextProgramTitle} · ${formatDateTime(nextSession.startsAt)}` : "None"}</p>
                            <p>Recent visit: {lastVisit ? formatDateTime(lastVisit.checkInTime) : "No visits yet"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard title="Household Memberships" ariaLabel="household-memberships-section">
                  <div className="space-y-3">
                    {selected.activeMemberships.length === 0 ? <p className="text-sm text-muted-foreground">No household memberships found.</p> : null}
                    {selected.activeMemberships.map((membership) => (
                      <div key={membership.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {membership.type === "household-membership"
                              ? "Family Membership"
                              : membership.coveredCustomerIds?.length === 2
                                ? "Couple Membership"
                                : membership.coveredCustomerIds?.length === 1
                                  ? "Parent + Child"
                                  : "Custom Household Membership"}
                          </p>
                          <Badge tone={membership.status === "active" ? "success" : membership.status === "expired" ? "danger" : "warning"}>
                            {titleCase(membership.status)}
                          </Badge>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <p>Covered members: {(membership.coveredCustomerIds ?? []).map((id) => customers.find((entry) => entry.id === id)).filter(Boolean).map((entry) => `${entry!.firstName} ${entry!.lastName}`).join(", ") || "Primary member only"}</p>
                          <p>Start date: {formatDate(membership.startDate)}</p>
                          <p>Renewal date: {formatDate(membership.expirationDate)}</p>
                          <p>Membership health: {titleCase(membership.status)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Household Waivers" ariaLabel="household-waivers-section">
                  <div className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <SummaryCard label="Current waivers" value={`${selected.members.length - selected.missingWaivers.length}`} compact />
                      <SummaryCard label="Missing waivers" value={`${selected.missingWaivers.length}`} compact />
                      <SummaryCard label="Expiring waivers" value={`${selected.expiringWaivers.length}`} compact />
                      <SummaryCard label="Expired waivers" value={`${selected.expiredWaivers.length}`} compact />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary">View Missing Waivers</Button>
                      <Button variant="secondary">Send Reminder</Button>
                      <Button variant="secondary">Request Signature</Button>
                    </div>
                    <div className="space-y-2">
                      {selected.members.map((entry) => {
                        const waiver = waivers.find((row) => row.customerId === entry.customer.id);
                        return (
                          <div key={entry.customer.id} className="rounded-lg border p-3">
                            <p className="font-medium">{entry.customer.firstName} {entry.customer.lastName}</p>
                            <p className="text-sm text-muted-foreground">
                              {waiver ? `${titleCase(waiver.status)} · ${waiver.expiresAt ? `Expires ${formatDate(waiver.expiresAt)}` : "No expiry"}` : "Missing waiver"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Household Check-In" ariaLabel="household-checkin-section">
                  <div className="space-y-3">
                    <p>Currently in facility: {selected.currentlyIn.length}</p>
                    <p>Already checked in: {selected.currentlyIn.map((entry) => entry.customerName).join(", ") || "No one currently in"}</p>
                    <p>Blocked: {selected.members.filter((entry) => !selectedCheckInIds.includes(entry.customer.id) && selected.missingWaivers.some((row) => row.customer.id === entry.customer.id)).map((entry) => `${entry.customer.firstName} ${entry.customer.lastName}`).join(", ") || "None"}</p>
                    <p>Missing waivers: {selected.missingWaivers.map((entry) => `${entry.customer.firstName} ${entry.customer.lastName}`).join(", ") || "None"}</p>
                  </div>
                </SectionCard>

                <SectionCard title="Household Registrations" ariaLabel="household-registrations-section">
                  <div className="space-y-3">
                    {selected.members.map((entry) => {
                      const rows = selected.upcomingRegistrations.filter((registration) => registration.registration.customerId === entry.customer.id);
                      return (
                        <div key={entry.customer.id} className="rounded-lg border p-3">
                          <p className="font-medium">{entry.customer.firstName} {entry.customer.lastName}</p>
                          <p className="text-xs text-muted-foreground">Upcoming sessions</p>
                          <ul className="mt-2 space-y-1 text-sm">
                            {rows.length === 0 ? <li>No current registrations.</li> : null}
                            {rows.map((row) => (
                              <li key={row.registration.id}>
                                {(programs.find((program) => program.id === row.session!.programId)?.title ?? row.session?.title ?? "Session")} · {formatDateTime(row.session!.startsAt)} · {titleCase(row.registration.status)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    <div className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">Attendance history</p>
                      <p className="text-muted-foreground">{selected.attendanceHistory.length} attended/completed registrations recorded.</p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Household Billing" ariaLabel="household-billing-section">
                  <div className="space-y-3">
                    <p>Outstanding balances: {formatCurrency(selected.outstandingBalance)}</p>
                    <p>Upcoming renewals: {selected.activeMemberships.filter((entry) => entry.expirationDate).map((entry) => formatDate(entry.expirationDate)).join(", ") || "None"}</p>
                    <p>Auto-renew settings: Placeholder</p>
                    <div className="space-y-2">
                      {selected.paymentMethods.length === 0 ? <p className="text-sm text-muted-foreground">No stored payment methods.</p> : null}
                      {selected.paymentMethods.map((method) => (
                        <div key={method.paymentMethodId} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{method.cardBrand} ending in {method.last4}</p>
                          <p className="text-muted-foreground">{method.customerName}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {selected.recentPurchases.slice(0, 5).map((purchase) => (
                        <div key={purchase.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{purchase.receiptNumber}</p>
                          <p className="text-muted-foreground">{formatDateTime(purchase.completedAt)} · {formatCurrency(purchase.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Household Communications" ariaLabel="household-communications-section">
                  <div className="space-y-3">
                    <p>Emails sent / SMS messages / notes are tracked alongside alerts and tasks.</p>
                    <div className="space-y-2">
                      {selected.alerts.slice(0, 4).map((alert) => (
                        <div key={alert.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-muted-foreground">{alert.description ?? "No alert detail"} · {formatDateTime(alert.createdAt)}</p>
                        </div>
                      ))}
                      {selected.tasks.slice(0, 4).map((task) => (
                        <div key={task.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-muted-foreground">{titleCase(task.status)} · Due {task.dueDate ? formatDate(task.dueDate) : "not set"}</p>
                        </div>
                      ))}
                      {selected.household.notes ? (
                        <div className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">Household note</p>
                          <p className="text-muted-foreground">{selected.household.notes}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Household Timeline" ariaLabel="household-timeline-section">
                  <div className="space-y-2">
                    {[
                      ...selected.recentVisits.slice(0, 4).map((visit) => ({
                        id: `visit-${visit.id}`,
                        title: `${visit.customerName} checked in`,
                        detail: `${visit.passProductUsed ?? visit.membershipPassType} · ${formatDateTime(visit.checkInTime)}`
                      })),
                      ...selected.upcomingRegistrations.slice(0, 3).map((registration) => ({
                        id: `reg-${registration.registration.id}`,
                        title: `${customers.find((customer) => customer.id === registration.registration.customerId)?.firstName ?? "Member"} registered`,
                        detail: `${programs.find((program) => program.id === registration.session!.programId)?.title ?? registration.session?.title ?? "Session"} · ${titleCase(registration.registration.status)}`
                      })),
                      ...selected.recentPurchases.slice(0, 3).map((purchase) => ({
                        id: `purchase-${purchase.id}`,
                        title: "Purchase made",
                        detail: `${purchase.receiptNumber} · ${formatCurrency(purchase.total)}`
                      })),
                      ...selected.alerts.slice(0, 2).map((alert) => ({
                        id: `alert-${alert.id}`,
                        title: alert.title,
                        detail: alert.description ?? titleCase(alert.type)
                      }))
                    ]
                      .slice(0, 10)
                      .map((entry) => (
                        <div key={entry.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{entry.title}</p>
                          <p className="text-muted-foreground">{entry.detail}</p>
                        </div>
                      ))}
                  </div>
                </SectionCard>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-md border bg-card ${compact ? "p-3" : "p-4"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`${compact ? "mt-1 text-base" : "mt-2 text-2xl"} font-semibold`}>{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
  ariaLabel
}: {
  title: string;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <Card aria-label={ariaLabel}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="mb-2 font-medium">{title}</p>
      <div className="space-y-1 text-muted-foreground">{children}</div>
    </div>
  );
}
