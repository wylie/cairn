import type { Customer } from "@/types/domain";

export function filterCustomers(customers: Customer[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return customers;

  return customers.filter((customer) => {
    const haystack = [
      customer.firstName,
      customer.lastName,
      `${customer.firstName} ${customer.lastName}`,
      customer.memberId,
      customer.email,
      customer.phone,
      ...customer.tags
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}
