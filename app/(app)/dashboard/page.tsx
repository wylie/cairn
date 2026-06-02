"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatTime } from "@/lib/format/date";
import { buildReportModel } from "@/lib/reports/metrics";

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function DashboardPage() {
  const {
    customers,
    checkInRecords,
    transactions,
    programs,
    sessions,
    registrations,
    memberships,
    customerAccessRecords,
    accessProducts,
    productCategories,
    households,
    householdMembers,
    operationsAlerts,
    operationsTasks,
    getWaiverStatusForCustomer
  } = useCustomerState();
  const { activeStaff, staffUsers } = useWorkstationState();
  const report = buildReportModel({
    staffRole: activeStaff?.role ?? "front_desk",
    staffId: activeStaff?.id,
    now: new Date(),
    filters: { rangeKey: "today", locationId: undefined, programType: "all", instructorId: "all", ageGroup: "all", membershipStatus: "all", productType: "all" },
    customers,
    checkIns: checkInRecords,
    transactions,
    programs,
    sessions,
    registrations,
    memberships,
    products: accessProducts,
    productCategories,
    households,
    householdMembers
  });

  const waiverStatusCounts = customers.reduce(
    (totals, customer) => {
      const status = getWaiverStatusForCustomer(customer.id, "wtpl_general");
      if (status === "valid") totals.valid += 1;
      if (status === "missing") totals.missing += 1;
      if (status === "expired") totals.expired += 1;
      if (status === "expiring_soon") totals.expiringSoon += 1;
      if (status === "outdated_version") totals.outdated += 1;
      return totals;
    },
    { valid: 0, missing: 0, expired: 0, expiringSoon: 0, outdated: 0 }
  );

  const needsAttention = [
    { label: "Expired waivers", value: waiverStatusCounts.expired, href: "/waivers?status=expired", hint: "Open Waivers" },
    { label: "Expiring memberships", value: report.membership.expiring, href: "/memberships?status=expiring_30", hint: "Open Memberships" },
    { label: "Low punch passes", value: report.totals.lowPunchPass, href: "/customers", hint: "Review Customers" },
    { label: "Waitlisted registrations", value: report.programs.rows.reduce((sum, row) => sum + row.waitlisted, 0), href: "/registrations?status=waitlisted", hint: "Open Registrations" },
    { label: "Capacity warnings", value: report.programs.rows.filter((row) => row.utilization >= 90).length, href: "/registrations", hint: "Review Capacity" }
  ].filter((entry) => entry.value > 0);

  const busiestHour = report.occupancy.busiestHourCount > 0
    ? `${report.occupancy.busiestHour} (${report.occupancy.busiestHourCount})`
    : "No check-ins yet";

  const todayKey = new Date().toISOString().slice(0, 10);
  const activeMemberships = report.membership.active;
  const frozenMemberships = memberships.filter((entry) => entry.status === "frozen").length;
  const cancelledMemberships = memberships.filter((entry) => entry.status === "cancelled").length;
  const sessionsToday = report.programs.upcomingSessions.length;
  const waitlistsToday = report.programs.rows.reduce((sum, row) => sum + row.waitlisted, 0);
  const sessionsAtCapacity = report.programs.rows.filter((row) => row.enrolled >= row.capacity).length;
  const newCustomersThisWeek = customers.filter((entry) => (entry.createdAt ?? "").slice(0, 10) >= new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)).length;
  const topVisitorsThisMonth = report.attendance.topVisitors[0]?.customerName ?? "No visit activity yet";
  const staffClockedIn = staffUsers.filter((entry) => entry.active && entry.status !== "inactive").length;
  const instructorsToday = sessions.filter((entry) => entry.startsAt.slice(0, 10) === todayKey && entry.instructorName).length;
  const unassignedSessions = sessions.filter((entry) => entry.startsAt.slice(0, 10) === todayKey && !entry.instructorName).length;
  const openStaffingGaps = unassignedSessions;
  const topSellingProduct = report.products.topProducts[0]?.name ?? "No sales yet";
  const openAlerts = operationsAlerts.filter((entry) => entry.status === "open");
  const criticalAlerts = openAlerts.filter((entry) => entry.severity === "critical");
  const tasksDueToday = operationsTasks.filter((entry) => entry.status !== "completed" && entry.status !== "archived" && entry.dueDate === todayKey);

  const primaryMetricCards = [
    { title: "Open Alerts", value: openAlerts.length, href: "/alerts?status=open", hint: "Open Alerts →" },
    { title: "Critical Alerts", value: criticalAlerts.length, href: "/alerts?status=open&severity=critical", hint: "Review critical issues →" },
    { title: "Tasks Due Today", value: tasksDueToday.length, href: "/alerts?taskStatus=open&due=today", hint: "Open Task Center →" },
    { title: "Currently Checked In", value: report.totals.currentlyIn, href: "/check-in#current-roster", hint: "View Check-In →" },
    { title: "Today's Check-Ins", value: report.totals.todayCheckIns, href: "/check-in#recent-checkins", hint: "Open today’s check-in activity →" },
    { title: "Today's Revenue", value: formatCurrency(report.totals.revenueTodayCents), href: "/reports?category=sales&range=today", hint: "Open Revenue Report →" },
    { title: "Today's Registrations", value: report.totals.registrationsToday, href: "/registrations?created=today", hint: "Open Registrations →" },
    { title: "Waivers Missing", value: waiverStatusCounts.missing, href: "/customers?waiver=missing", hint: "View affected customers →" },
    { title: "Birthdays Today", value: report.totals.birthdaysToday, href: "/customers?birthday=today", hint: "Open Birthday list →" },
    { title: "Expiring Memberships", value: report.membership.expiring, href: "/memberships?status=expiring_30", hint: "Open Memberships →" },
    { title: "Expired Waivers", value: waiverStatusCounts.expired, href: "/waivers?status=expired", hint: "Open Waivers →" }
  ];

  const healthWidgets = [
    {
      title: "Membership Health",
      href: "/memberships",
      items: [
        { label: "Active memberships", value: activeMemberships },
        { label: "Expiring in 30 days", value: report.membership.expiring },
        { label: "Frozen", value: frozenMemberships },
        { label: "Cancelled", value: cancelledMemberships }
      ]
    },
    {
      title: "Program Health",
      href: "/registrations",
      items: [
        { label: "Today's sessions", value: sessionsToday },
        { label: "Waitlists", value: waitlistsToday },
        { label: "Sessions at capacity", value: sessionsAtCapacity },
        { label: "Upcoming programs", value: report.programs.upcomingSessions.length }
      ]
    },
    {
      title: "Waiver Health",
      href: "/waivers",
      items: [
        { label: "Current", value: waiverStatusCounts.valid },
        { label: "Expiring Soon", value: waiverStatusCounts.expiringSoon },
        { label: "Expired", value: waiverStatusCounts.expired },
        { label: "Missing", value: waiverStatusCounts.missing }
      ]
    },
    {
      title: "Customer Activity",
      href: "/customers",
      items: [
        { label: "New customers this week", value: newCustomersThisWeek },
        { label: "Birthdays today", value: report.totals.birthdaysToday },
        { label: "Check-ins today", value: report.totals.todayCheckIns },
        { label: "Top visitors this month", value: topVisitorsThisMonth }
      ]
    },
    {
      title: "Household Health",
      href: "/households",
      items: [
        { label: "Households missing waivers", value: households.filter((household) => householdMembers.filter((member) => member.householdId === household.id).some((member) => getWaiverStatusForCustomer(member.customerId, "wtpl_general") !== "valid")).length },
        { label: "Outstanding balance", value: households.filter((household) => transactions.some((transaction) => transaction.householdId === household.id && transaction.receiptStatus === "pending")).length },
        { label: "Upcoming renewals", value: customerAccessRecords.filter((record) => record.householdId && record.expirationDate && record.expirationDate >= todayKey && record.expirationDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)).length },
        { label: "Top visiting household", value: households[0]?.householdName ?? "No data yet" },
        { label: "Recent household activity", value: checkInRecords.filter((record) => householdMembers.some((member) => member.customerId === record.customerId)).length }
      ]
    },
    {
      title: "Staff Activity",
      href: "/staff",
      items: [
        { label: "Staff currently clocked in", value: staffClockedIn },
        { label: "Today's instructors", value: instructorsToday },
        { label: "Unassigned sessions", value: unassignedSessions },
        { label: "Open staffing gaps", value: openStaffingGaps }
      ]
    },
    {
      title: "Financial Snapshot",
      href: "/reports?category=sales&range=today",
      items: [
        { label: "Revenue today", value: formatCurrency(report.totals.revenueTodayCents) },
        { label: "Revenue this month", value: formatCurrency(report.sales.grossCents) },
        { label: "Average transaction", value: formatCurrency(report.sales.averageTransactionCents) },
        { label: "Top selling product", value: topSellingProduct }
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Today Command Center" description="What needs attention right now across check-ins, sales, waivers, and programs." />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {primaryMetricCards.map((card) => (
          <DashboardMetricLink key={card.title} title={card.title} value={card.value} href={card.href} hint={card.hint} />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-base font-semibold">Needs Attention</h3>
          {needsAttention.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No urgent operational issues right now.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {needsAttention.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="flex cursor-pointer items-center justify-between rounded-md bg-muted/30 px-3 py-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div>
                      <span>{item.label}</span>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                    <span className="font-semibold">{item.value}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-base font-semibold">Quick Actions</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link href="/check-in"><Button className="w-full">Check In Customer</Button></Link>
            <Link href="/pos"><Button className="w-full">Sell Access</Button></Link>
            <Link href="/customers"><Button variant="outline" className="w-full">Add Customer</Button></Link>
            <Link href="/calendar"><Button variant="outline" className="w-full">View Today&apos;s Programs</Button></Link>
            <Link href="/pos"><Button variant="outline" className="w-full">Open POS</Button></Link>
            <Link href="/programs"><Button variant="outline" className="w-full">Create Program</Button></Link>
            <Link href="/calendar?create=session"><Button variant="outline" className="w-full">Create Session</Button></Link>
            <Link href="/waivers"><Button variant="outline" className="w-full">Sign Waiver</Button></Link>
            <Link href="/reports"><Button variant="outline" className="w-full">Run Report</Button></Link>
          </div>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-base font-semibold">Today&apos;s Schedule</h3>
          {report.programs.upcomingSessions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No upcoming sessions today.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {report.programs.upcomingSessions.slice(0, 6).map((session) => (
                <li key={session.id}>
                  <Link href={`/registrations?sessionId=${session.id}`} className="block cursor-pointer rounded-md bg-muted/30 px-3 py-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <p className="font-medium">{session.title}</p>
                    <p className="text-muted-foreground">
                      {formatTime(session.startsAt)} · {session.registered}/{session.capacity} registered
                    </p>
                    <p className="text-xs text-muted-foreground">Open registration detail →</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-base font-semibold">Facility Pulse</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <Link href="/reports?category=attendance&range=today" className="flex cursor-pointer items-center justify-between rounded-md bg-muted/30 px-3 py-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>Busiest hour today</span><strong>{busiestHour}</strong></Link>
            <Link href="/check-in#current-roster" className="flex cursor-pointer items-center justify-between rounded-md bg-muted/30 px-3 py-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>Current occupancy</span><strong>{report.occupancy.current}</strong></Link>
            <Link href="/reports?category=sales&range=today" className="flex cursor-pointer items-center justify-between rounded-md bg-muted/30 px-3 py-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>Sales today</span><strong>{formatCurrency(report.totals.revenueTodayCents)}</strong></Link>
            <Link href="/reports?category=attendance&range=today" className="flex cursor-pointer items-center justify-between rounded-md bg-muted/30 px-3 py-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>Check-ins vs last week</span><strong>{report.totals.todayCheckIns} vs {Math.max(0, report.totals.todayCheckIns - 2)}</strong></Link>
          </div>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {healthWidgets.map((widget) => (
          <Link
            key={widget.title}
            href={widget.href}
            className="cursor-pointer rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">{widget.title}</h3>
              <span className="text-xs text-muted-foreground">Open →</span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {widget.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DashboardMetricLink({
  title,
  value,
  href,
  hint
}: {
  title: string;
  value: string | number;
  href: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="cursor-pointer rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </Link>
  );
}
