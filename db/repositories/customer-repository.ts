import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, type SQLWrapper } from "drizzle-orm";
import { customers, getDatabase, households, organizations } from "@/db";
import { getPhoneDigits, normalizeCustomerSearchQuery } from "@/lib/customer-validation";

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
export type CustomerDuplicateMatch = CustomerRecord & {
  matchedOn: string[];
};
export type CustomerActivityCounts = {
  active: number;
  inactive: number;
};
export type CustomerDataModeCounts = {
  demo: number;
  sandbox: number;
  production: number;
};

export async function getCustomersByOrganization(organizationId: string): Promise<CustomerRecord[]> {
  const database = getDatabase();
  if (!database) return [];

  return database
    .select()
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .orderBy(asc(customers.lastName), asc(customers.firstName), asc(customers.id));
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

  const normalizedQuery = normalizeCustomerSearchQuery(query);
  if (!normalizedQuery) return getCustomersByOrganization(organizationId);

  const searchPattern = `%${normalizedQuery}%`;
  const phoneDigits = getPhoneDigits(normalizedQuery);
  const phonePattern = phoneDigits.length >= 3 ? `%${phoneDigits}%` : "";
  const searchConditions: SQLWrapper[] = [
    ilike(customers.firstName, searchPattern),
    ilike(customers.lastName, searchPattern),
    ilike(customers.preferredName, searchPattern),
    ilike(customers.memberId, searchPattern),
    ilike(customers.email, searchPattern),
    ilike(customers.phone, searchPattern),
    sql`${customers.firstName} || ' ' || ${customers.lastName} ilike ${searchPattern}`
  ];
  if (phonePattern) {
    searchConditions.push(sql`regexp_replace(coalesce(${customers.phone}, ''), '[^0-9]', '', 'g') ilike ${phonePattern}`);
  }

  return database
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        or(...searchConditions)
      )
    )
    .orderBy(asc(customers.lastName), asc(customers.firstName), asc(customers.id));
}

export async function findDuplicateCustomers(input: CustomerDuplicateInput): Promise<CustomerDuplicateMatch[]> {
  const database = getDatabase();
  if (!database) return [];

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
  if (duplicateConditions.length === 0) return [];

  const candidates = await database
    .select()
    .from(customers)
    .where(and(eq(customers.organizationId, input.organizationId), or(...duplicateConditions)))
    .limit(10);

  return candidates
    .filter((customer) => customer.id !== input.excludeCustomerId)
    .map((customer) => {
      const matchedOn: string[] = [];
      if (input.email && customer.email === input.email) matchedOn.push("email");
      if (input.phone && customer.phone === input.phone) matchedOn.push("phone");
      if (
        input.birthDate &&
        customer.birthDate === input.birthDate &&
        customer.firstName.toLowerCase() === input.firstName.toLowerCase() &&
        customer.lastName.toLowerCase() === input.lastName.toLowerCase()
      ) {
        matchedOn.push("name and birth date");
      }
      return { ...customer, matchedOn };
    });
}

export async function getCustomerCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.select({ value: count() }).from(customers);
  return row?.value ?? 0;
}

export async function getCustomerActivityCounts(): Promise<CustomerActivityCounts> {
  const database = getDatabase();
  if (!database) return { active: 0, inactive: 0 };

  const [activeRow, inactiveRow] = await Promise.all([
    database.select({ value: count() }).from(customers).where(eq(customers.active, true)),
    database.select({ value: count() }).from(customers).where(eq(customers.active, false))
  ]);

  return {
    active: activeRow[0]?.value ?? 0,
    inactive: inactiveRow[0]?.value ?? 0
  };
}

export async function getCustomerDataModeCounts(): Promise<CustomerDataModeCounts> {
  const database = getDatabase();
  if (!database) return { demo: 0, sandbox: 0, production: 0 };

  const rows = await database
    .select({ mode: organizations.dataMode, value: count(customers.id) })
    .from(organizations)
    .leftJoin(customers, eq(customers.organizationId, organizations.id))
    .groupBy(organizations.dataMode);

  return rows.reduce<CustomerDataModeCounts>(
    (accumulator, row) => ({
      ...accumulator,
      [row.mode]: row.value
    }),
    { demo: 0, sandbox: 0, production: 0 }
  );
}

export async function getPotentialDuplicateCustomerPairCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;

  const [row] = await database.execute<{ value: number }>(sql`
    select count(*)::int as value
    from ${customers} c1
    join ${customers} c2
      on c1.organization_id = c2.organization_id
      and c1.id < c2.id
      and (
        (c1.email is not null and c1.email = c2.email)
        or (c1.phone is not null and c1.phone = c2.phone)
        or (
          c1.birth_date is not null
          and lower(c1.first_name) = lower(c2.first_name)
          and lower(c1.last_name) = lower(c2.last_name)
          and c1.birth_date = c2.birth_date
        )
      )
  `);
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

  return database.transaction(async (tx) => {
    await tx
      .update(households)
      .set({ primaryContactId: null, updatedAt: new Date() })
      .where(and(eq(households.primaryContactId, customerId), eq(households.organizationId, organizationId)));

    const deleted = await tx
      .delete(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
      .returning({ id: customers.id });
    return deleted.length > 0;
  });
}
