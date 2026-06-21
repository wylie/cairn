import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { getCustomerCount } from "@/db/repositories/customer-repository";
import { getFacilityCount } from "@/db/repositories/facility-repository";
import { getHouseholdCount } from "@/db/repositories/household-repository";
import { getOrganizationCount } from "@/db/repositories/organization-repository";
import { getStaffFacilityAccessCount, getStaffRoleCount, getStaffUserCount } from "@/db/repositories/staff-repository";

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
  householdCount: number;
  tableCount: number;
  tableCounts: DatabaseTableCount[];
  lastMigrationTag: string | null;
  lastMigrationAt: string | null;
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
  householdCount?: number;
}): DatabaseStatus {
  const organizationCount = input.organizationCount ?? 0;
  const facilityCount = input.facilityCount ?? 0;
  const staffRoleCount = input.staffRoleCount ?? 0;
  const staffUserCount = input.staffUserCount ?? 0;
  const staffFacilityAccessCount = input.staffFacilityAccessCount ?? 0;
  const customerCount = input.customerCount ?? 0;
  const householdCount = input.householdCount ?? 0;
  const tableCounts = [
    { table: "organizations", records: organizationCount },
    { table: "facilities", records: facilityCount },
    { table: "staff_roles", records: staffRoleCount },
    { table: "staff_users", records: staffUserCount },
    { table: "staff_facility_access", records: staffFacilityAccessCount },
    { table: "customers", records: customerCount },
    { table: "households", records: householdCount }
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
    householdCount,
    tableCount: tableCounts.length,
    tableCounts,
    lastMigrationTag: migration.tag,
    lastMigrationAt: migration.at,
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
      householdCount
    ] = await Promise.all([
      getOrganizationCount(),
      getFacilityCount(),
      getStaffRoleCount(),
      getStaffUserCount(),
      getStaffFacilityAccessCount(),
      getCustomerCount(),
      getHouseholdCount()
    ]);

    return buildStatus({
      connected: true,
      organizationCount,
      facilityCount,
      staffRoleCount,
      staffUserCount,
      staffFacilityAccessCount,
      customerCount,
      householdCount
    });
  } catch {
    return disconnectedStatus();
  }
}

export function getDatabaseRecordTotal(status: DatabaseStatus) {
  return status.tableCounts.reduce((sum, entry) => sum + entry.records, 0);
}
