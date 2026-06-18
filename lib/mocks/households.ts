import type { Household, HouseholdMember } from "@/types/domain";

export const households: Household[] = [
  {
    id: "hh_001",
    householdName: "Rivera Family",
    primaryContactCustomerId: "cust_003",
    billingCustomerId: "cust_003",
    secondaryContactCustomerId: "cust_002",
    locationId: "loc_001",
    householdStatus: "active",
    preferredCommunicationMethod: "email",
    email: "rivera.family@example.com",
    phone: "(212) 555-3010",
    defaultAddress: "88 Summit Ave, New York, NY 10011",
    defaultEmergencyContactName: "Oslo Fisher",
    defaultEmergencyContactPhone: "(212) 555-9199",
    notes: "Primary youth household",
    createdAt: "2026-05-01T09:00:00Z"
  },
  {
    id: "hh_002",
    householdName: "Brooks Household",
    primaryContactCustomerId: "cust_005",
    billingCustomerId: "cust_005",
    locationId: "loc_001",
    householdStatus: "inactive",
    preferredCommunicationMethod: "sms",
    email: "dana.brooks@example.com",
    phone: "(212) 555-0177",
    defaultAddress: "240 Grove St, Jersey City, NJ 07302",
    defaultEmergencyContactName: "Morgan Brooks",
    defaultEmergencyContactPhone: "(201) 555-9177",
    notes: "Single-person household used for day pass and receipt history.",
    createdAt: "2026-04-18T10:30:00Z"
  },
  {
    id: "hh_003",
    householdName: "Patel-James Household",
    primaryContactCustomerId: "cust_001",
    secondaryContactCustomerId: "cust_006",
    billingCustomerId: "cust_001",
    locationId: "loc_001",
    householdStatus: "active",
    preferredCommunicationMethod: "email",
    email: "patel.james@example.com",
    phone: "(212) 555-0112",
    defaultAddress: "120 Spring St, New York, NY 10012",
    defaultEmergencyContactName: "Priya Patel",
    defaultEmergencyContactPhone: "(212) 555-9001",
    notes: "Blended household for memberships, youth waivers, and billing coverage scenarios.",
    createdAt: "2026-03-10T13:15:00Z"
  }
];

export const householdMembers: HouseholdMember[] = [
  {
    householdId: "hh_001",
    customerId: "cust_003",
    memberType: "adult",
    role: "primary-adult",
    relationship: "guardian",
    canCheckInOthers: true,
    canPurchaseForOthers: true,
    canSignWaivers: true,
    emergencyContactPriority: 1
  },
  {
    householdId: "hh_001",
    customerId: "cust_004",
    memberType: "child",
    role: "child",
    relationship: "child",
    canCheckInOthers: false,
    canPurchaseForOthers: false,
    canSignWaivers: false,
    emergencyContactPriority: 2
  },
  {
    householdId: "hh_001",
    customerId: "cust_002",
    memberType: "adult",
    role: "secondary-adult",
    relationship: "emergency_contact_only",
    canCheckInOthers: true,
    canPurchaseForOthers: true,
    canSignWaivers: true,
    emergencyContactPriority: 3
  },
  {
    householdId: "hh_002",
    customerId: "cust_005",
    memberType: "adult",
    role: "primary-adult",
    relationship: "other",
    canCheckInOthers: true,
    canPurchaseForOthers: true,
    canSignWaivers: true,
    emergencyContactPriority: 1
  },
  {
    householdId: "hh_003",
    customerId: "cust_001",
    memberType: "adult",
    role: "primary-adult",
    relationship: "spouse_partner",
    canCheckInOthers: true,
    canPurchaseForOthers: true,
    canSignWaivers: true,
    emergencyContactPriority: 1
  },
  {
    householdId: "hh_003",
    customerId: "cust_006",
    memberType: "adult",
    role: "secondary-adult",
    relationship: "spouse_partner",
    canCheckInOthers: true,
    canPurchaseForOthers: true,
    canSignWaivers: true,
    emergencyContactPriority: 2
  }
];
