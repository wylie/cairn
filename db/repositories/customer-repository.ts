import "server-only";

import { and, asc, count, desc, eq, ilike, or, type SQLWrapper } from "drizzle-orm";
import { customers, getDatabase } from "@/db";

export type CustomerRecord = typeof customers.$inferSelect;
export type NewCustomerRecord = typeof customers.$inferInsert;
export type CustomerMutationInput = Pick<
  NewCustomerRecord,
  | "id"
  | "organizationId"
  | "householdId"
  | "firstName"
  | "lastName"
  | "preferredName"
  | "pronouns"
  | "customPronouns"
  | "memberId"
  | "email"
  | "phone"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "birthDate"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "notes"
  | "profilePhotoUrl"
  | "active"
>;
export type CustomerUpdateInput = Partial<Omit<CustomerMutationInput, "id" | "organizationId">>;
export type CustomerDuplicateInput = {
  organizationId: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  email?: string | null;
  phone?: string | null;
  excludeCustomerId?: string;
};

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

export async function findDuplicateCustomer(input: CustomerDuplicateInput): Promise<CustomerRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const duplicateConditions: SQLWrapper[] = [];
  if (input.email) duplicateConditions.push(eq(customers.email, input.email));
  if (input.phone) duplicateConditions.push(eq(customers.phone, input.phone));
  if (input.birthDate) {
    const matchingNameAndBirthDate = and(
      ilike(customers.firstName, input.firstName),
      ilike(customers.lastName, input.lastName),
      eq(customers.birthDate, input.birthDate)
    );
    if (matchingNameAndBirthDate) duplicateConditions.push(matchingNameAndBirthDate);
  }
  if (duplicateConditions.length === 0) return null;

  const candidates = await database
    .select()
    .from(customers)
    .where(and(eq(customers.organizationId, input.organizationId), or(...duplicateConditions)))
    .limit(10);

  return candidates.find((customer) => customer.id !== input.excludeCustomerId) ?? null;
}

export async function getCustomerCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(customers);
  return row?.value ?? 0;
}

export async function getLastCustomerCreated(): Promise<CustomerRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const [customer] = await database.select().from(customers).orderBy(desc(customers.createdAt)).limit(1);
  return customer ?? null;
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
