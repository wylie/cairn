export const seedOrganizations = [
  {
    id: "org_summit",
    name: "Summit Rec Collective",
    slug: "summit",
    dataMode: "demo"
  },
  {
    id: "org_riverbend",
    name: "Riverstone Nature Center",
    slug: "riverbend",
    dataMode: "demo"
  },
  {
    id: "org_western_carolina_ymca",
    name: "Western Carolina YMCA Association",
    slug: "western-carolina-ymca",
    dataMode: "demo"
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

export const seedHouseholds = [
  {
    id: "hh_001",
    organizationId: "org_summit",
    name: "Fisher Household",
    primaryContactId: "cust_003"
  },
  {
    id: "hh_002",
    organizationId: "org_summit",
    name: "Brooks Household",
    primaryContactId: "cust_005"
  },
  {
    id: "hh_003",
    organizationId: "org_summit",
    name: "Patel-James Household",
    primaryContactId: "cust_001"
  },
  {
    id: "hh_summit_nguyen",
    organizationId: "org_summit",
    name: "Nguyen Household",
    primaryContactId: "cust_staff_001"
  },
  {
    id: "hh_riverbend_001",
    organizationId: "org_riverbend",
    name: "Bennett Household",
    primaryContactId: "cust_rb_001"
  },
  {
    id: "hh_riverbend_002",
    organizationId: "org_riverbend",
    name: "Parker Household",
    primaryContactId: "cust_rb_006"
  },
  {
    id: "hh_wcymca_001",
    organizationId: "org_western_carolina_ymca",
    name: "Johnson Household",
    primaryContactId: "cust_wcymca_001"
  },
  {
    id: "hh_wcymca_002",
    organizationId: "org_western_carolina_ymca",
    name: "Martinez Household",
    primaryContactId: "cust_wcymca_003"
  }
] as const;

export const seedCustomers = [
  {
    id: "cust_001",
    organizationId: "org_summit",
    householdId: "hh_003",
    firstName: "Maya",
    lastName: "Patel",
    preferredName: "Maya",
    email: "maya.patel@example.com",
    phone: "(212) 555-0112",
    birthDate: "1993-04-18",
    active: true
  },
  {
    id: "cust_002",
    organizationId: "org_summit",
    householdId: "hh_001",
    firstName: "Jordan",
    lastName: "Kim",
    preferredName: "Jordy",
    email: "jordan.kim@example.com",
    phone: "(917) 555-0180",
    birthDate: "1996-08-09",
    active: true
  },
  {
    id: "cust_003",
    organizationId: "org_summit",
    householdId: "hh_001",
    firstName: "Alex",
    lastName: "Rivera",
    preferredName: "Alex",
    email: "alex.rivera@example.com",
    phone: "(646) 555-0144",
    birthDate: "1989-02-02",
    active: true
  },
  {
    id: "cust_004",
    organizationId: "org_summit",
    householdId: "hh_001",
    firstName: "Oslo",
    lastName: "Fisher",
    preferredName: "Oslo",
    email: "oslo.fisher@example.com",
    phone: "(212) 555-0199",
    birthDate: "2014-11-21",
    active: true
  },
  {
    id: "cust_005",
    organizationId: "org_summit",
    householdId: "hh_002",
    firstName: "Dana",
    lastName: "Brooks",
    preferredName: "Dana",
    email: "dana.brooks@example.com",
    phone: "(212) 555-0177",
    birthDate: "1998-05-12",
    active: true
  },
  {
    id: "cust_006",
    organizationId: "org_summit",
    householdId: "hh_003",
    firstName: "Miles",
    lastName: "James",
    preferredName: "Miles",
    email: "miles.james@example.com",
    phone: "(828) 555-0106",
    birthDate: "1992-09-14",
    active: true
  },
  {
    id: "cust_007",
    organizationId: "org_summit",
    householdId: null,
    firstName: "Riley",
    lastName: "Morgan",
    preferredName: "Riley",
    email: "riley.morgan@example.com",
    phone: "(718) 555-0165",
    birthDate: "1991-06-20",
    active: true
  },
  {
    id: "cust_staff_001",
    organizationId: "org_summit",
    householdId: "hh_summit_nguyen",
    firstName: "Taylor",
    lastName: "Nguyen",
    preferredName: "Taylor",
    email: "taylor.nguyen@example.com",
    phone: "(212) 555-3001",
    birthDate: "1988-03-14",
    active: true
  },
  {
    id: "cust_staff_002",
    organizationId: "org_summit",
    householdId: null,
    firstName: "Maya",
    lastName: "Lopez",
    preferredName: "Maya",
    email: "maya.lopez@example.com",
    phone: "(212) 555-3002",
    birthDate: "1991-07-29",
    active: true
  },
  {
    id: "cust_staff_003",
    organizationId: "org_summit",
    householdId: null,
    firstName: "Sam",
    lastName: "Rivera",
    preferredName: "Sam",
    email: "sam.rivera@example.com",
    phone: "(212) 555-3003",
    birthDate: "1995-10-02",
    active: true
  },
  {
    id: "cust_staff_004",
    organizationId: "org_summit",
    householdId: null,
    firstName: "Jordan",
    lastName: "Kim",
    preferredName: "Jordan",
    email: "jordan.kim.staff@example.com",
    phone: "(212) 555-3004",
    birthDate: "1994-01-12",
    active: true
  },
  {
    id: "cust_staff_008",
    organizationId: "org_summit",
    householdId: null,
    firstName: "Iris",
    lastName: "Chen",
    preferredName: "Iris",
    email: "iris.chen@example.com",
    phone: "(212) 555-3008",
    birthDate: "1994-06-12",
    active: false
  },
  {
    id: "cust_rb_001",
    organizationId: "org_riverbend",
    householdId: "hh_riverbend_001",
    firstName: "Avery",
    lastName: "Morgan",
    preferredName: "Avery",
    email: "avery.morgan@example.com",
    phone: "(828) 555-4201",
    birthDate: "1987-05-06",
    active: true
  },
  {
    id: "cust_rb_002",
    organizationId: "org_riverbend",
    householdId: "hh_riverbend_001",
    firstName: "Luca",
    lastName: "Bennett",
    preferredName: "Luca",
    email: "luca.bennett@example.com",
    phone: "(828) 555-4202",
    birthDate: "2012-07-19",
    active: true
  },
  {
    id: "cust_rb_003",
    organizationId: "org_riverbend",
    householdId: null,
    firstName: "Nora",
    lastName: "Fields",
    preferredName: "Nora",
    email: "nora.fields@example.com",
    phone: "(828) 555-4213",
    birthDate: "1979-12-03",
    active: true
  },
  {
    id: "cust_rb_004",
    organizationId: "org_riverbend",
    householdId: null,
    firstName: "Eli",
    lastName: "Hart",
    preferredName: "Eli",
    email: "eli.hart@example.com",
    phone: "(828) 555-4214",
    birthDate: "2009-04-27",
    active: true
  },
  {
    id: "cust_rb_005",
    organizationId: "org_riverbend",
    householdId: null,
    firstName: "Camila",
    lastName: "Reed",
    preferredName: "Cami",
    email: "camila.reed@example.com",
    phone: "(828) 555-4215",
    birthDate: "1990-09-08",
    active: true
  },
  {
    id: "cust_rb_006",
    organizationId: "org_riverbend",
    householdId: "hh_riverbend_002",
    firstName: "Theo",
    lastName: "Parker",
    preferredName: "Theo",
    email: "theo.parker@example.com",
    phone: "(828) 555-4216",
    birthDate: "1984-02-22",
    active: false
  },
  {
    id: "cust_wcymca_001",
    organizationId: "org_western_carolina_ymca",
    householdId: "hh_wcymca_001",
    firstName: "Harper",
    lastName: "Lewis",
    preferredName: "Harper",
    email: "harper.lewis@example.com",
    phone: "(828) 555-5101",
    birthDate: "1985-01-18",
    active: true
  },
  {
    id: "cust_wcymca_002",
    organizationId: "org_western_carolina_ymca",
    householdId: "hh_wcymca_001",
    firstName: "Malik",
    lastName: "Carter",
    preferredName: "Malik",
    email: "malik.carter@example.com",
    phone: "(828) 555-5102",
    birthDate: "1992-11-04",
    active: true
  },
  {
    id: "cust_wcymca_003",
    organizationId: "org_western_carolina_ymca",
    householdId: "hh_wcymca_002",
    firstName: "Sofia",
    lastName: "Ramirez",
    preferredName: "Sofia",
    email: "sofia.ramirez@example.com",
    phone: "(828) 555-5103",
    birthDate: "1976-07-15",
    active: true
  },
  {
    id: "cust_wcymca_004",
    organizationId: "org_western_carolina_ymca",
    householdId: "hh_wcymca_002",
    firstName: "Owen",
    lastName: "Price",
    preferredName: "Owen",
    email: "owen.price@example.com",
    phone: "(828) 555-5104",
    birthDate: "2010-05-30",
    active: true
  },
  {
    id: "cust_wcymca_005",
    organizationId: "org_western_carolina_ymca",
    householdId: null,
    firstName: "Grace",
    lastName: "Thompson",
    preferredName: "Grace",
    email: "grace.thompson@example.com",
    phone: "(828) 555-5105",
    birthDate: "1949-10-11",
    active: true
  },
  {
    id: "cust_wcymca_006",
    organizationId: "org_western_carolina_ymca",
    householdId: null,
    firstName: "Jonah",
    lastName: "Brooks",
    preferredName: "Jonah",
    email: "jonah.brooks@example.com",
    phone: "(828) 555-5106",
    birthDate: "2008-08-23",
    active: true
  },
  {
    id: "cust_wcymca_007",
    organizationId: "org_western_carolina_ymca",
    householdId: null,
    firstName: "Priya",
    lastName: "Shah",
    preferredName: "Priya",
    email: "priya.shah@example.com",
    phone: "(828) 555-5107",
    birthDate: "1988-03-09",
    active: true
  },
  {
    id: "cust_wcymca_008",
    organizationId: "org_western_carolina_ymca",
    householdId: null,
    firstName: "Caleb",
    lastName: "Morris",
    preferredName: "Caleb",
    email: "caleb.morris@example.com",
    phone: "(828) 555-5108",
    birthDate: "1999-06-02",
    active: false
  },
  {
    id: "cust_wcymca_009",
    organizationId: "org_western_carolina_ymca",
    householdId: null,
    firstName: "Elena",
    lastName: "Foster",
    preferredName: "Elena",
    email: "elena.foster@example.com",
    phone: "(828) 555-5109",
    birthDate: "1968-12-28",
    active: true
  },
  {
    id: "cust_wcymca_010",
    organizationId: "org_western_carolina_ymca",
    householdId: null,
    firstName: "Micah",
    lastName: "Turner",
    preferredName: "Micah",
    email: "micah.turner@example.com",
    phone: "(828) 555-5110",
    birthDate: "2016-02-16",
    active: true
  }
] as const;
