import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { getCustomerCount } from "@/db/repositories/customer-repository";
import { getFacilityCount } from "@/db/repositories/facility-repository";
import { getHouseholdCount } from "@/db/repositories/household-repository";
import { getOrganizationCount } from "@/db/repositories/organization-repository";
import { getStaffUserCount } from "@/db/repositories/staff-repository";

export type DatabaseStatus = {
  status: "connected" | "disconnected";
  organizationCount: number;
  facilityCount: number;
  staffUserCount: number;
  customerCount: number;
  householdCount: number;
  checkedAt: string;
};

const disconnectedStatus = (): DatabaseStatus => ({
  status: "disconnected",
  organizationCount: 0,
  facilityCount: 0,
  staffUserCount: 0,
  customerCount: 0,
  householdCount: 0,
  checkedAt: new Date().toISOString()
});

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const database = getDatabase();
  if (!database) return disconnectedStatus();

  try {
    await database.execute(sql`select 1`);
    const [organizationCount, facilityCount, staffUserCount, customerCount, householdCount] = await Promise.all([
      getOrganizationCount(),
      getFacilityCount(),
      getStaffUserCount(),
      getCustomerCount(),
      getHouseholdCount()
    ]);

    return {
      status: "connected",
      organizationCount,
      facilityCount,
      staffUserCount,
      customerCount,
      householdCount,
      checkedAt: new Date().toISOString()
    };
  } catch {
    return disconnectedStatus();
  }
}

export function getDatabaseRecordTotal(status: DatabaseStatus) {
  return status.organizationCount + status.facilityCount + status.staffUserCount + status.customerCount + status.householdCount;
}
