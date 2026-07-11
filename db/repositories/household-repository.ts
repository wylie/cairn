import "server-only";

import { and, asc, count, eq, ilike, isNotNull, isNull } from "drizzle-orm";
import { customers, getDatabase, households } from "@/db";
import type { CustomerRecord } from "@/db/repositories/customer-repository";

export type HouseholdRecord = typeof households.$inferSelect;
export type NewHouseholdRecord = typeof households.$inferInsert;
export type HouseholdMutationInput = Pick<NewHouseholdRecord, "id" | "organizationId" | "name" | "primaryContactId">;
export type HouseholdUpdateInput = Partial<Omit<HouseholdMutationInput, "id" | "organizationId">>;
export type HouseholdRelationshipCounts = {
  assignedCustomers: number;
  unassignedCustomers: number;
};

export async function getHousehold(householdId: string): Promise<HouseholdRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [household] = await database.select().from(households).where(eq(households.id, householdId)).limit(1);
  return household ?? null;
}

export async function getHouseholds(): Promise<HouseholdRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  return database.select().from(households).orderBy(asc(households.name));
}

export async function getHouseholdsByOrganization(organizationId: string): Promise<HouseholdRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  return database.select().from(households).where(eq(households.organizationId, organizationId)).orderBy(asc(households.name));
}

export async function getHouseholdByOrganization(householdId: string, organizationId: string): Promise<HouseholdRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [household] = await database
    .select()
    .from(households)
    .where(and(eq(households.id, householdId), eq(households.organizationId, organizationId)))
    .limit(1);
  return household ?? null;
}

export async function findHouseholdByName(organizationId: string, name: string): Promise<HouseholdRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [household] = await database
    .select()
    .from(households)
    .where(and(eq(households.organizationId, organizationId), ilike(households.name, name.trim())))
    .limit(1);
  return household ?? null;
}

export async function getHouseholdMembers(householdId: string, organizationId: string): Promise<CustomerRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  return database
    .select()
    .from(customers)
    .where(and(eq(customers.organizationId, organizationId), eq(customers.householdId, householdId)))
    .orderBy(asc(customers.lastName), asc(customers.firstName));
}

export async function getHouseholdCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(households);
  return row?.value ?? 0;
}

export async function getHouseholdRelationshipCounts(): Promise<HouseholdRelationshipCounts> {
  const database = getDatabase();
  if (!database) return { assignedCustomers: 0, unassignedCustomers: 0 };

  const [assignedRow, unassignedRow] = await Promise.all([
    database.select({ value: count() }).from(customers).where(isNotNull(customers.householdId)),
    database.select({ value: count() }).from(customers).where(isNull(customers.householdId))
  ]);

  return {
    assignedCustomers: assignedRow[0]?.value ?? 0,
    unassignedCustomers: unassignedRow[0]?.value ?? 0
  };
}

export async function createHousehold(input: HouseholdMutationInput): Promise<HouseholdRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [household] = await database.insert(households).values(input).returning();
  if (household?.primaryContactId) {
    await database
      .update(customers)
      .set({ householdId: household.id, updatedAt: new Date() })
      .where(and(eq(customers.id, household.primaryContactId), eq(customers.organizationId, household.organizationId)));
  }
  return household ?? null;
}

export async function updateHousehold(
  householdId: string,
  organizationId: string,
  input: HouseholdUpdateInput
): Promise<HouseholdRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [household] = await database
    .update(households)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(households.id, householdId), eq(households.organizationId, organizationId)))
    .returning();

  if (household?.primaryContactId) {
    await database
      .update(customers)
      .set({ householdId: household.id, updatedAt: new Date() })
      .where(and(eq(customers.id, household.primaryContactId), eq(customers.organizationId, household.organizationId)));
  }

  return household ?? null;
}

export async function addCustomerToHousehold(
  householdId: string,
  organizationId: string,
  customerId: string
): Promise<CustomerRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const household = await getHouseholdByOrganization(householdId, organizationId);
  if (!household) return null;

  const [existingCustomer] = await database
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .limit(1);
  if (!existingCustomer || existingCustomer.householdId) return null;

  const [customer] = await database
    .update(customers)
    .set({ householdId, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .returning();

  if (customer && !household.primaryContactId) {
    await setHouseholdPrimaryContact(householdId, organizationId, customerId);
  }

  return customer ?? null;
}

export async function removeCustomerFromHousehold(
  householdId: string,
  organizationId: string,
  customerId: string
): Promise<CustomerRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const household = await getHouseholdByOrganization(householdId, organizationId);
  if (!household) return null;

  const [customer] = await database
    .update(customers)
    .set({ householdId: null, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId), eq(customers.householdId, householdId)))
    .returning();

  if (!customer) return null;

  if (household.primaryContactId === customerId) {
    const [nextPrimary] = await database
      .select()
      .from(customers)
      .where(and(eq(customers.organizationId, organizationId), eq(customers.householdId, householdId)))
      .orderBy(asc(customers.lastName), asc(customers.firstName))
      .limit(1);

    await database
      .update(households)
      .set({ primaryContactId: nextPrimary?.id ?? null, updatedAt: new Date() })
      .where(and(eq(households.id, householdId), eq(households.organizationId, organizationId)));
  }

  return customer;
}

export async function setHouseholdPrimaryContact(
  householdId: string,
  organizationId: string,
  customerId: string | null
): Promise<HouseholdRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  if (customerId) {
    const [customer] = await database
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId), eq(customers.householdId, householdId)))
      .limit(1);
    if (!customer) return null;
  }

  const [household] = await database
    .update(households)
    .set({ primaryContactId: customerId, updatedAt: new Date() })
    .where(and(eq(households.id, householdId), eq(households.organizationId, organizationId)))
    .returning();

  return household ?? null;
}

export async function deleteHousehold(householdId: string, organizationId: string): Promise<boolean> {
  const database = getDatabase();
  if (!database) return false;

  await database
    .update(customers)
    .set({ householdId: null, updatedAt: new Date() })
    .where(and(eq(customers.householdId, householdId), eq(customers.organizationId, organizationId)));

  const deleted = await database
    .delete(households)
    .where(and(eq(households.id, householdId), eq(households.organizationId, organizationId)))
    .returning({ id: households.id });

  return deleted.length > 0;
}
