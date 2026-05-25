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
    id: "org_fiddlehead",
    slug: "fiddlehead",
    name: "Fiddlehead Farm & Forest",
    facilityType: "camp",
    timezone: "America/New_York"
  }
];

export const defaultOrganization = organizations[0];
