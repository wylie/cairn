import type { Customer } from "@/types/domain";
import type { Household, HouseholdMember } from "@/types/domain";

export function filterCustomers(
  customers: Customer[],
  query: string,
  options?: {
    households?: Household[];
    householdMembers?: HouseholdMember[];
  }
) {
  const q = query.trim().toLowerCase();
  if (!q) return customers;

  const householdById = new Map((options?.households ?? []).map((household) => [household.id, household]));
  const customerHouseholds = new Map<string, string[]>();
  for (const membership of options?.householdMembers ?? []) {
    const household = householdById.get(membership.householdId);
    if (!household) continue;
    const list = customerHouseholds.get(membership.customerId) ?? [];
    list.push(household.householdName);
    customerHouseholds.set(membership.customerId, list);
  }

  return customers.filter((customer) => {
    const preferredName = customer.preferredName ?? "";
    const pronouns = customer.pronouns === "Custom" ? customer.customPronouns ?? "Custom" : customer.pronouns ?? "";
    const householdNames = customerHouseholds.get(customer.id) ?? [];
    const haystack = [
      customer.firstName,
      customer.lastName,
      `${customer.firstName} ${customer.lastName}`,
      preferredName,
      preferredName ? `${preferredName} ${customer.lastName}` : "",
      pronouns,
      customer.memberId,
      customer.email,
      customer.phone,
      ...customer.tags,
      ...householdNames
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}
