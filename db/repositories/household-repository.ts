import "server-only";

import { and, asc, count, eq } from "drizzle-orm";
import { customers, getDatabase, households } from "@/db";

export type HouseholdRecord = typeof households.$inferSelect;
export type NewHouseholdRecord = typeof households.$inferInsert;
export type HouseholdMutationInput = Pick<NewHouseholdRecord, "id" | "organizationId" | "name" | "primaryContactId">;
export type HouseholdUpdateInput = Partial<Omit<HouseholdMutationInput, "id" | "organizationId">>;

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

export async function getHouseholdCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(households);
  return row?.value ?? 0;
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
