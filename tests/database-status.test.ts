import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: {
    execute: vi.fn()
  },
  getOrganizationCount: vi.fn(),
  getFacilityCount: vi.fn(),
  getStaffRoleCount: vi.fn(),
  getStaffUserCount: vi.fn(),
  getStaffFacilityAccessCount: vi.fn(),
  getCustomerCount: vi.fn(),
  getCustomerActivityCounts: vi.fn(),
  getCustomerDataModeCounts: vi.fn(),
  getLastCustomerCreated: vi.fn(),
  getPotentialDuplicateCustomerPairCount: vi.fn(),
  getHouseholdCount: vi.fn(),
  getHouseholdRelationshipCounts: vi.fn()
}));

vi.mock("@/db", () => ({
  getDatabase: () => mocks.database
}));

vi.mock("@/db/repositories/organization-repository", () => ({
  getOrganizationCount: mocks.getOrganizationCount
}));

vi.mock("@/db/repositories/facility-repository", () => ({
  getFacilityCount: mocks.getFacilityCount
}));

vi.mock("@/db/repositories/staff-repository", () => ({
  getStaffRoleCount: mocks.getStaffRoleCount,
  getStaffUserCount: mocks.getStaffUserCount,
  getStaffFacilityAccessCount: mocks.getStaffFacilityAccessCount
}));

vi.mock("@/db/repositories/customer-repository", () => ({
  getCustomerCount: mocks.getCustomerCount,
  getCustomerActivityCounts: mocks.getCustomerActivityCounts,
  getCustomerDataModeCounts: mocks.getCustomerDataModeCounts,
  getLastCustomerCreated: mocks.getLastCustomerCreated,
  getPotentialDuplicateCustomerPairCount: mocks.getPotentialDuplicateCustomerPairCount
}));

vi.mock("@/db/repositories/household-repository", () => ({
  getHouseholdCount: mocks.getHouseholdCount,
  getHouseholdRelationshipCounts: mocks.getHouseholdRelationshipCounts
}));

describe("getDatabaseStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.database.execute.mockResolvedValue([{ "?column?": 1 }]);
    mocks.getOrganizationCount.mockResolvedValue(3);
    mocks.getFacilityCount.mockResolvedValue(4);
    mocks.getStaffRoleCount.mockResolvedValue(5);
    mocks.getStaffUserCount.mockResolvedValue(6);
    mocks.getStaffFacilityAccessCount.mockResolvedValue(7);
    mocks.getCustomerCount.mockResolvedValue(12);
    mocks.getCustomerActivityCounts.mockResolvedValue({ active: 10, inactive: 2 });
    mocks.getCustomerDataModeCounts.mockResolvedValue({ demo: 8, sandbox: 3, production: 1 });
    mocks.getLastCustomerCreated.mockResolvedValue({
      firstName: "Nina",
      lastName: "Stone",
      createdAt: new Date("2026-07-11T12:00:00.000Z")
    });
    mocks.getPotentialDuplicateCustomerPairCount.mockResolvedValue(2);
    mocks.getHouseholdCount.mockResolvedValue(5);
    mocks.getHouseholdRelationshipCounts.mockResolvedValue({ assignedCustomers: 9, unassignedCustomers: 3 });
  });

  it("returns repository-backed customer and household diagnostics", async () => {
    const { getDatabaseStatus } = await import("@/lib/database-status");
    const status = await getDatabaseStatus();

    expect(status.status).toBe("connected");
    expect(status.customerCount).toBe(12);
    expect(status.activeCustomerCount).toBe(10);
    expect(status.inactiveCustomerCount).toBe(2);
    expect(status.demoCustomerCount).toBe(8);
    expect(status.sandboxCustomerCount).toBe(3);
    expect(status.productionCustomerCount).toBe(1);
    expect(status.searchableCustomerCount).toBe(12);
    expect(status.potentialDuplicateCustomerPairs).toBe(2);
    expect(status.householdCount).toBe(5);
    expect(status.customersAssignedToHouseholds).toBe(9);
    expect(status.customersWithoutHouseholds).toBe(3);
    expect(status.lastCustomerCreatedName).toBe("Nina Stone");
    expect(mocks.getCustomerActivityCounts).toHaveBeenCalledTimes(1);
    expect(mocks.getCustomerDataModeCounts).toHaveBeenCalledTimes(1);
    expect(mocks.getHouseholdRelationshipCounts).toHaveBeenCalledTimes(1);
  });
});
