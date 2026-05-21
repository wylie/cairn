"use client";

import { useMemo, useState } from "react";
import { CustomerCard } from "@/components/customers/customer-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { filterCustomers } from "@/lib/data/customer-search";
import { getMembershipForCustomer, getPassForCustomer, getWaiverForCustomer } from "@/lib/data/selectors";
import { useCustomerState } from "@/lib/state/customer-state";

export function CustomerList() {
  const { customers, toggleCheckIn } = useCustomerState();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterCustomers(customers, query), [customers, query]);

  return (
    <section className="space-y-4">
      <div className="w-full max-w-md">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name, email, phone, or member ID"
          label="Search customers"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No customers found" description="Try a different name, email, phone, or member ID." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              membership={getMembershipForCustomer(customer)}
              punchPass={getPassForCustomer(customer)}
              waiver={getWaiverForCustomer(customer)}
              onToggleCheckIn={toggleCheckIn}
            />
          ))}
        </div>
      )}
    </section>
  );
}
