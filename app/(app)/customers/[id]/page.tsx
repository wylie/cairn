import { cookies } from "next/headers";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { getCustomerByOrganization, getCustomersByOrganization } from "@/db/repositories/customer-repository";
import { getHouseholdsByOrganization } from "@/db/repositories/household-repository";
import { getActiveFacilityContext } from "@/db/tenant";
import {
  buildHouseholdMembersFromCustomers,
  mapCustomerRecordToDisplayCustomer,
  mapHouseholdRecordToDisplayHousehold
} from "@/lib/customer-household-persistence";

async function getPersistedCustomerContext(customerId: string) {
  if (process.env.NODE_ENV === "test") return undefined;

  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context) return undefined;
  if (context.source !== "database") return undefined;

  try {
    const [customer, customers, households] = await Promise.all([
      getCustomerByOrganization(customerId, context.organization.id),
      getCustomersByOrganization(context.organization.id),
      getHouseholdsByOrganization(context.organization.id)
    ]);
    if (!customer) return undefined;
    const locationId = context.activeFacility?.id ?? context.facilities[0]?.id ?? "";
    const displayCustomers = customers.map((entry, index) => mapCustomerRecordToDisplayCustomer(entry, index, locationId));
    const customersById = new Map(displayCustomers.map((entry) => [entry.id, entry]));
    const displayHouseholds = households.map((entry) => mapHouseholdRecordToDisplayHousehold(entry, customersById, locationId));

    return {
      customer: mapCustomerRecordToDisplayCustomer(customer, 0, locationId),
      customers: displayCustomers,
      households: displayHouseholds,
      householdMembers: buildHouseholdMembersFromCustomers(displayCustomers, displayHouseholds)
    };
  } catch {
    return undefined;
  }
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persisted = await getPersistedCustomerContext(id);
  return (
    <CustomerDetailView
      customerId={id}
      persistedCustomer={persisted?.customer}
      persistedCustomers={persisted?.customers}
      persistedHouseholds={persisted?.households}
      persistedHouseholdMembers={persisted?.householdMembers}
      persistedMode={process.env.NODE_ENV !== "test"}
    />
  );
}
