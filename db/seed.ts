import { sql } from "drizzle-orm";
import { customers, facilities, getDatabase, getSqlClient, households, organizations, staffFacilityAccess, staffRoles, staffUsers } from "./index";
import { seedCustomers, seedFacilities, seedHouseholds, seedOrganizations, seedStaffFacilityAccess, seedStaffRoles, seedStaffUsers } from "./seed-data";

async function main() {
  const database = getDatabase();
  const sqlClient = getSqlClient();

  if (!database || !sqlClient) {
    throw new Error("DATABASE_URL is required to seed organizations and facilities.");
  }

  await database
    .insert(organizations)
    .values([...seedOrganizations])
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        dataMode: sql`excluded.data_mode`,
        updatedAt: sql`now()`
      }
    });

  await database
    .insert(facilities)
    .values([...seedFacilities])
    .onConflictDoUpdate({
      target: facilities.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        updatedAt: sql`now()`
      }
    });

  await database
    .insert(staffRoles)
    .values([...seedStaffRoles])
    .onConflictDoUpdate({
      target: staffRoles.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        name: sql`excluded.name`
      }
    });

  await database
    .insert(staffUsers)
    .values([...seedStaffUsers])
    .onConflictDoUpdate({
      target: staffUsers.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        email: sql`excluded.email`,
        firstName: sql`excluded.first_name`,
        lastName: sql`excluded.last_name`,
        roleId: sql`excluded.role_id`,
        active: sql`excluded.active`,
        updatedAt: sql`now()`
      }
    });

  await database
    .insert(staffFacilityAccess)
    .values([...seedStaffFacilityAccess])
    .onConflictDoNothing({
      target: [staffFacilityAccess.staffUserId, staffFacilityAccess.facilityId]
    });

  await database
    .insert(households)
    .values([...seedHouseholds])
    .onConflictDoUpdate({
      target: households.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        name: sql`excluded.name`,
        primaryContactId: sql`excluded.primary_contact_id`,
        updatedAt: sql`now()`
      }
    });

  await database
    .insert(customers)
    .values([...seedCustomers])
    .onConflictDoUpdate({
      target: customers.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        householdId: sql`excluded.household_id`,
        firstName: sql`excluded.first_name`,
        lastName: sql`excluded.last_name`,
        preferredName: sql`excluded.preferred_name`,
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
        birthDate: sql`excluded.birth_date`,
        active: sql`excluded.active`,
        updatedAt: sql`now()`
      }
    });

  await sqlClient.end();
  console.log(
    `Seeded ${seedOrganizations.length} organizations, ${seedFacilities.length} facilities, ${seedStaffRoles.length} staff roles, ${seedStaffUsers.length} staff users, ${seedCustomers.length} customers, and ${seedHouseholds.length} households.`
  );
}

main().catch(async (error: unknown) => {
  const sqlClient = getSqlClient();
  await sqlClient?.end({ timeout: 1 });
  console.error(error);
  process.exit(1);
});
