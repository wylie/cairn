import type { Location } from "@/types/domain";

export const locations: Location[] = [
  {
    id: "loc_001",
    organizationId: "org_summit",
    name: "Summit Downtown",
    shortName: "Downtown",
    addressLine1: "120 Spring St",
    city: "New York",
    state: "NY",
    phone: "(212) 555-1001",
    active: true,
    isDefault: true
  },
  {
    id: "loc_002",
    organizationId: "org_summit",
    name: "Summit Uptown",
    shortName: "Uptown",
    addressLine1: "88 Riverside Dr",
    city: "Jersey City",
    state: "NJ",
    phone: "(201) 555-1002",
    active: true,
    isDefault: false
  }
];
