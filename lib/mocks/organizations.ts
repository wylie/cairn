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

export const defaultOrganization = organizations[0];
