import { data } from "@/lib/data";
import type { Customer } from "@/types/domain";

export function getMembershipForCustomer(customer: Customer) {
  if (!customer.membershipId) return undefined;
  return data.memberships.find((m) => m.id === customer.membershipId);
}

export function getWaiverForCustomer(customer: Customer) {
  if (!customer.waiverId) return undefined;
  return data.waivers.find((w) => w.id === customer.waiverId);
}

export function getPassForCustomer(customer: Customer) {
  if (!customer.punchPassId) return undefined;
  return data.punchPasses.find((p) => p.id === customer.punchPassId);
}

export function getRecentCheckInsForCustomer(customerId: string) {
  return data.checkInRecords
    .filter((record) => record.customerId === customerId)
    .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))
    .slice(0, 6);
}
