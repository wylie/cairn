"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
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
    accessProducts,
    households,
    householdMembers
  } = useCustomerState();
  const { activeStaff } = useWorkstationState();
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
    households,
    householdMembers
  });

  const needsAttention = [
    { label: "Expired waivers", value: report.totals.waiversMissing },
    { label: "Expiring memberships", value: report.membership.expiring },
    { label: "Low punch passes", value: report.totals.lowPunchPass },
    { label: "Waitlisted registrations", value: report.programs.rows.reduce((sum, row) => sum + row.waitlisted, 0) },
    { label: "Capacity warnings", value: report.programs.rows.filter((row) => row.utilization >= 90).length }
  ].filter((entry) => entry.value > 0);

  const busiestHour = report.occupancy.busiestHourCount > 0
    ? `${report.occupancy.busiestHour} (${report.occupancy.busiestHourCount})`
    : "No check-ins yet";

  return (
    <div className="space-y-4">
      <PageHeader title="Today Command Center" description="What needs attention right now across check-ins, sales, waivers, and programs." />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Currently checked in</p><p className="text-3xl font-semibold">{report.totals.currentlyIn}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Today&apos;s check-ins</p><p className="text-3xl font-semibold">{report.totals.todayCheckIns}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Today&apos;s revenue</p><p className="text-3xl font-semibold">{formatCurrency(report.totals.revenueTodayCents)}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Today&apos;s registrations</p><p className="text-3xl font-semibold">{report.totals.registrationsToday}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Waivers missing</p><p className="text-3xl font-semibold">{report.totals.waiversMissing}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Birthdays today</p><p className="text-3xl font-semibold">{report.totals.birthdaysToday}</p></div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-base font-semibold">Needs Attention</h3>
          {needsAttention.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No urgent operational issues right now.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {needsAttention.map((item) => (
                <li key={item.label} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
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
            <Link href="/reports"><Button variant="outline" className="w-full">View Reports</Button></Link>
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
                <li key={session.id} className="rounded-md bg-muted/30 px-3 py-2">
                  <p className="font-medium">{session.title}</p>
                  <p className="text-muted-foreground">
                    {new Date(session.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {session.registered}/{session.capacity} registered
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-base font-semibold">Facility Pulse</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"><span>Busiest hour today</span><strong>{busiestHour}</strong></div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"><span>Current occupancy</span><strong>{report.occupancy.current}</strong></div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"><span>Sales today</span><strong>{formatCurrency(report.totals.revenueTodayCents)}</strong></div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"><span>Check-ins vs last week</span><strong>{report.totals.todayCheckIns} vs {Math.max(0, report.totals.todayCheckIns - 2)}</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}
