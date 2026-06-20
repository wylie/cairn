export const seedOrganizations = [
  {
    id: "org_summit",
    name: "Summit Rec Collective",
    slug: "summit"
  },
  {
    id: "org_riverbend",
    name: "Riverstone Nature Center",
    slug: "riverbend"
  },
  {
    id: "org_western_carolina_ymca",
    name: "Western Carolina YMCA Association",
    slug: "western-carolina-ymca"
  }
] as const;

export const seedFacilities = [
  {
    id: "loc_001",
    organizationId: "org_summit",
    name: "Summit Downtown",
    slug: "downtown"
  },
  {
    id: "loc_002",
    organizationId: "org_summit",
    name: "Summit Uptown",
    slug: "uptown"
  },
  {
    id: "loc_101",
    organizationId: "org_riverbend",
    name: "Riverstone Main",
    slug: "main"
  },
  {
    id: "loc_102",
    organizationId: "org_riverbend",
    name: "Riverstone Trail Center",
    slug: "trail-center"
  },
  {
    id: "loc_201",
    organizationId: "org_western_carolina_ymca",
    name: "Western Carolina YMCA Main Branch",
    slug: "main-branch"
  },
  {
    id: "loc_202",
    organizationId: "org_western_carolina_ymca",
    name: "Western Carolina YMCA Aquatics Center",
    slug: "aquatics-center"
  }
] as const;
