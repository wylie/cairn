import { CustomerList } from "@/components/customers/customer-list";
import { PageHeader } from "@/components/shared/page-header";

export default function CustomersPage() {
  return (
    <section className="space-y-4">
      <PageHeader title="Customers" description="Search and manage customer records quickly." />
      <CustomerList />
    </section>
  );
}
