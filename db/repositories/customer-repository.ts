import "server-only";

import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { customers, getDatabase } from "@/db";

export type CustomerRecord = typeof customers.$inferSelect;

export async function getCustomer(customerId: string): Promise<CustomerRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [customer] = await database.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  return customer ?? null;
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  return database.select().from(customers).orderBy(asc(customers.lastName), asc(customers.firstName));
}

export async function getCustomersByOrganization(organizationId: string): Promise<CustomerRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  return database
    .select()
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .orderBy(asc(customers.lastName), asc(customers.firstName));
}

export async function searchCustomers(organizationId: string, query: string): Promise<CustomerRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  const normalizedQuery = query.trim();
  if (!normalizedQuery) return getCustomersByOrganization(organizationId);

  const searchPattern = `%${normalizedQuery}%`;

  return database
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        or(
          ilike(customers.firstName, searchPattern),
          ilike(customers.lastName, searchPattern),
          ilike(customers.preferredName, searchPattern),
          ilike(customers.email, searchPattern),
          ilike(customers.phone, searchPattern)
        )
      )
    )
    .orderBy(asc(customers.lastName), asc(customers.firstName));
}

export async function getCustomerCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(customers);
  return row?.value ?? 0;
}
