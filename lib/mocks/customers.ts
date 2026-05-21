import type { Customer } from "@/types/domain";

export const customers: Customer[] = [
  {
    id: "cust_001",
    memberId: "M-1001",
    organizationId: "org_summit",
    locationId: "loc_001",
    firstName: "Maya",
    lastName: "Patel",
    email: "maya.patel@example.com",
    phone: "(212) 555-0112",
    tags: ["Climbing", "Weekend"],
    checkInStatus: "in",
    membershipId: "mem_001",
    waiverId: "wav_001",
    notes: "Prefers morning sessions."
  },
  {
    id: "cust_002",
    memberId: "M-1002",
    organizationId: "org_summit",
    locationId: "loc_001",
    firstName: "Jordan",
    lastName: "Kim",
    email: "jordan.kim@example.com",
    phone: "(917) 555-0180",
    tags: ["Yoga", "10 Visit Pass"],
    checkInStatus: "out",
    punchPassId: "pass_001",
    waiverId: "wav_002"
  },
  {
    id: "cust_003",
    memberId: "M-1003",
    organizationId: "org_summit",
    locationId: "loc_002",
    firstName: "Alex",
    lastName: "Rivera",
    email: "alex.rivera@example.com",
    phone: "(646) 555-0144",
    tags: ["Camp Parent"],
    checkInStatus: "out",
    membershipId: "mem_003",
    notes: "Guardian on file for Sam Rivera."
  },
  {
    id: "cust_004",
    memberId: "M-1004",
    organizationId: "org_summit",
    locationId: "loc_001",
    firstName: "Sam",
    lastName: "Noaccess",
    email: "sam.noaccess@example.com",
    phone: "(212) 555-0199",
    tags: ["Guest"],
    checkInStatus: "out",
    membershipId: "mem_004"
  },
  {
    id: "cust_005",
    memberId: "M-1005",
    organizationId: "org_summit",
    locationId: "loc_001",
    firstName: "Dana",
    lastName: "Daypass",
    email: "dana.daypass@example.com",
    phone: "(212) 555-0177",
    tags: ["Day Pass"],
    checkInStatus: "out",
    dayPassProductName: "Day Pass",
    waiverId: "wav_005"
  }
];
