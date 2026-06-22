import "server-only";

import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { customers, getDatabase } from "@/db";

export type CustomerRecord = typeof customers.$inferSelect;
export type NewCustomerRecord = typeof customers.$inferInsert;
export type CustomerMutationInput = Pick<
  NewCustomerRecord,
  "id" | "organizationId" | "householdId" | "firstName" | "lastName" | "preferredName" | "email" | "phone" | "birthDate" | "active"
>;
export type CustomerUpdateInput = Partial<Omit<CustomerMutationInput, "id" | "organizationId">>;

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

export async function getCustomerByOrganization(customerId: string, organizationId: string): Promise<CustomerRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [customer] = await database
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .limit(1);
  return customer ?? null;
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

export async function createCustomer(input: CustomerMutationInput): Promise<CustomerRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [customer] = await database.insert(customers).values(input).returning();
  return customer ?? null;
}

export async function updateCustomer(
  customerId: string,
  organizationId: string,
  input: CustomerUpdateInput
): Promise<CustomerRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [customer] = await database
    .update(customers)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .returning();
  return customer ?? null;
}

export async function deleteCustomer(customerId: string, organizationId: string): Promise<boolean> {
  const database = getDatabase();
  if (!database) return false;

  const deleted = await database
    .delete(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .returning({ id: customers.id });
  return deleted.length > 0;
}
