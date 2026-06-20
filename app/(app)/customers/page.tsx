import { cookies } from "next/headers";
import { CustomerList } from "@/components/customers/customer-list";
import { PageHeader } from "@/components/shared/page-header";
import { getActiveFacilityContext } from "@/db/tenant";
import { getCustomersByOrganization, type CustomerRecord } from "@/db/repositories/customer-repository";
import type { Customer } from "@/types/domain";

function buildDisplayMemberId(customer: CustomerRecord, index: number) {
  if (customer.id.startsWith("cust_rb_")) return `RB-${String(1001 + index).padStart(4, "0")}`;
  if (customer.id.startsWith("cust_wcymca_")) return `WC-${String(1001 + index).padStart(4, "0")}`;
  if (customer.id.startsWith("cust_staff_")) return `S-${String(2001 + index).padStart(4, "0")}`;
  return `M-${String(1001 + index).padStart(4, "0")}`;
}

function mapCustomerRecordToDisplayCustomer(customer: CustomerRecord, index: number, locationId: string): Customer {
  return {
    id: customer.id,
    memberId: buildDisplayMemberId(customer, index),
    organizationId: customer.organizationId,
    locationId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    preferredName: customer.preferredName ?? undefined,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    dateOfBirth: customer.birthDate ?? undefined,
    tags: customer.active ? ["Database"] : ["Database", "Inactive"],
    checkInStatus: "out",
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  };
}

async function getDatabaseCustomersForActiveOrganization() {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context) return [];

  try {
    const customers = await getCustomersByOrganization(context.organization.id);
    return customers.map((customer, index) =>
      mapCustomerRecordToDisplayCustomer(customer, index, context.activeFacility?.id ?? context.facilities[0]?.id ?? "")
    );
  } catch {
    return [];
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
