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

export const seedStaffRoles = [
  { id: "role_summit_owner", organizationId: "org_summit", name: "Owner" },
  { id: "role_summit_operations_manager", organizationId: "org_summit", name: "Operations Manager" },
  { id: "role_summit_front_desk_supervisor", organizationId: "org_summit", name: "Front Desk Supervisor" },
  { id: "role_riverbend_executive_director", organizationId: "org_riverbend", name: "Executive Director" },
  { id: "role_riverbend_program_coordinator", organizationId: "org_riverbend", name: "Program Coordinator" },
  { id: "role_wcymca_association_director", organizationId: "org_western_carolina_ymca", name: "Association Director" },
  { id: "role_wcymca_branch_director", organizationId: "org_western_carolina_ymca", name: "Branch Director" },
  { id: "role_wcymca_membership_director", organizationId: "org_western_carolina_ymca", name: "Membership Director" }
] as const;

export const seedStaffUsers = [
  {
    id: "staff_summit_taylor_nguyen",
    organizationId: "org_summit",
    email: "taylor@summitrec.co",
    firstName: "Taylor",
    lastName: "Nguyen",
    roleId: "role_summit_owner",
    active: true
  },
  {
    id: "staff_summit_jordan_kim",
    organizationId: "org_summit",
    email: "jordan@summitrec.co",
    firstName: "Jordan",
    lastName: "Kim",
    roleId: "role_summit_operations_manager",
    active: true
  },
  {
    id: "staff_summit_casey_martinez",
    organizationId: "org_summit",
    email: "casey@summitrec.co",
    firstName: "Casey",
    lastName: "Martinez",
    roleId: "role_summit_front_desk_supervisor",
    active: true
  },
  {
    id: "staff_riverbend_morgan_ellis",
    organizationId: "org_riverbend",
    email: "morgan@riverbend.example",
    firstName: "Morgan",
    lastName: "Ellis",
    roleId: "role_riverbend_executive_director",
    active: true
  },
  {
    id: "staff_riverbend_avery_patel",
    organizationId: "org_riverbend",
    email: "avery@riverbend.example",
    firstName: "Avery",
    lastName: "Patel",
    roleId: "role_riverbend_program_coordinator",
    active: true
  },
  {
    id: "staff_wcymca_ben_johnson",
    organizationId: "org_western_carolina_ymca",
    email: "ben.johnson@westerncarolinaymca.example",
    firstName: "Ben",
    lastName: "Johnson",
    roleId: "role_wcymca_association_director",
    active: true
  },
  {
    id: "staff_wcymca_sarah_wilson",
    organizationId: "org_western_carolina_ymca",
    email: "sarah.wilson@westerncarolinaymca.example",
    firstName: "Sarah",
    lastName: "Wilson",
    roleId: "role_wcymca_branch_director",
    active: true
  },
  {
    id: "staff_wcymca_chris_miller",
    organizationId: "org_western_carolina_ymca",
    email: "chris.miller@westerncarolinaymca.example",
    firstName: "Chris",
    lastName: "Miller",
    roleId: "role_wcymca_membership_director",
    active: true
  }
] as const;

export const seedStaffFacilityAccess = [
  { staffUserId: "staff_summit_taylor_nguyen", facilityId: "loc_001" },
  { staffUserId: "staff_summit_taylor_nguyen", facilityId: "loc_002" },
  { staffUserId: "staff_summit_jordan_kim", facilityId: "loc_001" },
  { staffUserId: "staff_summit_jordan_kim", facilityId: "loc_002" },
  { staffUserId: "staff_summit_casey_martinez", facilityId: "loc_001" },
  { staffUserId: "staff_riverbend_morgan_ellis", facilityId: "loc_101" },
  { staffUserId: "staff_riverbend_avery_patel", facilityId: "loc_101" },
  { staffUserId: "staff_wcymca_ben_johnson", facilityId: "loc_201" },
  { staffUserId: "staff_wcymca_ben_johnson", facilityId: "loc_202" },
  { staffUserId: "staff_wcymca_ben_johnson", facilityId: "loc_203" },
  { staffUserId: "staff_wcymca_sarah_wilson", facilityId: "loc_202" },
  { staffUserId: "staff_wcymca_chris_miller", facilityId: "loc_201" },
  { staffUserId: "staff_wcymca_chris_miller", facilityId: "loc_203" }
] as const;
