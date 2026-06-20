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
    name: "Summit West",
    slug: "west"
  },
  {
    id: "loc_101",
    organizationId: "org_riverbend",
    name: "Riverbend Campus",
    slug: "riverbend-campus"
  },
  {
    id: "loc_201",
    organizationId: "org_western_carolina_ymca",
    name: "Hendersonville Family YMCA",
    slug: "hendersonville-family-ymca"
  },
  {
    id: "loc_202",
    organizationId: "org_western_carolina_ymca",
    name: "Reuter Family YMCA",
    slug: "reuter-family-ymca"
  },
  {
    id: "loc_203",
    organizationId: "org_western_carolina_ymca",
    name: "Asheville YMCA",
    slug: "asheville-ymca"
  }
] as const;
