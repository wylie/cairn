import type { Organization } from "@/types/domain";

export const organizations: Organization[] = [
  {
    id: "org_summit",
    slug: "summit",
    name: "Summit Rec Collective",
    facilityType: "hybrid",
    timezone: "America/New_York"
  },
  {
    id: "org_riverbend",
    slug: "riverbend",
    name: "Riverbend Recreation Collective",
    facilityType: "camp",
    timezone: "America/New_York"
  }
];

export const demoOrganizationIds = organizations.map((entry) => entry.id);
export const demoOrganizationSlugs = organizations.map((entry) => entry.slug);

export function isDemoOrganizationId(organizationId: string) {
  return demoOrganizationIds.includes(organizationId);
}

export function isDemoOrganizationSlug(orgSlug: string) {
  return demoOrganizationSlugs.includes(orgSlug);
}

export const defaultOrganization = organizations[0];
