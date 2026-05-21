import type { Organization } from "@/types/domain";

export const organizations: Organization[] = [
  {
    id: "org_summit",
    name: "Summit Rec Collective",
    facilityType: "hybrid",
    timezone: "America/New_York"
  }
];

export const defaultOrganization = organizations[0];
