import { buildMembershipCardSearchTerms, selectPrimaryMembershipCardRecord } from "@/lib/memberships/cards";
import type { Customer, CustomerAccessRecord, Household, HouseholdMember } from "@/types/domain";

export function filterCustomers(
  customers: Customer[],
  query: string,
  options?: {
    households?: Household[];
    householdMembers?: HouseholdMember[];
    accessRecords?: CustomerAccessRecord[];
    orgSlug?: string;
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
    const membershipRecord = selectPrimaryMembershipCardRecord(
      (options?.accessRecords ?? []).filter((entry) => entry.customerId === customer.id)
    );
    const membershipTerms = membershipRecord
      ? buildMembershipCardSearchTerms({
          customer,
          accessRecord: membershipRecord,
          orgSlug: options?.orgSlug ?? "summit"
        })
      : [];
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
      ...householdNames,
      ...membershipTerms
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}
