"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/staff/permission-gate";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { buildReportModel, getEmptyReportModel, type ReportFilters } from "@/lib/reports/metrics";
import { formatDate, formatDateTime } from "@/lib/format/date";
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
  | "rentals"
  | "households"
  | "staff"
  | "waivers"
  | "financial"
  | "communications";

type SavedAnalyticsReport = {
  id: string;
  name: string;
  category: ReportCategory;
  filters: ReportFilters;
  search: string;
};

const ANALYTICS_SESSION_KEY = "cairn.analytics.session";
const ANALYTICS_SAVED_REPORTS_KEY = "cairn.analytics.saved-reports";

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

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildComparisonLabel(current: number, previous: number, formatter: (value: number) => string = (value) => `${value}`) {
  if (previous === 0) return `${formatter(current)} this period`;
  const delta = current - previous;
  const percent = Math.round((Math.abs(delta) / previous) * 100);
  const direction = delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  return `${direction === "flat" ? "Flat" : `${direction} ${percent}%`} vs previous period`;
}

function previousRangeFor(filters: ReportFilters): ReportFilters {
  switch (filters.rangeKey) {
    case "today":
      return { ...filters, rangeKey: "yesterday" };
    case "yesterday":
      return { ...filters, rangeKey: "today" };
    case "7d":
      return { ...filters, rangeKey: "30d" };
    case "30d":
      return { ...filters, rangeKey: "last_month" };
    case "this_month":
      return { ...filters, rangeKey: "last_month" };
    case "quarter_to_date":
      return { ...filters, rangeKey: "last_month" };
    case "year_to_date":
      return { ...filters, rangeKey: "last_month" };
    default:
      return { ...filters, rangeKey: "last_month" };
  }
}

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  sales: "Revenue",
  products: "Retail",
  memberships: "Memberships",
  attendance: "Attendance",
  customers: "Customers",
  programs: "Programs",
  rentals: "Rentals",
  households: "Households",
  staff: "Staff Activity",
  waivers: "Waivers",
  financial: "Financial Summary",
  communications: "Communications"
};

export default function ReportsPage() {
  const searchParams = useSearchParams();
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
    householdMembers,
    rentableResources,
    reservations,
    maintenanceBlocks,
    communications,
    billingAccounts,
    billingInvoices,
    membershipRenewals,
    billingRefunds,
    getWaiverStatusForCustomer
  } = useCustomerState();
  const { activeStaff, hasPermission, staffUsers } = useWorkstationState();
  const initialCategory = ((searchParams?.get?.("category") as ReportCategory) || "sales");
  const initialRange = (searchParams?.get?.("range") as ReportFilters["rangeKey"]) || "today";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ReportCategory>(initialCategory);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [savedReports, setSavedReports] = useState<SavedAnalyticsReport[]>([]);
  const [savedReportName, setSavedReportName] = useState("");
  const [filters, setFilters] = useState<ReportFilters>({
    rangeKey: initialRange,
    locationId: undefined,
    programType: "all",
    instructorId: "all",
    ageGroup: "all",
    membershipStatus: "all",
    productType: "all",
    productCategory: "all",
    householdId: "all",
    customerSegment: "all"
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
  const previousReport = useMemo(
    () =>
      buildReportModel({
        staffRole: activeStaff?.role ?? "front_desk",
        staffId: activeStaff?.id,
        now: new Date(),
        filters: previousRangeFor(filters),
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
    [activeStaff?.id, activeStaff?.role, filters, customers, checkInRecords, transactions, programs, sessions, registrations, memberships, accessProducts, productCategories, households, householdMembers]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawSession = window.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as { activeCategory?: ReportCategory; filters?: ReportFilters; search?: string };
        if (!searchParams?.get?.("category") && parsed.activeCategory) setActiveCategory(parsed.activeCategory);
        if (parsed.filters) {
          setFilters((current) => ({
            ...current,
            ...parsed.filters,
            rangeKey: searchParams?.get?.("range") ? current.rangeKey : (parsed.filters?.rangeKey ?? current.rangeKey)
          }));
        }
        if (typeof parsed.search === "string") setSearch(parsed.search);
      } catch {}
    }
    const rawSavedReports = window.localStorage.getItem(ANALYTICS_SAVED_REPORTS_KEY);
    if (rawSavedReports) {
      try {
        setSavedReports(JSON.parse(rawSavedReports) as SavedAnalyticsReport[]);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      ANALYTICS_SESSION_KEY,
      JSON.stringify({
        activeCategory,
        filters,
        search
      })
    );
  }, [activeCategory, filters, search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ANALYTICS_SAVED_REPORTS_KEY, JSON.stringify(savedReports));
  }, [savedReports]);
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
  const householdReportRows = useMemo(
    () =>
      households.map((household) => {
        const memberIds = householdMembers.filter((entry) => entry.householdId === household.id).map((entry) => entry.customerId);
        const visits = checkInRecords.filter((entry) => memberIds.includes(entry.customerId)).length;
        const revenue = transactions
          .filter((entry) => entry.householdId === household.id || memberIds.includes(entry.customerId) || memberIds.includes(entry.purchaserCustomerId ?? ""))
          .reduce((sum, entry) => sum + entry.total, 0);
        const waiverIssues = customers.filter((customer) => memberIds.includes(customer.id) && customer.waiverId === undefined).length;
        return {
          id: household.id,
          name: household.householdName,
          visits,
          revenue,
          waiverIssues,
          size: memberIds.length
        };
      }),
    [households, householdMembers, checkInRecords, transactions, customers]
  );
  const householdGrowthCount = householdReportRows.filter((row) => {
    const household = households.find((entry) => entry.id === row.id);
    if (!household?.createdAt) return false;
    return household.createdAt.slice(0, 10) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }).length;
  const householdRetentionRate = householdReportRows.length
    ? Math.round((householdReportRows.filter((row) => row.visits > 0).length / householdReportRows.length) * 100)
    : 0;
  const householdWaiverIssues = householdReportRows.reduce((sum, row) => sum + row.waiverIssues, 0);
  const registrationRevenueCents = useMemo(
    () =>
      report.sales.transactions.reduce(
        (sum, transaction) =>
          sum +
          transaction.items
            .filter((item) => item.productType === "program-registration")
            .reduce((itemSum, item) => itemSum + item.lineTotalCents, 0),
        0
      ),
    [report.sales.transactions]
  );
  const waitlistConversions = useMemo(
    () => registrations.filter((entry) => entry.status === "confirmed" && entry.registrationSource === "online" && entry.waitlistPosition != null).length,
    [registrations]
  );
  const cancellationRate = useMemo(() => {
    const total = registrations.length;
    if (total === 0) return 0;
    return Math.round((registrations.filter((entry) => entry.status === "cancelled").length / total) * 100);
  }, [registrations]);
  const outstandingBalancesCents = useMemo(
    () => billingAccounts.filter((entry) => entry.currentBalanceCents < 0).reduce((sum, entry) => sum + Math.abs(entry.currentBalanceCents), 0),
    [billingAccounts]
  );
  const accountCreditsCents = useMemo(
    () => billingAccounts.reduce((sum, entry) => sum + entry.availableCreditCents, 0),
    [billingAccounts]
  );
  const failedBillingPayments = useMemo(
    () => membershipRenewals.filter((entry) => entry.status === "failed").length,
    [membershipRenewals]
  );
  const refundsValueCents = useMemo(
    () => billingRefunds.reduce((sum, entry) => sum + entry.amountCents, 0),
    [billingRefunds]
  );
  const rentalRevenueCents = useMemo(
    () => reservations.reduce((sum, entry) => sum + entry.totalPriceCents, 0),
    [reservations]
  );
  const rentalCancellationRate = useMemo(() => {
    if (reservations.length === 0) return 0;
    return Math.round((reservations.filter((entry) => entry.status === "cancelled").length / reservations.length) * 100);
  }, [reservations]);
  const mostPopularResources = useMemo(() => {
    const counts = new Map<string, number>();
    reservations.forEach((entry) => counts.set(entry.resourceId, (counts.get(entry.resourceId) ?? 0) + 1));
    return rentableResources
      .map((resource) => ({ id: resource.id, name: resource.name, count: counts.get(resource.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [reservations, rentableResources]);
  const capacityUtilization = rentableResources.length === 0 ? 0 : Math.round((reservations.length / rentableResources.length) * 100);
  const equipmentUsageCount = reservations.filter((entry) => entry.reservationType === "equipment_checkout").length;
  const newHouseholds = useMemo(
    () => households.filter((entry) => entry.createdAt && new Date(entry.createdAt) >= report.range.start && new Date(entry.createdAt) <= report.range.end).length,
    [households, report.range.end, report.range.start]
  );
  const activeMemberships = memberships.filter((entry) => entry.status === "active").length;
  const programsAtCapacity = report.programs.rows.filter((entry) => entry.capacity > 0 && entry.enrolled >= entry.capacity).length;
  const topSellingProducts = report.sales.byProduct.slice(0, 5);
  const mostPopularPrograms = report.programs.rows.slice().sort((a, b) => b.enrolled - a.enrolled).slice(0, 5);
  const communicationTypeCounts = useMemo(() => {
    return communications.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.channel] = (counts[entry.channel] ?? 0) + 1;
      return counts;
    }, {});
  }, [communications]);
  const waiverStatusCounts = useMemo(
    () =>
      customers.reduce(
        (totals, customer) => {
          const status = getWaiverStatusForCustomer(customer.id, "wtpl_general");
          totals[status] += 1;
          return totals;
        },
        { valid: 0, missing: 0, expired: 0, expiring_soon: 0, outdated_version: 0 } as Record<ReturnType<typeof getWaiverStatusForCustomer>, number>
      ),
    [customers, getWaiverStatusForCustomer]
  );
  const locationComparison = useMemo(() => {
    const locations = [
      { id: "loc_001", name: "Summit Downtown" },
      { id: "loc_002", name: "Summit Uptown" }
    ];
    return locations.map((location) => {
      const filtered = buildReportModel({
        staffRole: activeStaff?.role ?? "front_desk",
        staffId: activeStaff?.id,
        now: new Date(),
        filters: { ...filters, locationId: location.id },
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
      return {
        id: location.id,
        name: location.name,
        revenueCents: filtered.sales.netCents,
        checkIns: filtered.attendance.totalVisits,
        registrations: filtered.programs.rows.reduce((sum, row) => sum + row.enrolled, 0)
      };
    });
  }, [activeStaff?.id, activeStaff?.role, filters, customers, checkInRecords, transactions, programs, sessions, registrations, memberships, accessProducts, productCategories, households, householdMembers]);

  const executiveCards = [
    {
      title: "Revenue This Month",
      value: formatCurrency(report.sales.netCents),
      changeLabel: buildComparisonLabel(report.sales.netCents, previousReport.sales.netCents, (value) => formatCurrency(value)),
      category: "sales" as const,
      hint: "Open Revenue Analytics →"
    },
    {
      title: "Check-Ins This Period",
      value: report.attendance.totalVisits,
      changeLabel: buildComparisonLabel(report.attendance.totalVisits, previousReport.attendance.totalVisits),
      category: "attendance" as const,
      hint: "Open Attendance Analytics →"
    },
    {
      title: "Active Memberships",
      value: activeMemberships,
      changeLabel: `${report.members.newMembers} gained · ${report.members.cancelledMembers} lost`,
      category: "memberships" as const,
      hint: "Open Membership Analytics →"
    },
    {
      title: "Programs At Capacity",
      value: programsAtCapacity,
      changeLabel: `${report.programs.rows.reduce((sum, row) => sum + row.waitlisted, 0)} waitlisted`,
      category: "programs" as const,
      hint: "Open Program Analytics →"
    },
    {
      title: "New Customers",
      value: report.members.newMembers,
      changeLabel: `${newHouseholds} new households`,
      category: "customers" as const,
      hint: "Open Customer Analytics →"
    },
    {
      title: "Average Household Size",
      value: report.households.averageSize,
      changeLabel: `${report.households.total} households tracked`,
      category: "households" as const,
      hint: "Open Household Analytics →"
    }
  ];

  const handleSaveReport = () => {
    const name = savedReportName.trim();
    if (!name) return;
    setSavedReports((current) => [
      {
        id: `saved_report_${Date.now()}`,
        name,
        category: activeCategory,
        filters,
        search
      },
      ...current
    ]);
    setSavedReportName("");
  };

  const exportRows = report.csvRows.map((row) => ({
    receipt: row.receipt,
    date: row.date,
    customer: row.customer,
    staff: row.staff,
    category: row.category,
    total: row.total,
    items: row.items
  }));

  return (
    <PermissionGate permission="viewReports">
      <section className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Reports & Analytics</h2>
            <p className="text-sm text-muted-foreground">Business intelligence for revenue, memberships, attendance, households, waivers, rentals, and communications.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => downloadCsv("cairn-analytics-export.csv", exportRows)}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(
                  "cairn-analytics-export.xlsx",
                  exportRows.map((row) => Object.values(row).join("\t")).join("\n"),
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
              }
            >
              Export Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(
                  "cairn-analytics-export.pdf.txt",
                  "PDF export placeholder\n\nThis placeholder respects current analytics filters and date range.",
                  "text/plain;charset=utf-8"
                )
              }
            >
              Export PDF
            </Button>
          </div>
        </header>

        {reportError ? <AlertCard title="Report Data Warning" message={reportError} tone="warning" /> : null}

        <ReportFiltersBar
          filters={filters}
          onChange={setFilters}
          locations={[
            { id: "loc_001", name: "Summit Downtown" },
            { id: "loc_002", name: "Summit Uptown" }
          ]}
          households={households.map((entry) => ({ id: entry.id, name: entry.householdName }))}
          productCategories={productCategories}
          instructors={staffUsers.filter((entry) => entry.role === "instructor" || entry.canTeach)}
          programTypes={Array.from(new Set(programs.map((entry) => entry.programType).filter(Boolean)))}
          search={search}
          onSearchChange={setSearch}
        />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="executive-analytics-dashboard">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Executive Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Click any metric to drill into filtered analytics for the current date range.
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                {formatDate(report.range.start)} - {formatDate(report.range.end)}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {executiveCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  className="rounded-xl border p-0 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setActiveCategory(card.category)}
                >
                  <MetricCard title={card.title} value={card.value} changeLabel={card.changeLabel} footer={<p className="text-xs text-muted-foreground">{card.hint}</p>} />
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="saved-analytics-reports">
            <div>
              <h3 className="text-lg font-semibold">Saved Reports</h3>
              <p className="text-sm text-muted-foreground">Save board decks, operational reviews, and repeat analytics views.</p>
            </div>
            <div className="space-y-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Report name</span>
                <input
                  className="h-11 w-full rounded-md border bg-white px-3"
                  value={savedReportName}
                  onChange={(event) => setSavedReportName(event.target.value)}
                  placeholder="Monthly Board Report"
                />
              </label>
              <Button className="w-full" onClick={handleSaveReport}>Save Current Report</Button>
            </div>
            <div className="space-y-2">
              {savedReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved report configurations yet.</p>
              ) : (
                savedReports.slice(0, 6).map((saved) => (
                  <button
                    key={saved.id}
                    type="button"
                    className="w-full rounded-md border px-3 py-2 text-left hover:bg-secondary"
                    onClick={() => {
                      setActiveCategory(saved.category);
                      setFilters(saved.filters);
                      setSearch(saved.search);
                    }}
                  >
                    <p className="text-sm font-medium">{saved.name}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[saved.category]} · {saved.filters.rangeKey.replaceAll("_", " ")}</p>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

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
          <MetricCard title="Gross Sales" value={formatCurrency(report.sales.grossCents)} changeLabel={buildComparisonLabel(report.sales.grossCents, previousReport.sales.grossCents, (value) => formatCurrency(value))} />
          <MetricCard title="Net Sales" value={formatCurrency(report.sales.netCents)} changeLabel={buildComparisonLabel(report.sales.netCents, previousReport.sales.netCents, (value) => formatCurrency(value))} />
          <MetricCard title="Transactions" value={report.sales.transactionCount} changeLabel={buildComparisonLabel(report.sales.transactionCount, previousReport.sales.transactionCount)} />
          <MetricCard title="Avg Transaction" value={formatCurrency(report.sales.averageTransactionCents)} changeLabel="Filtered by current range and segment" />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">Location Comparison</h3>
                <p className="text-sm text-muted-foreground">Combined and per-location performance for the active filters.</p>
              </div>
              <span className="text-xs text-muted-foreground">Multi-location</span>
            </div>
            <div className="mt-3 space-y-2">
              {locationComparison.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-left transition hover:bg-secondary"
                  onClick={() => setFilters((current) => ({ ...current, locationId: entry.id }))}
                >
                  <div>
                    <p className="text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.registrations} registrations · {entry.checkIns} check-ins</p>
                  </div>
                  <strong>{formatCurrency(entry.revenueCents)}</strong>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-xl border bg-card p-4">
            <h3 className="text-base font-semibold">Scheduled Reports</h3>
            <p className="mt-1 text-sm text-muted-foreground">Architecture placeholder for weekly executive digests, monthly board packets, and quarterly summaries.</p>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="rounded-md bg-muted/30 px-3 py-2">Weekly Email Reports · Placeholder</div>
              <div className="rounded-md bg-muted/30 px-3 py-2">Monthly Board Reports · Placeholder</div>
              <div className="rounded-md bg-muted/30 px-3 py-2">Quarterly Summaries · Placeholder</div>
            </div>
          </section>
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
                          <td className="py-2 pr-3">{formatDateTime(row.date)}</td>
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
            <div className="grid gap-3 md:grid-cols-3">
              <StatusCard title="Show-up Rate" value={`${report.attendance.showUpRate}%`} />
              <StatusCard title="Fill Rate" value={`${report.attendance.fillRate}%`} />
              <StatusCard title="Waitlist Utilization" value={`${report.attendance.waitlistUtilization}%`} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <BarBreakdownCard title="Visits by Hour" data={report.trends.byHour.map((row) => ({ label: row.label, visits: row.count }))} bars={[{ key: "visits", color: "#2563eb", name: "Visits" }]} />
              <BarBreakdownCard title="Visits by Day" data={report.trends.byDay.map((row) => ({ label: row.label, visits: row.count }))} bars={[{ key: "visits", color: "#7c3aed", name: "Visits" }]} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <ListCard
                title="Top Visitors"
                emptyText="No attendance data available."
                items={report.attendance.topVisitors.map((entry) => ({
                  id: entry.customerId,
                  primary: entry.customerName,
                  secondary: `${entry.visits} visits`
                }))}
              />
              <ListCard
                title="Instructor Attendance Trend"
                emptyText="No instructor attendance data available."
                items={report.attendance.instructorAttendance.map((entry) => ({
                  id: entry.instructor,
                  primary: entry.instructor,
                  secondary: `${entry.attendanceRate}% attendance (${entry.attended}/${entry.total})`
                }))}
              />
            </div>
          </div>
        ) : null}

        {activeCategory === "customers" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard title="New Customers" value={`${report.members.newMembers}`} />
              <StatusCard title="New Households" value={`${newHouseholds}`} />
              <StatusCard title="Average Household Size" value={`${report.households.averageSize}`} />
              <StatusCard title="Birthdays in Range" value={`${report.totals.birthdaysToday}`} />
            </div>
            <ListCard
              title="Customer Behavior"
              emptyText="No customer activity in this range."
              items={report.attendance.topVisitors.map((entry) => ({
                id: entry.customerId,
                primary: entry.customerName,
                secondary: `${entry.visits} visits in selected range`
              }))}
            />
          </div>
        ) : null}

        {activeCategory === "programs" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard title="Registration Revenue" value={formatCurrency(registrationRevenueCents)} />
              <StatusCard title="Registrations Created" value={`${registrations.length}`} />
              <StatusCard title="Waitlist Conversions" value={`${waitlistConversions}`} />
              <StatusCard title="Program Fill Rate" value={`${report.attendance.fillRate}%`} />
              <StatusCard title="Cancellation Rate" value={`${cancellationRate}%`} />
            </div>
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
                secondary: `${formatDateTime(row.startsAt)} · ${row.registered}/${row.capacity} registered`
              }))}
            />
          </div>
        ) : null}

        {activeCategory === "rentals" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard title="Reservation Revenue" value={formatCurrency(rentalRevenueCents / 100)} />
              <StatusCard title="Resource Utilization" value={`${capacityUtilization}%`} />
              <StatusCard title="Most Popular Resources" value={`${mostPopularResources.filter((entry) => entry.count > 0).length}`} />
              <StatusCard title="Cancellation Rate" value={`${rentalCancellationRate}%`} />
              <StatusCard title="Equipment Usage" value={`${equipmentUsageCount}`} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <ListCard
                title="Rental Trends"
                emptyText="No reservations available."
                items={reservations.map((entry) => ({
                  id: entry.id,
                  primary: rentableResources.find((resource) => resource.id === entry.resourceId)?.name ?? entry.title,
                  secondary: `${formatDateTime(entry.startsAt)} · ${formatCurrency(entry.totalPriceCents / 100)}`
                }))}
              />
              <ListCard
                title="Most Popular Resources"
                emptyText="No resource activity yet."
                items={mostPopularResources.map((entry) => ({
                  id: entry.id,
                  primary: entry.name,
                  secondary: `${entry.count} reservations`
                }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <StatusCard title="Active Maintenance Blocks" value={`${maintenanceBlocks.length}`} />
              <StatusCard title="Resources Available" value={`${rentableResources.filter((entry) => entry.status === "active").length}`} />
            </div>
          </div>
        ) : null}

        {activeCategory === "households" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard title="Total Households" value={`${report.households.total}`} />
              <StatusCard title="Average Household Size" value={`${report.households.averageSize}`} />
              <StatusCard title="Youth Members" value={`${report.households.youthMembers}`} />
              <StatusCard title="Adult Members" value={`${report.households.adultMembers}`} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <StatusCard title="Household Growth" value={`${householdGrowthCount}`} />
              <StatusCard title="Household Retention" value={`${householdRetentionRate}%`} />
              <StatusCard title="Household Waiver Report" value={`${householdWaiverIssues} issues`} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <ListCard
                title="Top Visiting Households"
                emptyText="No household visits yet."
                items={householdReportRows
                  .slice()
                  .sort((a, b) => b.visits - a.visits)
                  .slice(0, 5)
                  .map((row) => ({
                    id: row.id,
                    primary: row.name,
                    secondary: `${row.visits} visits · ${row.size} members`
                  }))}
              />
              <ListCard
                title="Household Revenue"
                emptyText="No household revenue yet."
                items={householdReportRows
                  .slice()
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map((row) => ({
                    id: row.id,
                    primary: row.name,
                    secondary: `${formatCurrency(row.revenue)} · ${row.waiverIssues} waiver issue${row.waiverIssues === 1 ? "" : "s"}`
                  }))}
              />
            </div>
          </div>
        ) : null}

        {activeCategory === "staff" ? (
          <ListCard title="Staff Activity" emptyText="No staff operational activity yet." items={staffOperationalRows} />
        ) : null}

        {activeCategory === "waivers" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard title="Current Waivers" value={`${waiverStatusCounts.valid}`} />
              <StatusCard title="Missing Waivers" value={`${waiverStatusCounts.missing}`} />
              <StatusCard title="Expiring Waivers" value={`${waiverStatusCounts.expiring_soon}`} />
              <StatusCard title="Expired Waivers" value={`${waiverStatusCounts.expired}`} />
            </div>
            <ListCard
              title="Waiver Follow-Up"
              emptyText="No waiver issues in this range."
              items={customers
                .filter((entry) => {
                  const status = getWaiverStatusForCustomer(entry.id, "wtpl_general");
                  return status === "missing" || status === "expired" || status === "expiring_soon" || status === "outdated_version";
                })
                .slice(0, 8)
                .map((entry) => ({
                  id: entry.id,
                  primary: `${entry.firstName} ${entry.lastName}`,
                  secondary: `Status: ${getWaiverStatusForCustomer(entry.id, "wtpl_general").replaceAll("_", " ")}`
                }))}
            />
          </div>
        ) : null}

        {activeCategory === "communications" ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Messages Sent" value={communications.filter((entry) => entry.status === "sent").length} />
              <MetricCard title="Scheduled" value={communications.filter((entry) => entry.status === "scheduled").length} />
              <MetricCard title="Failed" value={communications.filter((entry) => entry.status === "failed").length} />
              <MetricCard title="Drafts" value={communications.filter((entry) => entry.status === "draft").length} />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <BarBreakdownCard
                title="Messages by Type"
                data={Object.entries(communicationTypeCounts).map(([key, value]) => ({ label: key.replaceAll("_", " "), count: value }))}
                bars={[{ key: "count", color: "#2563eb", name: "Messages" }]}
              />
              <ListCard
                title="Recent Communication Activity"
                emptyText="No communications recorded."
                items={communications.slice(0, 10).map((entry) => ({
                  id: entry.id,
                  primary: entry.subject,
                  secondary: `${entry.channel.replaceAll("_", " ")} · ${entry.status} · ${formatDateTime(entry.createdAt)}`
                }))}
              />
            </div>
          </div>
        ) : null}

        {activeCategory === "financial" ? (
          showFinancial ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Gross Revenue" value={formatCurrency(report.sales.grossCents)} />
              <MetricCard title="Net Revenue" value={formatCurrency(report.sales.netCents)} />
              <StatusCard title="Refund Count" value={`${report.financial.refunds}`} />
              <StatusCard title="Comp Transactions" value={`${report.financial.comps}`} />
              <MetricCard title="Outstanding Balances" value={formatCurrency(outstandingBalancesCents)} />
              <MetricCard title="Credits" value={formatCurrency(accountCreditsCents)} />
              <StatusCard title="Renewals" value={`${membershipRenewals.length}`} />
              <StatusCard title="Failed Payments" value={`${failedBillingPayments}`} />
              <MetricCard title="Refund Value" value={formatCurrency(refundsValueCents)} />
              <StatusCard title="Invoices" value={`${billingInvoices.length}`} />
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
