import { cookies } from "next/headers";
import { HouseholdsPageClient } from "@/components/households/households-page-client";
import { getActiveFacilityContext } from "@/db/tenant";
import { getCustomersByOrganization } from "@/db/repositories/customer-repository";
import { getHouseholdsByOrganization } from "@/db/repositories/household-repository";
import {
  buildHouseholdMembersFromCustomers,
  mapCustomerRecordToDisplayCustomer,
  mapHouseholdRecordToDisplayHousehold
} from "@/lib/customer-household-persistence";

async function getPersistedHouseholdsForActiveOrganization() {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context) return { households: [], customers: [], householdMembers: [] };
  if (context.source !== "database") return { households: [], customers: [], householdMembers: [] };

  try {
    const [households, customers] = await Promise.all([
      getHouseholdsByOrganization(context.organization.id),
      getCustomersByOrganization(context.organization.id)
    ]);
    const locationId = context.activeFacility?.id ?? context.facilities[0]?.id ?? "";
    const displayCustomers = customers.map((customer, index) => mapCustomerRecordToDisplayCustomer(customer, index, locationId));
    const customersById = new Map(displayCustomers.map((customer) => [customer.id, customer]));
    const displayHouseholds = households.map((household) => mapHouseholdRecordToDisplayHousehold(household, customersById, locationId));

    return {
      households: displayHouseholds,
      customers: displayCustomers,
      householdMembers: buildHouseholdMembersFromCustomers(displayCustomers, displayHouseholds)
    };
  } catch {
    return { households: [], customers: [], householdMembers: [] };
  }
}

export default async function HouseholdsPage() {
  const persisted = await getPersistedHouseholdsForActiveOrganization();

  return (
    <HouseholdsPageClient
      persistedHouseholds={persisted?.households}
      persistedCustomers={persisted?.customers}
      persistedHouseholdMembers={persisted?.householdMembers}
    />
  );
}
