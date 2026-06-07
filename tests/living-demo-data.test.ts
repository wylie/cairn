import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NOW = new Date("2026-06-06T14:00:00Z");

describe("living demo data", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses current-relative dates for check-ins and sessions", async () => {
    const { toDateKey, startOfThisWeek, endOfThisWeek } = await import("@/lib/demo/dates");
    const { checkInRecords } = await import("@/lib/mocks/checkins");
    const { classCampSessions } = await import("@/lib/mocks/programs");

    const todayKey = toDateKey(NOW);
    const todayCheckIns = checkInRecords.filter((entry) => entry.checkInTime.startsWith(todayKey));
    const weekStart = startOfThisWeek(NOW).getTime();
    const weekEnd = endOfThisWeek(NOW).getTime() + 24 * 60 * 60 * 1000 - 1;
    const thisWeekSessions = classCampSessions.filter((entry) => {
      const startsAt = new Date(entry.startsAt).getTime();
      return startsAt >= weekStart && startsAt <= weekEnd && entry.status !== "cancelled";
    });

    expect(todayCheckIns.length).toBeGreaterThanOrEqual(8);
    expect(todayCheckIns.length).toBeLessThanOrEqual(20);
    expect(thisWeekSessions.length).toBeGreaterThan(0);
    expect(classCampSessions.some((entry) => entry.startsAt.startsWith(todayKey))).toBe(true);
  });

  it("keeps dashboard and reports populated with current activity", async () => {
    const { buildReportModel } = await import("@/lib/reports/metrics");
    const { customers } = await import("@/lib/mocks/customers");
    const { checkInRecords } = await import("@/lib/mocks/checkins");
    const { posTransactions } = await import("@/lib/mocks/transactions");
    const { programs, classCampSessions } = await import("@/lib/mocks/programs");
    const { registrations } = await import("@/lib/mocks/registrations");
    const { memberships } = await import("@/lib/mocks/memberships");
    const { posProducts } = await import("@/lib/mocks/products");
    const { households, householdMembers } = await import("@/lib/mocks/households");

    const report = buildReportModel({
      staffRole: "owner",
      now: NOW,
      filters: { rangeKey: "today" },
      customers,
      checkIns: checkInRecords,
      transactions: posTransactions,
      programs,
      sessions: classCampSessions,
      registrations,
      memberships,
      products: posProducts,
      productCategories: [],
      households,
      householdMembers
    });

    expect(report.totals.todayCheckIns).toBeGreaterThan(0);
    expect(report.totals.currentlyIn).toBeGreaterThan(0);
    expect(report.totals.revenueTodayCents).toBeGreaterThan(0);
    expect(report.totals.registrationsToday).toBeGreaterThan(0);
    expect(report.programs.upcomingSessions.length).toBeGreaterThan(0);
    expect(report.sales.transactionCount).toBeGreaterThan(0);
  });

  it("refreshes demo seeds by current day without touching non-demo organizations", async () => {
    const { getDemoSeedVersion, shouldRefreshDemoSeed } = await import("@/lib/demo/seed");

    expect(getDemoSeedVersion(NOW)).toBe("2026-06-06");
    expect(shouldRefreshDemoSeed("org_summit", "2026-06-05", NOW)).toBe(true);
    expect(shouldRefreshDemoSeed("org_summit", "2026-06-06", NOW)).toBe(false);
    expect(shouldRefreshDemoSeed("org_custom_live", "2026-06-01", NOW)).toBe(false);
  });
});
