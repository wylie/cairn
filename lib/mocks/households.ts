import type { Household, HouseholdMember } from "@/types/domain";

export const households: Household[] = [
  {
    id: "hh_001",
    householdName: "Rivera Family",
    primaryContactCustomerId: "cust_003",
    billingCustomerId: "cust_003",
    locationId: "loc_001",
    notes: "Primary youth household",
    createdAt: "2026-05-01T09:00:00Z"
  }
];

export const householdMembers: HouseholdMember[] = [
  {
    householdId: "hh_001",
    customerId: "cust_003",
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
    role: "emergency-contact-only",
    relationship: "other",
    canCheckInOthers: false,
    canPurchaseForOthers: false,
    canSignWaivers: false,
    emergencyContactPriority: 3
  }
];
