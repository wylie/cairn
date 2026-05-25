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

type ReportCategory =
  | "sales"
  | "products"
  | "memberships"
  | "attendance"
  | "customers"
  | "programs"
  | "households"
  | "staff"
  | "waivers"
  | "financial";

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

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  sales: "Sales",
  products: "Products",
  memberships: "Memberships",
  attendance: "Attendance",
  customers: "Customers",
  programs: "Programs",
  households: "Households",
  staff: "Staff Activity",
  waivers: "Waivers",
  financial: "Financial Summary"
};

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
    productCategories,
    households,
    householdMembers
  } = useCustomerState();
  const { activeStaff, hasPermission, staffUsers } = useWorkstationState();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ReportCategory>("sales");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
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
          productCategories,
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
  }, [activeStaff?.id, activeStaff?.role, filters, customers, checkInRecords, transactions, programs, sessions, registrations, memberships, accessProducts, productCategories, households, householdMembers]);
  const categoryLabelByKey = useMemo(
    () => new Map(productCategories.map((entry) => [entry.key, entry.label])),
    [productCategories]
  );
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);

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

  const categoryRows = report.sales.byCategory.filter((row) => selectedCategory === "all" || row.category === selectedCategory);
  const productRows = report.sales.byProduct.filter((row) => {
    if (selectedCategory !== "all" && row.category !== selectedCategory) return false;
    if (selectedProduct !== "all" && row.productId !== selectedProduct) return false;
    return true;
  });
  const transactionRows = report.sales.transactions.filter((row) => {
    if (selectedProduct === "all") return true;
    return row.items.some((item) => item.productId === selectedProduct);
  });

  const staffOperationalRows = useMemo(() => {
    if (!(activeStaff?.role === "manager" || activeStaff?.role === "owner")) return [];
    return report.sales.byStaff.map((entry) => ({
      id: entry.staffId,
      primary: entry.staffName,
      secondary: `${entry.transactionCount} transactions · ${formatCurrency(entry.revenueCents)}`
    }));
  }, [activeStaff?.role, report.sales.byStaff]);

  const showFinancial = hasPermission("viewFinancialReports") || activeStaff?.role === "owner";

  return (
    <PermissionGate permission="viewReports">
      <section className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Reports</h2>
            <p className="text-sm text-muted-foreground">Operational command center for sales, memberships, attendance, and customer behavior.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                "cairn-reports-export.csv",
                report.csvRows.map((row) => ({
                  receipt: row.receipt,
                  date: row.date,
                  customer: row.customer,
                  staff: row.staff,
                  category: row.category,
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

        <div className="grid gap-2 lg:grid-cols-5" aria-label="report-categories">
          {(Object.keys(CATEGORY_LABELS) as ReportCategory[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${activeCategory === key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
              onClick={() => setActiveCategory(key)}
            >
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Gross Sales" value={formatCurrency(report.sales.grossCents)} />
          <MetricCard title="Net Sales" value={formatCurrency(report.sales.netCents)} />
          <MetricCard title="Transactions" value={report.sales.transactionCount} />
          <MetricCard title="Avg Transaction" value={formatCurrency(report.sales.averageTransactionCents)} />
        </div>

        {activeCategory === "sales" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard title="Refunds" value={formatCurrency(report.sales.refundsCents)} />
              <StatusCard title="Discounts" value={formatCurrency(report.sales.discountsCents)} />
              <StatusCard title="Comps" value={formatCurrency(report.sales.compsCents)} />
              <StatusCard title="Tax Collected" value={formatCurrency(report.sales.taxCents)} />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <TrendLineCard title="Revenue Over Time" data={trendData} lines={[{ key: "revenue", color: "hsl(var(--primary))", name: "Revenue ($)" }]} />
              <BarBreakdownCard
                title="Sales by Category"
                data={report.sales.byCategory.map((row) => ({ label: categoryLabelByKey.get(row.category) ?? row.category.replaceAll("_", " "), revenue: row.revenueCents / 100 }))}
                bars={[{ key: "revenue", color: "#0ea5e9", name: "Revenue ($)" }]}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <BarBreakdownCard
                title="Sales by Product"
                data={report.sales.byProduct.slice(0, 8).map((row) => ({ label: row.productName, revenue: row.revenueCents / 100 }))}
                bars={[{ key: "revenue", color: "#16a34a", name: "Revenue ($)" }]}
              />
              <BarBreakdownCard
                title="Sales by Staff"
                data={report.sales.byStaff.map((row) => ({ label: row.staffName, revenue: row.revenueCents / 100 }))}
                bars={[{ key: "revenue", color: "#2563eb", name: "Revenue ($)" }]}
              />
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-base font-semibold">Product / Category Drill-Down</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <select className="h-10 w-full rounded-md border bg-background px-3" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                    <option value="all">All categories</option>
                    {report.sales.byCategory.map((row) => (
                      <option key={row.category} value={row.category}>{categoryLabelByKey.get(row.category) ?? row.category.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Product</span>
                  <select className="h-10 w-full rounded-md border bg-background px-3" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>
                    <option value="all">All products</option>
                    {report.sales.byProduct
                      .filter((row) => selectedCategory === "all" || row.category === selectedCategory)
                      .map((row) => (
                        <option key={row.productId} value={row.productId}>{row.productName}</option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 overflow-x-auto" aria-label="sales-drilldown-table">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Quantity</th>
                      <th className="py-2 pr-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.length === 0 ? (
                      <tr><td colSpan={4} className="py-3 text-muted-foreground">No product sales in this range.</td></tr>
                    ) : (
                      productRows.map((row) => (
                        <tr key={row.productId} className="border-b last:border-b-0">
                          <td className="py-2 pr-3">{row.productName}</td>
                          <td className="py-2 pr-3">{categoryLabelByKey.get(row.category) ?? row.category.replaceAll("_", " ")}</td>
                          <td className="py-2 pr-3">{row.quantity}</td>
                          <td className="py-2 pr-3">{formatCurrency(row.revenueCents)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3">Receipt</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Customer</th>
                      <th className="py-2 pr-3">Staff</th>
                      <th className="py-2 pr-3">Payment</th>
                      <th className="py-2 pr-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionRows.slice(0, 20).flatMap((row) => {
                      const summaryRow = (
                        <tr key={row.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-3">
                            <button
                              type="button"
                              className="font-medium text-primary hover:underline"
                              onClick={() => setExpandedReceiptId((prev) => (prev === row.id ? null : row.id))}
                            >
                              {row.receipt}
                            </button>
                          </td>
                          <td className="py-2 pr-3">{new Date(row.date).toLocaleString()}</td>
                          <td className="py-2 pr-3">{row.customer}</td>
                          <td className="py-2 pr-3">{row.staff}</td>
                          <td className="py-2 pr-3">{row.paymentMethod}</td>
                          <td className="py-2 pr-3">{formatCurrency(row.totalCents)}</td>
                        </tr>
                      );
                      const detailRow = expandedReceiptId === row.id ? (
                          <tr key={`${row.id}_detail`} className="border-b bg-muted/20">
                            <td colSpan={6} className="p-3">
                              <div className="space-y-3">
                                <div className="grid gap-2 text-xs md:grid-cols-4">
                                  <p><span className="font-semibold">Receipt ID:</span> {row.receipt}</p>
                                  <p><span className="font-semibold">Customer:</span> {row.customer}</p>
                                  <p><span className="font-semibold">Staff:</span> {row.staff}</p>
                                  <p><span className="font-semibold">Payment:</span> {row.paymentMethod}</p>
                                  <p><span className="font-semibold">Location:</span> {row.locationId}</p>
                                  <p><span className="font-semibold">Subtotal:</span> {formatCurrency(row.subtotalCents)}</p>
                                  <p><span className="font-semibold">Discounts:</span> {formatCurrency(row.discountCents)}</p>
                                  <p><span className="font-semibold">Comps:</span> {formatCurrency(row.compCents)}</p>
                                  <p><span className="font-semibold">Tax:</span> {formatCurrency(row.taxCents)}</p>
                                  <p><span className="font-semibold">Total:</span> {formatCurrency(row.totalCents)}</p>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="border-b text-left text-muted-foreground">
                                        <th className="py-1 pr-2">Product</th>
                                        <th className="py-1 pr-2">Category</th>
                                        <th className="py-1 pr-2">Type</th>
                                        <th className="py-1 pr-2">Qty</th>
                                        <th className="py-1 pr-2">Unit</th>
                                        <th className="py-1 pr-2">Discount</th>
                                        <th className="py-1 pr-2">Tax</th>
                                        <th className="py-1 pr-2">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.items.map((item, index) => (
                                        <tr key={`${row.id}_${item.productName}_${index}`} className="border-b last:border-b-0">
                                          <td className="py-1 pr-2">{item.productName}</td>
                                          <td className="py-1 pr-2">{item.productCategory}</td>
                                          <td className="py-1 pr-2">{item.productType}</td>
                                          <td className="py-1 pr-2">{item.quantity}</td>
                                          <td className="py-1 pr-2">{formatCurrency(item.unitPriceCents)}</td>
                                          <td className="py-1 pr-2">{formatCurrency(item.discountCents)}</td>
                                          <td className="py-1 pr-2">{formatCurrency(item.taxCents)}</td>
                                          <td className="py-1 pr-2">{formatCurrency(item.lineTotalCents)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null;
                      return detailRow ? [summaryRow, detailRow] : [summaryRow];
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {activeCategory === "products" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <BarBreakdownCard
              title="Top Product Revenue"
              data={report.sales.byProduct.slice(0, 10).map((row) => ({ label: row.productName, revenue: row.revenueCents / 100 }))}
              bars={[{ key: "revenue", color: "#0ea5e9", name: "Revenue ($)" }]}
            />
            <ListCard
              title="Product Sales Table"
              emptyText="No products sold in this range."
              items={report.sales.byProduct.slice(0, 10).map((row) => ({
                id: row.productId,
                primary: row.productName,
                secondary: `${row.quantity} sold · ${formatCurrency(row.revenueCents)}`
              }))}
            />
          </div>
        ) : null}

        {activeCategory === "memberships" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <StatusCard title="Active Members" value={`${report.membership.active}`} />
              <StatusCard title="New Members" value={`${report.members.newMembers}`} />
              <StatusCard title="Cancelled" value={`${report.members.cancelledMembers}`} />
              <StatusCard title="Retention Rate" value={`${report.members.retentionRate}%`} />
              <StatusCard title="Churn Rate" value={`${report.members.churnRate}%`} />
            </div>
            <TrendLineCard title="Membership Growth Trend" data={trendData} lines={[{ key: "memberships", color: "#16a34a", name: "Memberships Sold" }]} />
            <div className="grid gap-3 md:grid-cols-3">
              <StatusCard title="Renewals" value={`${report.members.renewals}`} />
              <StatusCard title="Avg Membership Length" value={`${report.members.averageMembershipLengthDays} days`} />
              <StatusCard title="Members Not Seen Recently" value={`${report.members.inactiveMemberCount}`} />
            </div>
          </div>
        ) : null}

        {activeCategory === "attendance" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Total Visits" value={report.attendance.totalVisits} />
              <MetricCard title="Unique Visitors" value={report.attendance.uniqueVisitors} />
              <MetricCard title="Repeat Visitors" value={report.attendance.repeatVisitors} />
              <MetricCard title="Avg Visit Duration" value={`${report.attendance.averageVisitDurationMinutes} min`} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <BarBreakdownCard title="Visits by Hour" data={report.trends.byHour.map((row) => ({ label: row.label, visits: row.count }))} bars={[{ key: "visits", color: "#2563eb", name: "Visits" }]} />
              <BarBreakdownCard title="Visits by Day" data={report.trends.byDay.map((row) => ({ label: row.label, visits: row.count }))} bars={[{ key: "visits", color: "#7c3aed", name: "Visits" }]} />
            </div>
            <ListCard
              title="Top Visitors"
              emptyText="No attendance data available."
              items={report.attendance.topVisitors.map((entry) => ({
                id: entry.customerId,
                primary: entry.customerName,
                secondary: `${entry.visits} visits`
              }))}
            />
          </div>
        ) : null}

        {activeCategory === "customers" ? (
          <ListCard
            title="Customer Behavior"
            emptyText="No customer activity in this range."
            items={report.attendance.topVisitors.map((entry) => ({
              id: entry.customerId,
              primary: entry.customerName,
              secondary: `${entry.visits} visits in selected range`
            }))}
          />
        ) : null}

        {activeCategory === "programs" ? (
          <div className="space-y-3">
            <ListCard
              title="Program Performance"
              emptyText="No program data available."
              items={report.programs.rows.map((row) => ({
                id: row.id,
                primary: row.name,
                secondary: `${row.enrolled}/${row.capacity || 0} enrolled · waitlist ${row.waitlisted} · ${row.utilization}% utilization`
              }))}
            />
            <ListCard
              title="Upcoming Sessions"
              emptyText="No upcoming sessions."
              items={report.programs.upcomingSessions.map((row) => ({
                id: row.id,
                primary: row.title,
                secondary: `${new Date(row.startsAt).toLocaleString()} · ${row.registered}/${row.capacity} registered`
              }))}
            />
          </div>
        ) : null}

        {activeCategory === "households" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatusCard title="Total Households" value={`${report.households.total}`} />
            <StatusCard title="Average Household Size" value={`${report.households.averageSize}`} />
            <StatusCard title="Youth Members" value={`${report.households.youthMembers}`} />
            <StatusCard title="Adult Members" value={`${report.households.adultMembers}`} />
          </div>
        ) : null}

        {activeCategory === "staff" ? (
          <ListCard title="Staff Activity" emptyText="No staff operational activity yet." items={staffOperationalRows} />
        ) : null}

        {activeCategory === "waivers" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <StatusCard title="Waivers Missing" value={`${report.totals.waiversMissing}`} />
            <StatusCard title="Waiver Risk Customers" value={`${report.totals.waiversMissing}`} />
          </div>
        ) : null}

        {activeCategory === "financial" ? (
          showFinancial ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Gross Revenue" value={formatCurrency(report.sales.grossCents)} />
              <MetricCard title="Net Revenue" value={formatCurrency(report.sales.netCents)} />
              <StatusCard title="Refund Count" value={`${report.financial.refunds}`} />
              <StatusCard title="Comp Transactions" value={`${report.financial.comps}`} />
            </div>
          ) : (
            <AlertCard title="Restricted" tone="warning" message="Financial summary is available to manager and owner roles." />
          )
        ) : null}

        {report.sales.transactions.length === 0 ? (
          <AlertCard title="No report data" tone="info" message="No data found for this filter range. Try expanding date range or clearing filters." />
        ) : null}
      </section>
    </PermissionGate>
  );
}
