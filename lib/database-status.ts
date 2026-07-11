import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import {
  getCustomerActivityCounts,
  getCustomerCount,
  getCustomerDataModeCounts,
  getLastCustomerCreated,
  getPotentialDuplicateCustomerPairCount
} from "@/db/repositories/customer-repository";
import { getFacilityCount } from "@/db/repositories/facility-repository";
import { getHouseholdCount, getHouseholdRelationshipCounts } from "@/db/repositories/household-repository";
import { getCheckInStatusCounts } from "@/db/repositories/check-in-repository";
import { getMembershipPlanCount, getMembershipStatusCounts } from "@/db/repositories/membership-repository";
import { getOrganizationCount } from "@/db/repositories/organization-repository";
import { getStaffFacilityAccessCount, getStaffRoleCount, getStaffUserCount } from "@/db/repositories/staff-repository";
import { seedCustomers } from "@/db/seed-data";

export type DatabaseTableCount = {
  table: string;
  records: number;
};

export type DatabaseStatus = {
  status: "connected" | "disconnected";
  organizationCount: number;
  facilityCount: number;
  staffRoleCount: number;
  staffUserCount: number;
  staffFacilityAccessCount: number;
  customerCount: number;
  activeCustomerCount: number;
  inactiveCustomerCount: number;
  demoCustomerCount: number;
  sandboxCustomerCount: number;
  productionCustomerCount: number;
  customerSeedCount: number;
  searchableCustomerCount: number;
  potentialDuplicateCustomerPairs: number;
  lastCustomerCreatedAt: string | null;
  lastCustomerCreatedName: string | null;
  householdCount: number;
  customersAssignedToHouseholds: number;
  customersWithoutHouseholds: number;
  membershipCount: number;
  membershipPlanCount: number;
  activeMembershipCount: number;
  expiredMembershipCount: number;
  suspendedMembershipCount: number;
  checkInsToday: number;
  currentlyCheckedIn: number;
  checkInHistoryCount: number;
  tableCount: number;
  tableCounts: DatabaseTableCount[];
  lastMigrationTag: string | null;
  lastMigrationAt: string | null;
  lastSeedRunAt: string | null;
  seedDataStatus: "Seeded" | "Partial" | "Empty" | "Unavailable";
  checkedAt: string;
};

type MigrationJournal = {
  entries?: Array<{
    tag?: string;
    when?: number;
  }>;
};

function getLastMigration() {
  try {
    const raw = readFileSync(join(process.cwd(), "db/migrations/meta/_journal.json"), "utf8");
    const journal = JSON.parse(raw) as MigrationJournal;
    const latest = journal.entries?.slice().sort((a, b) => (b.when ?? 0) - (a.when ?? 0))[0];
    if (!latest?.tag || !latest.when) return { tag: null, at: null };
    return { tag: latest.tag, at: new Date(latest.when).toISOString() };
  } catch {
    return { tag: null, at: null };
  }
}

function getSeedDataStatus(tableCounts: DatabaseTableCount[], connected: boolean): DatabaseStatus["seedDataStatus"] {
  if (!connected) return "Unavailable";
  const seededFoundationTables = tableCounts.filter((entry) =>
    ["organizations", "facilities", "staff_users", "customers", "households"].includes(entry.table)
  );
  const seededCount = seededFoundationTables.filter((entry) => entry.records > 0).length;
  if (seededCount === seededFoundationTables.length) return "Seeded";
  if (seededCount > 0) return "Partial";
  return "Empty";
}

function buildStatus(input: {
  connected: boolean;
  organizationCount?: number;
  facilityCount?: number;
  staffRoleCount?: number;
  staffUserCount?: number;
  staffFacilityAccessCount?: number;
  customerCount?: number;
  activeCustomerCount?: number;
  inactiveCustomerCount?: number;
  demoCustomerCount?: number;
  sandboxCustomerCount?: number;
  productionCustomerCount?: number;
  potentialDuplicateCustomerPairs?: number;
  lastCustomerCreatedAt?: string | null;
  lastCustomerCreatedName?: string | null;
  householdCount?: number;
  customersAssignedToHouseholds?: number;
  customersWithoutHouseholds?: number;
  membershipCount?: number;
  membershipPlanCount?: number;
  activeMembershipCount?: number;
  expiredMembershipCount?: number;
  suspendedMembershipCount?: number;
  checkInsToday?: number;
  currentlyCheckedIn?: number;
  checkInHistoryCount?: number;
}): DatabaseStatus {
  const organizationCount = input.organizationCount ?? 0;
  const facilityCount = input.facilityCount ?? 0;
  const staffRoleCount = input.staffRoleCount ?? 0;
  const staffUserCount = input.staffUserCount ?? 0;
  const staffFacilityAccessCount = input.staffFacilityAccessCount ?? 0;
  const customerCount = input.customerCount ?? 0;
  const activeCustomerCount = input.activeCustomerCount ?? 0;
  const inactiveCustomerCount = input.inactiveCustomerCount ?? 0;
  const demoCustomerCount = input.demoCustomerCount ?? 0;
  const sandboxCustomerCount = input.sandboxCustomerCount ?? 0;
  const productionCustomerCount = input.productionCustomerCount ?? 0;
  const customerSeedCount = seedCustomers.length;
  const potentialDuplicateCustomerPairs = input.potentialDuplicateCustomerPairs ?? 0;
  const householdCount = input.householdCount ?? 0;
  const customersAssignedToHouseholds = input.customersAssignedToHouseholds ?? 0;
  const customersWithoutHouseholds = input.customersWithoutHouseholds ?? 0;
  const membershipCount = input.membershipCount ?? 0;
  const membershipPlanCount = input.membershipPlanCount ?? 0;
  const activeMembershipCount = input.activeMembershipCount ?? 0;
  const expiredMembershipCount = input.expiredMembershipCount ?? 0;
  const suspendedMembershipCount = input.suspendedMembershipCount ?? 0;
  const checkInsToday = input.checkInsToday ?? 0;
  const currentlyCheckedIn = input.currentlyCheckedIn ?? 0;
  const checkInHistoryCount = input.checkInHistoryCount ?? 0;
  const tableCounts = [
    { table: "organizations", records: organizationCount },
    { table: "facilities", records: facilityCount },
    { table: "staff_roles", records: staffRoleCount },
    { table: "staff_users", records: staffUserCount },
    { table: "staff_facility_access", records: staffFacilityAccessCount },
    { table: "customers", records: customerCount },
    { table: "households", records: householdCount },
    { table: "membership_plans", records: membershipPlanCount },
    { table: "memberships", records: membershipCount },
    { table: "check_ins", records: checkInHistoryCount }
  ];
  const migration = getLastMigration();

  return {
    status: input.connected ? "connected" : "disconnected",
    organizationCount,
    facilityCount,
    staffRoleCount,
    staffUserCount,
    staffFacilityAccessCount,
    customerCount,
    activeCustomerCount,
    inactiveCustomerCount,
    demoCustomerCount,
    sandboxCustomerCount,
    productionCustomerCount,
    customerSeedCount,
    searchableCustomerCount: customerCount,
    potentialDuplicateCustomerPairs,
    lastCustomerCreatedAt: input.lastCustomerCreatedAt ?? null,
    lastCustomerCreatedName: input.lastCustomerCreatedName ?? null,
    householdCount,
    customersAssignedToHouseholds,
    customersWithoutHouseholds,
    membershipCount,
    membershipPlanCount,
    activeMembershipCount,
    expiredMembershipCount,
    suspendedMembershipCount,
    checkInsToday,
    currentlyCheckedIn,
    checkInHistoryCount,
    tableCount: tableCounts.length,
    tableCounts,
    lastMigrationTag: migration.tag,
    lastMigrationAt: migration.at,
    lastSeedRunAt: null,
    seedDataStatus: getSeedDataStatus(tableCounts, input.connected),
    checkedAt: new Date().toISOString()
  };
}

const disconnectedStatus = (): DatabaseStatus => ({
  ...buildStatus({ connected: false })
});

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const database = getDatabase();
  if (!database) return disconnectedStatus();

  try {
    await database.execute(sql`select 1`);
    const [
      organizationCount,
      facilityCount,
      staffRoleCount,
      staffUserCount,
      staffFacilityAccessCount,
      customerCount,
      customerActivityCounts,
      customerDataModeCounts,
      lastCustomer,
      potentialDuplicateCustomerPairs,
      householdCount,
      householdRelationshipCounts,
      membershipPlanCount,
      membershipStatusCounts,
      checkInStatusCounts
    ] = await Promise.all([
      getOrganizationCount(),
      getFacilityCount(),
      getStaffRoleCount(),
      getStaffUserCount(),
      getStaffFacilityAccessCount(),
      getCustomerCount(),
      getCustomerActivityCounts(),
      getCustomerDataModeCounts(),
      getLastCustomerCreated(),
      getPotentialDuplicateCustomerPairCount(),
      getHouseholdCount(),
      getHouseholdRelationshipCounts(),
      getMembershipPlanCount(),
      getMembershipStatusCounts(),
      getCheckInStatusCounts()
    ]);

    return buildStatus({
      connected: true,
      organizationCount,
      facilityCount,
      staffRoleCount,
      staffUserCount,
      staffFacilityAccessCount,
      customerCount,
      activeCustomerCount: customerActivityCounts.active,
      inactiveCustomerCount: customerActivityCounts.inactive,
      demoCustomerCount: customerDataModeCounts.demo,
      sandboxCustomerCount: customerDataModeCounts.sandbox,
      productionCustomerCount: customerDataModeCounts.production,
      potentialDuplicateCustomerPairs,
      lastCustomerCreatedAt: lastCustomer?.createdAt.toISOString() ?? null,
      lastCustomerCreatedName: lastCustomer ? `${lastCustomer.firstName} ${lastCustomer.lastName}` : null,
      householdCount,
      customersAssignedToHouseholds: householdRelationshipCounts.assignedCustomers,
      customersWithoutHouseholds: householdRelationshipCounts.unassignedCustomers,
      membershipCount: membershipStatusCounts.total,
      membershipPlanCount,
      activeMembershipCount: membershipStatusCounts.active,
      expiredMembershipCount: membershipStatusCounts.expired,
      suspendedMembershipCount: membershipStatusCounts.suspended,
      checkInsToday: checkInStatusCounts.today,
      currentlyCheckedIn: checkInStatusCounts.currentlyIn,
      checkInHistoryCount: checkInStatusCounts.history
    });
  } catch {
    return disconnectedStatus();
  }
}

export function getDatabaseRecordTotal(status: DatabaseStatus) {
  return status.tableCounts.reduce((sum, entry) => sum + entry.records, 0);
}
