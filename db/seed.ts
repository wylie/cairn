import { sql } from "drizzle-orm";
import { checkIns, customers, facilities, getDatabase, getSqlClient, households, membershipPlans, memberships, organizations, staffFacilityAccess, staffRoles, staffUsers } from "./index";
import {
  seedCheckIns,
  seedCustomers,
  seedFacilities,
  seedHouseholds,
  seedMembershipPlans,
  seedMemberships,
  seedOrganizations,
  seedStaffFacilityAccess,
  seedStaffRoles,
  seedStaffUsers
} from "./seed-data";

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
        pronouns: sql`excluded.pronouns`,
        customPronouns: sql`excluded.custom_pronouns`,
        memberId: sql`excluded.member_id`,
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
        addressLine1: sql`excluded.address_line_1`,
        addressLine2: sql`excluded.address_line_2`,
        city: sql`excluded.city`,
        state: sql`excluded.state`,
        postalCode: sql`excluded.postal_code`,
        birthDate: sql`excluded.birth_date`,
        emergencyContactName: sql`excluded.emergency_contact_name`,
        emergencyContactPhone: sql`excluded.emergency_contact_phone`,
        notes: sql`excluded.notes`,
        profilePhotoUrl: sql`excluded.profile_photo_url`,
        active: sql`excluded.active`,
        updatedAt: sql`now()`
      }
    });

  await database
    .insert(membershipPlans)
    .values([...seedMembershipPlans])
    .onConflictDoUpdate({
      target: membershipPlans.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        facilityId: sql`excluded.facility_id`,
        name: sql`excluded.name`,
        kind: sql`excluded.kind`,
        durationDays: sql`excluded.duration_days`,
        priceCents: sql`excluded.price_cents`,
        active: sql`excluded.active`,
        updatedAt: sql`now()`
      }
    });

  await database
    .insert(memberships)
    .values([...seedMemberships])
    .onConflictDoUpdate({
      target: memberships.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        facilityId: sql`excluded.facility_id`,
        planId: sql`excluded.plan_id`,
        ownerType: sql`excluded.owner_type`,
        customerId: sql`excluded.customer_id`,
        householdId: sql`excluded.household_id`,
        status: sql`excluded.status`,
        startsOn: sql`excluded.starts_on`,
        expiresOn: sql`excluded.expires_on`,
        notes: sql`excluded.notes`,
        updatedAt: sql`now()`
      }
    });

  await database
    .insert(checkIns)
    .values(
      seedCheckIns.map((entry) => ({
        ...entry,
        checkedInAt: new Date(entry.checkedInAt),
        checkedOutAt: entry.checkedOutAt ? new Date(entry.checkedOutAt) : null
      }))
    )
    .onConflictDoUpdate({
      target: checkIns.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        facilityId: sql`excluded.facility_id`,
        customerId: sql`excluded.customer_id`,
        membershipId: sql`excluded.membership_id`,
        checkedInAt: sql`excluded.checked_in_at`,
        checkedOutAt: sql`excluded.checked_out_at`,
        status: sql`excluded.status`,
        accessStatus: sql`excluded.access_status`,
        checkedInByStaffId: sql`excluded.checked_in_by_staff_id`,
        checkedInByStaffName: sql`excluded.checked_in_by_staff_name`,
        checkedOutByStaffId: sql`excluded.checked_out_by_staff_id`,
        checkedOutByStaffName: sql`excluded.checked_out_by_staff_name`
      }
    });

  await sqlClient.end();
  console.log(
    `Seeded ${seedOrganizations.length} organizations, ${seedFacilities.length} facilities, ${seedStaffRoles.length} staff roles, ${seedStaffUsers.length} staff users, ${seedCustomers.length} customers, ${seedHouseholds.length} households, ${seedMembershipPlans.length} membership plans, ${seedMemberships.length} memberships, and ${seedCheckIns.length} check-ins.`
  );
}

main().catch(async (error: unknown) => {
  const sqlClient = getSqlClient();
  await sqlClient?.end({ timeout: 1 });
  console.error(error);
  process.exit(1);
});
