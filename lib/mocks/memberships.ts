import type { Membership } from "@/types/domain";
import { dateKeyAtOffset } from "@/lib/demo/dates";

export const memberships: Membership[] = [
  {
    id: "mem_001",
    customerId: "cust_001",
    householdId: "hh_003",
    planName: "Unlimited Access",
    status: "active",
    purchaseDate: dateKeyAtOffset(-28),
    startDate: dateKeyAtOffset(-28),
    expirationDate: dateKeyAtOffset(12),
    renewalDate: dateKeyAtOffset(12),
    billingFrequency: "monthly",
    renewalAmountCents: 10900,
    autoRenew: true
  },
  {
    id: "mem_003",
    customerId: "cust_003",
    householdId: "hh_001",
    planName: "Youth Camp Seasonal",
    status: "trial",
    purchaseDate: dateKeyAtOffset(-21),
    startDate: dateKeyAtOffset(-21),
    expirationDate: dateKeyAtOffset(4),
    renewalDate: dateKeyAtOffset(4),
    billingFrequency: "monthly",
    renewalAmountCents: 10000,
    autoRenew: true
  },
  {
    id: "mem_004",
    customerId: "cust_004",
    planName: "Starter Membership",
    status: "expiring",
    purchaseDate: dateKeyAtOffset(-16),
    startDate: dateKeyAtOffset(-16),
    expirationDate: dateKeyAtOffset(2),
    renewalDate: dateKeyAtOffset(2),
    billingFrequency: "monthly",
    renewalAmountCents: 8500,
    autoRenew: true
  },
  {
    id: "mem_005",
    customerId: "cust_002",
    planName: "Wellness Freeze Hold",
    status: "frozen",
    purchaseDate: dateKeyAtOffset(-65),
    startDate: dateKeyAtOffset(-65),
    expirationDate: dateKeyAtOffset(18),
    renewalDate: dateKeyAtOffset(18),
    billingFrequency: "monthly",
    renewalAmountCents: 8900,
    autoRenew: true,
    freezeStartDate: dateKeyAtOffset(-4),
    freezeEndDate: dateKeyAtOffset(5),
    freezeReason: "Travel"
  },
  {
    id: "mem_006",
    customerId: "cust_005",
    planName: "Weekend Access",
    status: "expired",
    purchaseDate: dateKeyAtOffset(-45),
    startDate: dateKeyAtOffset(-45),
    expirationDate: dateKeyAtOffset(-5),
    renewalDate: dateKeyAtOffset(-5),
    billingFrequency: "monthly",
    renewalAmountCents: 6900,
    autoRenew: false
  },
  {
    id: "mem_007",
    customerId: "cust_006",
    householdId: "hh_003",
    planName: "Family Membership",
    status: "cancelled",
    purchaseDate: dateKeyAtOffset(-95),
    startDate: dateKeyAtOffset(-95),
    expirationDate: dateKeyAtOffset(-20),
    renewalDate: dateKeyAtOffset(-20),
    billingFrequency: "monthly",
    renewalAmountCents: 12900,
    autoRenew: false
  }
];
