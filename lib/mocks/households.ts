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
    defaultEmergencyContactName: "Sam Noaccess",
    defaultEmergencyContactPhone: "(828) 555-9199",
    notes: "Primary youth household",
    createdAt: "2026-05-01T09:00:00Z"
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
  }
];
