import "server-only";

import { asc, count, eq } from "drizzle-orm";
import { facilities, getDatabase, organizations, staffFacilityAccess, staffRoles, staffUsers } from "@/db";

export type StaffUserRecord = typeof staffUsers.$inferSelect;

export type StaffUserDirectoryRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  active: boolean;
};

function selectDirectoryRows() {
  return {
    id: staffUsers.id,
    organizationId: staffUsers.organizationId,
    organizationName: organizations.name,
    email: staffUsers.email,
    firstName: staffUsers.firstName,
    lastName: staffUsers.lastName,
    roleName: staffRoles.name,
    active: staffUsers.active
  };
}

export async function getStaffUser(staffUserId: string): Promise<StaffUserDirectoryRow | null> {
  const database = getDatabase();
  if (!database) return null;

  const [staffUser] = await database
    .select(selectDirectoryRows())
    .from(staffUsers)
    .innerJoin(organizations, eq(staffUsers.organizationId, organizations.id))
    .leftJoin(staffRoles, eq(staffUsers.roleId, staffRoles.id))
    .where(eq(staffUsers.id, staffUserId))
    .limit(1);

  return staffUser ? { ...staffUser, roleName: staffUser.roleName ?? "Unassigned" } : null;
}

export async function getStaffUsers(): Promise<StaffUserDirectoryRow[]> {
  const database = getDatabase();
  if (!database) return [];

  const rows = await database
    .select(selectDirectoryRows())
    .from(staffUsers)
    .innerJoin(organizations, eq(staffUsers.organizationId, organizations.id))
    .leftJoin(staffRoles, eq(staffUsers.roleId, staffRoles.id))
    .orderBy(asc(organizations.name), asc(staffUsers.lastName), asc(staffUsers.firstName));

  return rows.map((row) => ({ ...row, roleName: row.roleName ?? "Unassigned" }));
}

export async function getStaffUsersByOrganization(organizationId: string): Promise<StaffUserDirectoryRow[]> {
  const database = getDatabase();
  if (!database) return [];

  const rows = await database
    .select(selectDirectoryRows())
    .from(staffUsers)
    .innerJoin(organizations, eq(staffUsers.organizationId, organizations.id))
    .leftJoin(staffRoles, eq(staffUsers.roleId, staffRoles.id))
    .where(eq(staffUsers.organizationId, organizationId))
    .orderBy(asc(staffUsers.lastName), asc(staffUsers.firstName));

  return rows.map((row) => ({ ...row, roleName: row.roleName ?? "Unassigned" }));
}

export async function getStaffUsersByFacility(facilityId: string): Promise<StaffUserDirectoryRow[]> {
  const database = getDatabase();
  if (!database) return [];

  const rows = await database
    .select(selectDirectoryRows())
    .from(staffUsers)
    .innerJoin(staffFacilityAccess, eq(staffUsers.id, staffFacilityAccess.staffUserId))
    .innerJoin(facilities, eq(staffFacilityAccess.facilityId, facilities.id))
    .innerJoin(organizations, eq(staffUsers.organizationId, organizations.id))
    .leftJoin(staffRoles, eq(staffUsers.roleId, staffRoles.id))
    .where(eq(facilities.id, facilityId))
    .orderBy(asc(staffUsers.lastName), asc(staffUsers.firstName));

  return rows.map((row) => ({ ...row, roleName: row.roleName ?? "Unassigned" }));
}

export async function getStaffUserCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(staffUsers);
  return row?.value ?? 0;
}
