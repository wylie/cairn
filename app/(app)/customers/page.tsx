import { cookies } from "next/headers";
import { CustomerList } from "@/components/customers/customer-list";
import { PageHeader } from "@/components/shared/page-header";
import { getActiveFacilityContext } from "@/db/tenant";
import { getCustomersByOrganization, searchCustomers } from "@/db/repositories/customer-repository";
import { mapCustomerRecordToDisplayCustomer } from "@/lib/customer-household-persistence";
import { normalizeCustomerSearchQuery } from "@/lib/customer-validation";

async function getPersistedCustomersForActiveOrganization(query: string) {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context) return { customers: [], databaseAvailable: false };
  if (context.source !== "database") return { customers: [], databaseAvailable: false };

  try {
    const normalizedQuery = normalizeCustomerSearchQuery(query);
    const customers = normalizedQuery
      ? await searchCustomers(context.organization.id, normalizedQuery)
      : await getCustomersByOrganization(context.organization.id);
    return {
      customers: customers.map((customer, index) =>
        mapCustomerRecordToDisplayCustomer(customer, index, context.activeFacility?.id ?? context.facilities[0]?.id ?? "")
      ),
      databaseAvailable: true
    };
  } catch {
    return { customers: [], databaseAvailable: false };
  }
}

export default async function CustomersPage({
  searchParams
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params?.query === "string" ? params.query : "";
  const result = await getPersistedCustomersForActiveOrganization(query);

  return (
    <section className="space-y-4">
      <PageHeader title="Customers" description="Search and manage customer records quickly." />
      <CustomerList
        persistedCustomers={result.customers}
        databaseAvailable={result.databaseAvailable}
      />
    </section>
  );
}
