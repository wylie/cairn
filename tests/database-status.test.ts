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
  getHouseholdRelationshipCounts: vi.fn(),
  getMembershipPlanCount: vi.fn(),
  getMembershipStatusCounts: vi.fn(),
  getCheckInStatusCounts: vi.fn(),
  getProgramStatusCounts: vi.fn()
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

vi.mock("@/db/repositories/membership-repository", () => ({
  getMembershipPlanCount: mocks.getMembershipPlanCount,
  getMembershipStatusCounts: mocks.getMembershipStatusCounts
}));

vi.mock("@/db/repositories/check-in-repository", () => ({
  getCheckInStatusCounts: mocks.getCheckInStatusCounts
}));

vi.mock("@/db/repositories/program-repository", () => ({
  getProgramStatusCounts: mocks.getProgramStatusCounts
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
    mocks.getMembershipPlanCount.mockResolvedValue(4);
    mocks.getMembershipStatusCounts.mockResolvedValue({ total: 11, active: 7, expired: 2, suspended: 1, cancelled: 1 });
    mocks.getCheckInStatusCounts.mockResolvedValue({ today: 8, currentlyIn: 3, history: 44 });
    mocks.getProgramStatusCounts.mockResolvedValue({ programs: 6, sessions: 14, registrations: 32, waitlists: 5 });
  });

  it("returns repository-backed customer, household, membership, check-in, and program diagnostics", async () => {
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
    expect(status.membershipPlanCount).toBe(4);
    expect(status.membershipCount).toBe(11);
    expect(status.activeMembershipCount).toBe(7);
    expect(status.expiredMembershipCount).toBe(2);
    expect(status.suspendedMembershipCount).toBe(1);
    expect(status.checkInsToday).toBe(8);
    expect(status.currentlyCheckedIn).toBe(3);
    expect(status.checkInHistoryCount).toBe(44);
    expect(status.programCount).toBe(6);
    expect(status.programSessionCount).toBe(14);
    expect(status.programRegistrationCount).toBe(32);
    expect(status.programWaitlistCount).toBe(5);
    expect(status.lastCustomerCreatedName).toBe("Nina Stone");
    expect(mocks.getCustomerActivityCounts).toHaveBeenCalledTimes(1);
    expect(mocks.getCustomerDataModeCounts).toHaveBeenCalledTimes(1);
    expect(mocks.getHouseholdRelationshipCounts).toHaveBeenCalledTimes(1);
    expect(mocks.getMembershipStatusCounts).toHaveBeenCalledTimes(1);
    expect(mocks.getCheckInStatusCounts).toHaveBeenCalledTimes(1);
    expect(mocks.getProgramStatusCounts).toHaveBeenCalledTimes(1);
  });
});
