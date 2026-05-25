"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/staff/permission-gate";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { buildReportModel, getEmptyReportModel, type ReportFilters } from "@/lib/reports/metrics";
import { ReportFiltersBar } from "@/components/reports/report-filters";
import { AlertCard, ListCard, MetricCard, StatusCard } from "@/components/reports/dashboard-cards";
import { BarBreakdownCard, TrendLineCard } from "@/components/reports/charts";

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function downloadCsv(filename: string, rows: Array<Record<string, string>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function ReportsPage() {
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
  const { activeStaff, hasPermission, staffUsers } = useWorkstationState();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ReportFilters>({
    rangeKey: "today",
    locationId: undefined,
    programType: "all",
    instructorId: "all",
    ageGroup: "all",
    membershipStatus: "all",
    productType: "all"
  });

  const { report, reportError } = useMemo(() => {
    try {
      return {
        report: buildReportModel({
          staffRole: activeStaff?.role ?? "front_desk",
          staffId: activeStaff?.id,
          now: new Date(),
          filters,
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
        }),
        reportError: null as string | null
      };
    } catch {
      return {
        report: getEmptyReportModel(),
        reportError: "Some older local mock data could not be parsed. Reports are showing a safe fallback."
      };
    }
  }, [activeStaff?.id, activeStaff?.role, filters, customers, checkInRecords, transactions, programs, sessions, registrations, memberships, accessProducts, households, householdMembers]);

  const trendData = useMemo(() => {
    if (!search.trim()) return report.trends.daily;
    const q = search.toLowerCase();
    return report.trends.daily.filter((entry) => entry.label.toLowerCase().includes(q));
  }, [report.trends.daily, search]);

  const topProducts = useMemo(() => {
    if (!search.trim()) return report.products.topProducts;
    const q = search.toLowerCase();
    return report.products.topProducts.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [report.products.topProducts, search]);

  const staffOperationalRows = useMemo(() => {
    if (!(activeStaff?.role === "manager" || activeStaff?.role === "owner")) return [];
    const rows = staffUsers.map((staff) => {
      const checkInsCompleted = checkInRecords.filter(
        (entry) => entry.checkedInByStaffId === staff.id || entry.checkedOutByStaffId === staff.id
      ).length;
      const sales = transactions.filter((entry) => entry.soldByStaffId === staff.id);
      const refunds = sales.filter((entry) => entry.transactionType === "return").length;
      const attendanceMarked = registrations.filter((entry) => entry.updatedByStaffId === staff.id).length;
      const registrationsProcessed = registrations.filter((entry) => entry.updatedByStaffId === staff.id).length;
      return {
        id: staff.id,
        primary: `${staff.firstName} ${staff.lastName}`,
        secondary: `${checkInsCompleted} check-ins • ${sales.length} sales • ${refunds} refunds • ${attendanceMarked} attendance • ${registrationsProcessed} registrations`
      };
    });
    return rows.sort((a, b) => b.secondary.localeCompare(a.secondary)).slice(0, 8);
  }, [activeStaff?.role, checkInRecords, registrations, staffUsers, transactions]);

  const showFinancial = hasPermission("viewFinancialReports") || activeStaff?.role === "owner";
  const showManagerMetrics = hasPermission("viewReports") && (activeStaff?.role === "manager" || activeStaff?.role === "owner");
  const isFrontDesk = activeStaff?.role === "front_desk";
  const isInstructor = activeStaff?.role === "instructor";

  const sparkline = report.trends.daily.slice(-7).map((entry) => ({ value: entry.checkIns }));

  return (
    <PermissionGate permission="viewReports">
      <section className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Reports</h2>
            <p className="text-sm text-muted-foreground">Actionable operational reporting for staff, managers, and owners.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                "cairn-sales-export.csv",
                report.csvRows.map((row) => ({
                  receipt: row.receipt,
                  date: row.date,
                  customer: row.customer,
                  staff: row.staff,
                  total: row.total,
                  items: row.items
                }))
              )
            }
          >
            Export CSV
          </Button>
        </header>
        {reportError ? <AlertCard title="Report Data Warning" message={reportError} tone="warning" /> : null}

        <ReportFiltersBar
          filters={filters}
          onChange={setFilters}
          locations={[
            { id: "loc_001", name: "Summit Downtown" },
            { id: "loc_002", name: "Summit Uptown" }
          ]}
          instructors={staffUsers.filter((entry) => entry.role === "instructor" || entry.canTeach)}
          programTypes={Array.from(new Set(programs.map((entry) => entry.programType).filter(Boolean)))}
          search={search}
          onSearchChange={setSearch}
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Currently Checked In" value={report.totals.currentlyIn} sparkline={sparkline} />
          <MetricCard title="Today's Check-Ins" value={report.totals.todayCheckIns} changeLabel={`${report.totals.uniqueVisitors} unique visitors`} sparkline={sparkline} />
          <MetricCard title="Waivers Missing" value={report.totals.waiversMissing} />
          <MetricCard title="Today's Registrations" value={report.totals.registrationsToday} />
        </div>
        {isFrontDesk ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <ListCard
              title="Upcoming Programs"
              emptyText="No upcoming programs."
              items={report.programs.upcomingSessions.map((session) => ({
                id: session.id,
                primary: session.title,
                secondary: `${new Date(session.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${session.registered}/${session.capacity} registered`
              }))}
            />
            <ListCard
              title="Birthdays Today"
              emptyText="No birthdays today."
              items={customers
                .filter((entry) => {
                  if (!entry.dateOfBirth) return false;
                  const dob = new Date(`${entry.dateOfBirth}T00:00:00`);
                  const now = new Date();
                  return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
                })
                .map((entry) => ({
                  id: entry.id,
                  primary: `${entry.firstName} ${entry.lastName}`,
                  secondary: entry.memberId
                }))}
            />
          </div>
        ) : null}

        {(showManagerMetrics || isInstructor) && (
          <div className="grid gap-3 lg:grid-cols-2">
            <TrendLineCard
              title="Attendance Trend"
              data={trendData}
              lines={[{ key: "checkIns", color: "hsl(var(--primary))", name: "Check-ins" }]}
            />
            <BarBreakdownCard
              title="Busiest Hours"
              data={report.trends.byHour.map((entry) => ({ label: entry.label, checkIns: entry.count }))}
              bars={[{ key: "checkIns", color: "#0284c7", name: "Check-ins" }]}
            />
          </div>
        )}

        {showManagerMetrics && !isInstructor ? (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              <BarBreakdownCard
                title="Product Sales"
                data={topProducts.map((entry) => ({ label: entry.name, quantity: entry.quantity, revenue: entry.revenue }))}
                bars={[
                  { key: "quantity", color: "#0ea5e9", name: "Quantity" },
                  { key: "revenue", color: "#16a34a", name: "Revenue ($)" }
                ]}
              />
              <BarBreakdownCard
                title="Youth vs Adult Attendance"
                data={[{ label: "Attendance", youth: report.trends.youthAdult[1].value, adults: report.trends.youthAdult[0].value }]}
                bars={[
                  { key: "youth", color: "#f59e0b", name: "Youth", stackId: "attendance" },
                  { key: "adults", color: "#2563eb", name: "Adults", stackId: "attendance" }
                ]}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard title="Memberships Active" value={`${report.membership.active}`} />
              <StatusCard title="Expiring Memberships" value={`${report.membership.expiring}`} />
              <StatusCard title="Households" value={`${report.households.total} total · avg ${report.households.averageSize}`} />
              <StatusCard title="Comps / Discounts" value={`${report.products.compTxCount} comps · ${report.products.discountsUsed} discounted`} />
            </div>

            <ListCard
              title="Program Performance"
              emptyText="No program performance data available."
              items={report.programs.rows.slice(0, 6).map((row) => ({
                id: row.id,
                primary: row.name,
                secondary: `${row.enrolled}/${row.capacity || 0} enrolled · waitlist ${row.waitlisted} · ${row.utilization}% utilization`
              }))}
            />
            <ListCard
              title="Staff Operational Metrics"
              emptyText="No staff activity yet."
              items={staffOperationalRows}
            />
          </>
        ) : null}

        {showFinancial && !isInstructor ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Revenue (Range)" value={formatCurrency(report.financial.revenueCents)} />
            <MetricCard title="Revenue (Today)" value={formatCurrency(report.totals.revenueTodayCents)} />
            <StatusCard title="Refunds" value={`${report.financial.refunds}`} />
            <StatusCard title="Comp Transactions" value={`${report.financial.comps}`} />
          </div>
        ) : null}

        {isInstructor ? (
          <AlertCard
            title="Instructor View"
            message="This dashboard is scoped to your assigned programs, rosters, and attendance operations."
            tone="info"
          />
        ) : null}
      </section>
    </PermissionGate>
  );
}
