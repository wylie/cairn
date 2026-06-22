import { cookies } from "next/headers";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { getDatabase } from "@/db";
import { getCustomerByOrganization } from "@/db/repositories/customer-repository";
import { getActiveFacilityContext } from "@/db/tenant";
import { mapCustomerRecordToDisplayCustomer } from "@/lib/customer-household-persistence";

async function getPersistedCustomer(customerId: string) {
  if (!getDatabase()) return undefined;

  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context) return undefined;

  try {
    const customer = await getCustomerByOrganization(customerId, context.organization.id);
    if (!customer) return undefined;
    return mapCustomerRecordToDisplayCustomer(customer, 0, context.activeFacility?.id ?? context.facilities[0]?.id ?? "");
  } catch {
    return undefined;
  }
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persistedCustomer = await getPersistedCustomer(id);
  return <CustomerDetailView customerId={id} persistedCustomer={persistedCustomer} />;
}
