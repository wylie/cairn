"use client";

import { CustomerBadges } from "@/components/customers/customer-badges";
import { ActivityTimeline } from "@/components/customers/activity-timeline";
import { CustomerDetailActions } from "@/components/customers/customer-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { data } from "@/lib/data";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatCurrency } from "@/lib/transactions";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const {
    customers,
    memberships,
    punchPasses,
    checkInRecords,
    transactions,
    registrations,
    sessions,
    programs,
    customerAccessRecords,
    addCustomerAccessRecord,
    updateCustomerAccessRecord
  } = useCustomerState();
  const { activeStaff } = useWorkstationState();
  const customer = customers.find((entry) => entry.id === customerId);

  if (!customer) {
    return <p className="text-sm text-muted-foreground">Customer not found.</p>;
  }

  const membership = customer.membershipId ? memberships.find((entry) => entry.id === customer.membershipId) : undefined;
  const waiver = customer.waiverId ? data.waivers.find((entry) => entry.id === customer.waiverId) : undefined;
  const pass = customer.punchPassId ? punchPasses.find((entry) => entry.id === customer.punchPassId) : undefined;
  const recentCheckIns = checkInRecords
    .filter((entry) => entry.customerId === customer.id)
    .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))
    .slice(0, 6);
  const recentPurchases = transactions
    .filter((entry) => entry.customerId === customer.id)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 6);
  const customerSessionHistory = registrations
    .filter((entry) => entry.customerId === customer.id)
    .map((entry) => {
      const session = sessions.find((item) => item.id === entry.sessionId);
      const program = session ? programs.find((item) => item.id === session.programId) : undefined;
      return { registration: entry, session, program };
    })
    .filter((entry) => entry.session)
    .sort((a, b) => (b.session?.startsAt ?? "").localeCompare(a.session?.startsAt ?? ""));
  const accessRecords = customerAccessRecords
    .filter((entry) => entry.customerId === customer.id)
    .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  const upcomingSessions = customerSessionHistory.filter((entry) => {
    const startsAt = entry.session?.startsAt ?? "";
    return startsAt >= "2026-05-22" && (entry.session?.status ?? "scheduled") !== "cancelled";
  });
  const pastSessions = customerSessionHistory.filter((entry) => {
    const startsAt = entry.session?.startsAt ?? "";
    return startsAt < "2026-05-22" || (entry.session?.status ?? "scheduled") === "cancelled";
  });

  return (
    <div className="space-y-4">
      <Card aria-label="detail-header">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-secondary text-sm font-semibold text-muted-foreground">
                {customer.firstName[0]}{customer.lastName[0]}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{customer.firstName} {customer.lastName}</h2>
                <p className="text-sm text-muted-foreground">{customer.memberId}</p>
              </div>
            </div>
            <CustomerDetailActions customerId={customer.id} />
          </div>
          <div className="mt-3">
            <CustomerBadges customer={customer} membership={membership} punchPass={pass} waiver={waiver} />
          </div>
        </CardContent>
      </Card>

      <Card aria-label="detail-membership">
        <CardHeader><CardTitle>Membership</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Plan/Pass: {membership?.planName ?? pass?.title ?? customer.dayPassProductName ?? "None"}</p>
          <p>Expiration: {membership?.renewalDate ?? pass?.expiresAt ?? "N/A"}</p>
          <p>Remaining Punches: {typeof pass?.remainingUses === "number" ? `${pass.remainingUses} of ${pass.originalUses}` : "N/A"}</p>
        </CardContent>
      </Card>

      <Card aria-label="detail-access">
        <CardHeader><CardTitle>Access</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {accessRecords.length === 0 ? <p className="text-muted-foreground">No access records.</p> : null}
          {accessRecords.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3">
              <p className="font-medium">{entry.notes ?? entry.type}</p>
              <p className="text-muted-foreground">Status: {entry.status}</p>
              <p className="text-muted-foreground">Expiration: {entry.expirationDate ?? "N/A"}</p>
              <p className="text-muted-foreground">Punches: {typeof entry.remainingPunches === "number" ? entry.remainingPunches : "N/A"}</p>
              <p className="text-muted-foreground">Locations: {entry.locationsAllowed?.join(", ") ?? "All"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button className="h-9" variant="outline" onClick={() => updateCustomerAccessRecord(entry.id, { status: "paused" })}>Pause</Button>
                <Button className="h-9" variant="outline" onClick={() => updateCustomerAccessRecord(entry.id, { status: "cancelled" })}>Cancel</Button>
                <Button className="h-9" variant="outline" onClick={() => updateCustomerAccessRecord(entry.id, { expirationDate: "2026-07-20" })}>Extend</Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-9"
              variant="outline"
              onClick={() =>
                addCustomerAccessRecord({
                  customerId: customer.id,
                  type: "comp",
                  status: "active",
                  startDate: "2026-05-20",
                  expirationDate: "2026-05-20",
                  locationsAllowed: [customer.locationId],
                  notes: "Staff comp access",
                  grantedByStaffId: activeStaff?.id,
                  grantedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                })
              }
            >
              Add comp access
            </Button>
            <Button
              className="h-9"
              variant="outline"
              onClick={() =>
                addCustomerAccessRecord({
                  customerId: customer.id,
                  type: "punch-pass",
                  status: "active",
                  startDate: "2026-05-20",
                  expirationDate: "2026-06-20",
                  remainingPunches: 10,
                  locationsAllowed: [customer.locationId],
                  notes: "10 Visit Pass",
                  grantedByStaffId: activeStaff?.id,
                  grantedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                })
              }
            >
              Add punch pass
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card aria-label="detail-waivers">
        <CardHeader><CardTitle>Waivers</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{waiver?.status === "signed" ? "Signed" : "Waiver Missing"}</p>
          <p>Expiration: {waiver?.expiresAt ?? "N/A"}</p>
        </CardContent>
      </Card>

      <Card aria-label="detail-activity">
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ActivityTimeline visits={recentCheckIns} />
          {accessRecords.slice(0, 4).map((entry) => (
            <p key={`timeline-${entry.id}`} className="text-xs text-muted-foreground">
              Access {entry.status} • {entry.notes ?? entry.type} • starts {entry.startDate}
            </p>
          ))}
          {recentPurchases.length > 0 ? (
            <div className="space-y-1 rounded-lg border bg-secondary/20 p-3">
              <p className="font-medium">Recent Purchases</p>
              {recentPurchases.slice(0, 3).map((entry) => (
              <p key={entry.id} className="text-xs text-muted-foreground">
                  Purchase • {new Date(entry.completedAt).toLocaleDateString()} • {(entry.items ?? []).map((item) => item.productName ?? "Unknown item").join(", ") || "Unknown item"} • {formatCurrency(entry.total)}
              </p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card aria-label="detail-purchases">
        <CardHeader><CardTitle>Purchase History</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentPurchases.length === 0 ? (
            <p className="text-muted-foreground">No purchases recorded yet.</p>
          ) : (
            recentPurchases.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3">
                <p className="font-medium">{new Date(entry.completedAt).toLocaleDateString()}</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {(entry.items ?? []).map((item, index) => (
                    <li key={`${entry.id}-${item.productId}-${index}`}>
                      {(item.productName ?? "Unknown item")} x{item.quantity ?? 1} — {formatCurrency(item.unitPrice)} ({formatCurrency(item.lineTotal)})
                    </li>
                  ))}
                  {(entry.items ?? []).length === 0 ? <li>Unknown item</li> : null}
                </ul>
                <p>Total: {formatCurrency(entry.total)}</p>
                <p className="text-muted-foreground">Sold by {entry.soldByStaffName ?? "Staff not recorded"}</p>
                <p className="text-muted-foreground">Receipt #{entry.receiptNumber}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card aria-label="detail-sessions">
        <CardHeader><CardTitle>Session History</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Upcoming Sessions</p>
            {upcomingSessions.length === 0 ? <p className="text-muted-foreground">No upcoming sessions.</p> : null}
            {upcomingSessions.slice(0, 4).map((entry) => (
              <p key={entry.registration.id} className="text-muted-foreground">
                {entry.session?.title ?? entry.program?.title ?? "Session"} • {new Date(entry.session?.startsAt ?? "").toLocaleString("en-US")} • {entry.registration.status}
              </p>
            ))}
          </div>
          <div>
            <p className="font-medium">Past Sessions</p>
            {pastSessions.length === 0 ? <p className="text-muted-foreground">No past sessions.</p> : null}
            {pastSessions.slice(0, 4).map((entry) => (
              <p key={entry.registration.id} className="text-muted-foreground">
                {entry.session?.title ?? entry.program?.title ?? "Session"} • {new Date(entry.session?.startsAt ?? "").toLocaleString("en-US")} • {(entry.session?.status ?? entry.registration.status)}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card aria-label="detail-notes">
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{customer.notes ?? "No internal notes yet."}</p></CardContent>
      </Card>

      <Card aria-label="detail-billing">
        <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Stripe-ready placeholder. Billing timeline and invoices will appear here.</p></CardContent>
      </Card>
    </div>
  );
}
