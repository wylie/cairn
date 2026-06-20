import "server-only";

import { asc, count, eq } from "drizzle-orm";
import { getDatabase, households } from "@/db";

export type HouseholdRecord = typeof households.$inferSelect;

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

export async function getHouseholdCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(households);
  return row?.value ?? 0;
}
