"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canCustomerViewReceipt } from "@/lib/portal/receipts";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { getLocationName } from "@/lib/public-programs";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
function formatDateSafe(value?: string) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date unavailable" : DATE_FORMATTER.format(parsed);
}

export default function CustomerPortalDashboardPage() {
  const {
    primaryCustomer,
    visibleCustomers,
    visibleCustomerIds,
    customerAccessRecords,
    registrations,
    waivers,
    checkInRecords,
    transactions,
    sessions,
    programs,
    accessProducts
  } = useCustomerPortalData();

  const now = new Date();
  const activeMemberships = customerAccessRecords
    .filter((entry) => visibleCustomerIds.includes(entry.customerId) && entry.type === "membership" && entry.status === "active")
    .sort((a, b) => (a.expirationDate ?? "").localeCompare(b.expirationDate ?? ""));

  const upcomingRegistrations = registrations
    .filter((entry) => visibleCustomerIds.includes(entry.customerId) && ["confirmed", "waitlisted"].includes(entry.status))
    .map((entry) => {
      const session = sessions.find((candidate) => candidate.id === entry.sessionId);
      const program = programs.find((candidate) => candidate.id === session?.programId);
      return { registration: entry, session, program };
    })
    .filter((entry) => entry.session && new Date(entry.session.startsAt) >= now)
    .sort((a, b) => (a.session?.startsAt ?? "").localeCompare(b.session?.startsAt ?? ""));

  const visibleWaivers = waivers.filter((entry) => visibleCustomerIds.includes(entry.customerId));
  const visits = checkInRecords.filter((entry) => visibleCustomerIds.includes(entry.customerId));
  const purchases = transactions.filter((entry) => canCustomerViewReceipt(entry, visibleCustomerIds));

  const householdVisitCounts = visibleCustomers
    .map((customer) => ({
      id: customer.id,
      name: customer.preferredName?.trim() || `${customer.firstName} ${customer.lastName}`,
      visitsThisMonth: visits.filter((visit) => {
        const date = new Date(visit.checkInTime);
        return visit.customerId === customer.id && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }).length
    }))
    .sort((a, b) => b.visitsThisMonth - a.visitsThisMonth);

  const maxVisits = Math.max(...householdVisitCounts.map((entry) => entry.visitsThisMonth), 1);

  const waiverStatusSummary = {
    valid: visibleWaivers.filter((entry) => entry.status === "valid").length,
    expiringSoon: visibleWaivers.filter((entry) => {
      if (!entry.expiresAt || entry.status !== "valid") return false;
      const expires = new Date(entry.expiresAt);
      const dayDiff = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return dayDiff >= 0 && dayDiff <= 30;
    }).length,
    expired: visibleWaivers.filter((entry) => entry.status === "expired").length
  };

  const recentActivity = [
    ...visits.map((visit) => ({
      id: `visit-${visit.id}`,
      happenedAt: visit.checkInTime,
      message: `Checked in at ${getLocationName(visit.locationId)}`
    })),
    ...purchases.map((purchase) => ({
      id: `purchase-${purchase.id}`,
      happenedAt: purchase.completedAt ?? now.toISOString(),
      message: `Purchased ${purchase.items.map((item) => item.productName).join(", ")}`
    })),
    ...upcomingRegistrations.map((entry) => ({
      id: `registration-${entry.registration.id}`,
      happenedAt: entry.registration.registeredAt ?? entry.session?.startsAt ?? now.toISOString(),
      message: `Registered for ${entry.program?.title ?? "program session"}`
    })),
    ...visibleWaivers
      .filter((waiver) => waiver.signedAt)
      .map((waiver) => ({
        id: `waiver-${waiver.id}`,
        happenedAt: waiver.signedAt ?? now.toISOString(),
        message: `Signed ${waiver.templateName ?? "waiver"}`
      }))
  ]
    .sort((a, b) => (b.happenedAt ?? "").localeCompare(a.happenedAt ?? ""))
    .slice(0, 8);

  const monthlyVisits = visits.filter((visit) => {
    const date = new Date(visit.checkInTime);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const previousMonthlyVisits = visits.filter((visit) => {
    const date = new Date(visit.checkInTime);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getFullYear() === prevMonth.getFullYear() && date.getMonth() === prevMonth.getMonth();
  }).length;

  const currentYearProgramsAttended = registrations.filter((entry) => {
    if (!visibleCustomerIds.includes(entry.customerId)) return false;
    if (!["attended", "completed", "checked_in"].includes(entry.status)) return false;
    const session = sessions.find((candidate) => candidate.id === entry.sessionId);
    if (!session) return false;
    return new Date(session.startsAt).getFullYear() === now.getFullYear();
  }).length;

  const monthKeys = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  const visitsByMonth = monthKeys.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const count = visits.filter((visit) => {
      const date = new Date(visit.checkInTime);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    }).length;
    return {
      key,
      label: new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" }),
      count
    };
  });
  const maxVisitsByMonth = Math.max(...visitsByMonth.map((entry) => entry.count), 1);
  const purchasesLast90Days = purchases.filter((entry) => {
    const completed = new Date(entry.completedAt);
    return completed.getTime() >= now.getTime() - 90 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <CustomerPortalContainer>
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Welcome Back{primaryCustomer ? `, ${primaryCustomer.firstName}` : ""}</h2>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Active Memberships" value={activeMemberships.length} href="./memberships" />
        <SummaryCard title="Upcoming Programs" value={upcomingRegistrations.length} href="./registrations" />
        <SummaryCard title="Waivers" value={visibleWaivers.length} href="./waivers" />
        <SummaryCard title="Household Members" value={visibleCustomerIds.length} href="./household" />
        <SummaryCard title="Visits This Month" period="Current month" unit="check-ins" value={monthlyVisits} href="./visits" />
        <SummaryCard title="Programs Attended This Year" period="Current year" unit="attended sessions" value={currentYearProgramsAttended} href="./registrations" />
        <SummaryCard title="Purchases Last 90 Days" period="Rolling 90 days" unit="transactions" value={purchasesLast90Days} href="./purchases" />
        <SummaryCard title="Outstanding Balance" period="Current balance" unit="USD" value="$0.00" href="./purchases" />
        <SummaryCard title="Waiver Alerts" period="Current status" unit="alerts" value={waiverStatusSummary.expired + waiverStatusSummary.expiringSoon} href="./waivers" />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membership Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeMemberships.length === 0 ? <p className="text-sm text-muted-foreground">No active memberships found.</p> : null}
            {activeMemberships.map((membership) => {
              const owner = visibleCustomers.find((entry) => entry.id === membership.customerId);
              const product = membership.productId ? accessProducts.find((entry) => entry.id === membership.productId) : null;
              const expiration = membership.expirationDate ? new Date(membership.expirationDate) : null;
              const dayDiff = expiration ? Math.max(0, Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
              const progress = expiration ? Math.max(5, Math.min(100, Math.round((dayDiff / 120) * 100))) : 0;
              return (
                <div key={membership.id} className="rounded-md border p-3">
                  <p className="font-medium">{product?.name ?? "Membership"}</p>
                  <p className="text-sm text-muted-foreground">{owner ? `${owner.firstName} ${owner.lastName}` : "Household member"}</p>
                  <p className="mt-1 text-sm">
                    Start {formatDateSafe(membership.startDate)} · Renewal{" "}
                    {formatDateSafe(membership.expirationDate)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Membership renews in {dayDiff} days</p>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Household Visits This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {householdVisitCounts.length === 0 ? <p className="text-sm text-muted-foreground">No household activity yet.</p> : null}
            {householdVisitCounts.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div>
                  <p className="text-sm font-medium">{entry.name}</p>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-sky-600" style={{ width: `${Math.max(6, (entry.visitsThisMonth / maxVisits) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold">{entry.visitsThisMonth} visits</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Programs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingRegistrations.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming sessions.</p> : null}
            {upcomingRegistrations.slice(0, 6).map((entry) => (
              <Link
                key={entry.registration.id}
                href="./registrations"
                className="block rounded-md border p-3 text-sm hover:bg-secondary/40"
              >
                <p className="font-medium">{entry.program?.title ?? "Program Session"}</p>
                <p className="text-muted-foreground">
                  {entry.session ? formatDateSafe(entry.session.startsAt) : "Date pending"} · {entry.session?.instructorName ?? "Instructor TBD"}
                </p>
                <p className="text-muted-foreground">{entry.session?.locationId ? getLocationName(entry.session.locationId) : "Location TBD"} · {entry.registration.status}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waiver Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <StatusPill label="Current" value={waiverStatusSummary.valid} tone="ok" />
              <StatusPill label="Expiring Soon" value={waiverStatusSummary.expiringSoon} tone="warn" />
              <StatusPill label="Expired" value={waiverStatusSummary.expired} tone="bad" />
            </div>
            {visibleWaivers.map((waiver) => (
              <div key={waiver.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{waiver.templateName ?? "General Waiver"}</p>
                <p className="text-muted-foreground">
                  {waiver.expiresAt ? `Expires ${formatDateSafe(waiver.expiresAt)}` : "No expiration"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{waiver.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visits by Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Metric: Customer check-ins · Time period: Last 12 months · Unit: visits</p>
            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Y-axis: Visit count</span>
                <span>X-axis: Month</span>
              </div>
              <div className="grid grid-cols-12 items-end gap-1">
                {visitsByMonth.map((entry) => (
                  <div key={entry.key} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">{entry.count}</span>
                    <div
                      className="w-4 rounded-sm bg-sky-600"
                      style={{ height: `${Math.max(6, Math.round((entry.count / maxVisitsByMonth) * 96))}px` }}
                      aria-label={`${entry.label} ${entry.count} visits`}
                    />
                    <span className="text-[10px] text-muted-foreground">{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm">Latest month: <strong>{monthlyVisits} visits</strong> · Prior month: <strong>{previousMonthlyVisits} visits</strong></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> : null}
            {recentActivity.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{entry.message}</p>
                <p className="text-xs text-muted-foreground">{formatDateSafe(entry.happenedAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground" href="./registrations">Register for Program</Link>
          <Link className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm" href="./waivers">Sign Waiver</Link>
          <Link className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm" href="./memberships">View Membership</Link>
          <Link className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm" href="./household">Manage Household</Link>
        </CardContent>
      </Card>
    </section>
    </CustomerPortalContainer>
  );
}

function SummaryCard({
  title,
  value,
  href,
  period,
  unit
}: {
  title: string;
  value: number | string;
  href: string;
  period?: string;
  unit?: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-sm">
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{value}</p>
          {period || unit ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {period ?? "Current period"}{unit ? ` · ${unit}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusPill({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "bad";
}) {
  const toneClass = tone === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : tone === "warn" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <div className={`rounded-md border px-2 py-2 ${toneClass}`}>
      <p className="text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
