import "server-only";

import { count, eq } from "drizzle-orm";
import { getDatabase, organizations } from "@/db";

export type OrganizationRecord = typeof organizations.$inferSelect;
export type OrganizationDataMode = OrganizationRecord["dataMode"];

export function isDemoOrganization(organization: Pick<OrganizationRecord, "dataMode"> | null | undefined) {
  return organization?.dataMode === "demo";
}

export function isSandboxOrganization(organization: Pick<OrganizationRecord, "dataMode"> | null | undefined) {
  return organization?.dataMode === "sandbox";
}

export function isProductionOrganization(organization: Pick<OrganizationRecord, "dataMode"> | null | undefined) {
  return organization?.dataMode === "production";
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [organization] = await database.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return organization ?? null;
}

export async function getOrganizations(): Promise<OrganizationRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  return database.select().from(organizations).orderBy(organizations.name);
}

export async function getOrganizationCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(organizations);
  return row?.value ?? 0;
}
