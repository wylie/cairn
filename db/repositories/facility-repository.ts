import "server-only";

import { and, count, eq } from "drizzle-orm";
import { facilities, getDatabase } from "@/db";

export type FacilityRecord = typeof facilities.$inferSelect;

export async function getFacilityBySlug(organizationId: string, slug: string): Promise<FacilityRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [facility] = await database
    .select()
    .from(facilities)
    .where(and(eq(facilities.organizationId, organizationId), eq(facilities.slug, slug)))
    .limit(1);

  return facility ?? null;
}

export async function getFacilitiesForOrganization(organizationId: string): Promise<FacilityRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  return database.select().from(facilities).where(eq(facilities.organizationId, organizationId)).orderBy(facilities.name);
}

export async function getFacilityCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(facilities);
  return row?.value ?? 0;
}
