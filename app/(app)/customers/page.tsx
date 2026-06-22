import { cookies } from "next/headers";
import { CustomerList } from "@/components/customers/customer-list";
import { PageHeader } from "@/components/shared/page-header";
import { getDatabase } from "@/db";
import { getActiveFacilityContext } from "@/db/tenant";
import { getCustomersByOrganization } from "@/db/repositories/customer-repository";
import { mapCustomerRecordToDisplayCustomer } from "@/lib/customer-household-persistence";

async function getDatabaseCustomersForActiveOrganization() {
  if (!getDatabase()) return undefined;

  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context) return undefined;

  try {
    const customers = await getCustomersByOrganization(context.organization.id);
    return customers.map((customer, index) =>
      mapCustomerRecordToDisplayCustomer(customer, index, context.activeFacility?.id ?? context.facilities[0]?.id ?? "")
    );
  } catch {
    return undefined;
  }
}

export default async function CustomersPage() {
  const customers = await getDatabaseCustomersForActiveOrganization();

  return (
    <section className="space-y-4">
      <PageHeader title="Customers" description="Search and manage customer records quickly." />
      <CustomerList persistedCustomers={customers} />
    </section>
  );
}
