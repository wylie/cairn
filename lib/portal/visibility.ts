import type { HouseholdMember } from "@/types/domain";

export function getVisibleCustomerIds(
  primaryCustomerId: string,
  householdMembers: HouseholdMember[]
): string[] {
  const primaryMembership = householdMembers.find((entry) => entry.customerId === primaryCustomerId);
  if (!primaryMembership) return [primaryCustomerId];

  const canManageHousehold =
    primaryMembership.canCheckInOthers ||
    primaryMembership.canPurchaseForOthers ||
    primaryMembership.canSignWaivers;

  if (!canManageHousehold) return [primaryCustomerId];

  return householdMembers
    .filter((entry) => entry.householdId === primaryMembership.householdId)
    .map((entry) => entry.customerId);
}
