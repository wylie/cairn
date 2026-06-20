import "server-only";

import { and, eq } from "drizzle-orm";
import { facilities, getDatabase, organizations } from "./index";
import { seedFacilities, seedOrganizations } from "./seed-data";

export type OrganizationRecord = typeof organizations.$inferSelect;
export type FacilityRecord = typeof facilities.$inferSelect;

export interface ActiveFacilityContext {
  organization: OrganizationRecord;
  facilities: FacilityRecord[];
  activeFacility: FacilityRecord | null;
  source: "database" | "fallback";
}

const fallbackTimestamp = new Date(0);

function seedOrganizationToRecord(seed: (typeof seedOrganizations)[number]): OrganizationRecord {
  return {
    ...seed,
    createdAt: fallbackTimestamp,
    updatedAt: fallbackTimestamp
  };
}

function seedFacilityToRecord(seed: (typeof seedFacilities)[number]): FacilityRecord {
  return {
    ...seed,
    createdAt: fallbackTimestamp,
    updatedAt: fallbackTimestamp
  };
}

function fallbackOrganizationBySlug(slug: string) {
  const seed = seedOrganizations.find((entry) => entry.slug === slug);
  return seed ? seedOrganizationToRecord(seed) : null;
}

function fallbackFacilitiesByOrganization(organizationId: string) {
  return seedFacilities.filter((entry) => entry.organizationId === organizationId).map(seedFacilityToRecord);
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationRecord | null> {
  const database = getDatabase();
  if (!database) return fallbackOrganizationBySlug(slug);

  try {
    const [organization] = await database.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
    return organization ?? fallbackOrganizationBySlug(slug);
  } catch {
    return fallbackOrganizationBySlug(slug);
  }
}

export async function getFacilitiesByOrganization(organizationId: string): Promise<FacilityRecord[]> {
  const database = getDatabase();
  if (!database) return fallbackFacilitiesByOrganization(organizationId);

  try {
    const rows = await database.select().from(facilities).where(eq(facilities.organizationId, organizationId));
    return rows.length > 0 ? rows : fallbackFacilitiesByOrganization(organizationId);
  } catch {
    return fallbackFacilitiesByOrganization(organizationId);
  }
}

export async function getFacilityBySlug(organizationSlug: string, facilitySlug: string): Promise<FacilityRecord | null> {
  const organization = await getOrganizationBySlug(organizationSlug);
  if (!organization) return null;

  const database = getDatabase();
  if (!database) {
    return fallbackFacilitiesByOrganization(organization.id).find((entry) => entry.slug === facilitySlug) ?? null;
  }

  try {
    const [facility] = await database
      .select()
      .from(facilities)
      .where(and(eq(facilities.organizationId, organization.id), eq(facilities.slug, facilitySlug)))
      .limit(1);
    return facility ?? fallbackFacilitiesByOrganization(organization.id).find((entry) => entry.slug === facilitySlug) ?? null;
  } catch {
    return fallbackFacilitiesByOrganization(organization.id).find((entry) => entry.slug === facilitySlug) ?? null;
  }
}

export async function getActiveFacilityContext(organizationSlug: string, facilitySlug?: string): Promise<ActiveFacilityContext | null> {
  const organization = await getOrganizationBySlug(organizationSlug);
  if (!organization) return null;

  const database = getDatabase();
  const facilitiesForOrganization = await getFacilitiesByOrganization(organization.id);
  const activeFacility = facilitySlug
    ? facilitiesForOrganization.find((facility) => facility.slug === facilitySlug) ?? null
    : facilitiesForOrganization[0] ?? null;

  return {
    organization,
    facilities: facilitiesForOrganization,
    activeFacility,
    source: database ? "database" : "fallback"
  };
}
