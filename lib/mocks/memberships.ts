import type { Membership } from "@/types/domain";

export const memberships: Membership[] = [
  { id: "mem_001", customerId: "cust_001", planName: "Unlimited Access", status: "active", renewalDate: "2026-06-12" },
  { id: "mem_003", customerId: "cust_003", planName: "Youth Camp Seasonal", status: "trial", renewalDate: "2026-06-02" },
  { id: "mem_004", customerId: "cust_004", planName: "Starter Membership", status: "expiring", renewalDate: "2026-05-22" }
];
