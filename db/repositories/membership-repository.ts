import "server-only";

import { and, asc, count, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { customers, facilities, getDatabase, households, membershipPlans, memberships, organizations } from "@/db";
import type { CustomerAccessRecord } from "@/types/domain";

export type MembershipPlanRecord = typeof membershipPlans.$inferSelect;
export type MembershipRecord = typeof memberships.$inferSelect;
export type MembershipWithRelations = {
  membership: MembershipRecord;
  plan: MembershipPlanRecord;
  customer: typeof customers.$inferSelect | null;
  household: typeof households.$inferSelect | null;
};
export type MembershipStatusCounts = {
  total: number;
  active: number;
  expired: number;
  suspended: number;
  cancelled: number;
};
export type MembershipDataModeCounts = {
  demo: number;
  sandbox: number;
  production: number;
};

export type MembershipMutationInput = {
  organizationId: string;
  facilityId: string | null;
  planId: string;
  ownerType: "customer" | "household";
  customerId?: string | null;
  householdId?: string | null;
  startsOn: string;
  expiresOn?: string | null;
  status?: "active" | "expired" | "cancelled" | "suspended";
  notes?: string | null;
};

export async function getMembershipPlansByOrganization(organizationId: string): Promise<MembershipPlanRecord[]> {
  const database = getDatabase();
  if (!database) return [];
  return database
    .select()
    .from(membershipPlans)
    .where(and(eq(membershipPlans.organizationId, organizationId), eq(membershipPlans.active, true)))
    .orderBy(asc(membershipPlans.name), asc(membershipPlans.id));
}

export async function getMembershipsByOrganization(organizationId: string): Promise<MembershipWithRelations[]> {
  const database = getDatabase();
  if (!database) return [];

  return database
    .select({ membership: memberships, plan: membershipPlans, customer: customers, household: households })
    .from(memberships)
    .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .leftJoin(customers, eq(memberships.customerId, customers.id))
    .leftJoin(households, eq(memberships.householdId, households.id))
    .where(eq(memberships.organizationId, organizationId))
    .orderBy(desc(memberships.createdAt), asc(memberships.id));
}

export async function getMembershipByOrganization(membershipId: string, organizationId: string): Promise<MembershipWithRelations | null> {
  const database = getDatabase();
  if (!database) return null;

  const [row] = await database
    .select({ membership: memberships, plan: membershipPlans, customer: customers, household: households })
    .from(memberships)
    .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .leftJoin(customers, eq(memberships.customerId, customers.id))
    .leftJoin(households, eq(memberships.householdId, households.id))
    .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function getMembershipsForCustomer(customerId: string, organizationId: string): Promise<MembershipWithRelations[]> {
  const database = getDatabase();
  if (!database) return [];

  const [customer] = await database
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .limit(1);
  if (!customer) return [];

  const ownershipConditions = [eq(memberships.customerId, customerId)];
  if (customer.householdId) ownershipConditions.push(eq(memberships.householdId, customer.householdId));

  return database
    .select({ membership: memberships, plan: membershipPlans, customer: customers, household: households })
    .from(memberships)
    .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .leftJoin(customers, eq(memberships.customerId, customers.id))
    .leftJoin(households, eq(memberships.householdId, households.id))
    .where(and(eq(memberships.organizationId, organizationId), or(...ownershipConditions)))
    .orderBy(desc(memberships.createdAt), asc(memberships.id));
}

async function validateMembershipMutation(input: MembershipMutationInput) {
  const database = getDatabase();
  if (!database) return null;

  const [plan] = await database
    .select()
    .from(membershipPlans)
    .where(and(eq(membershipPlans.id, input.planId), eq(membershipPlans.organizationId, input.organizationId)))
    .limit(1);
  if (!plan) return null;

  if (input.facilityId) {
    const [facility] = await database
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, input.facilityId), eq(facilities.organizationId, input.organizationId)))
      .limit(1);
    if (!facility) return null;
  }

  if (input.ownerType === "customer") {
    if (!input.customerId || input.householdId) return null;
    const [customer] = await database
      .select()
      .from(customers)
      .where(and(eq(customers.id, input.customerId), eq(customers.organizationId, input.organizationId)))
      .limit(1);
    return customer ? { plan } : null;
  }

  if (!input.householdId) return null;
  const [household] = await database
    .select()
    .from(households)
    .where(and(eq(households.id, input.householdId), eq(households.organizationId, input.organizationId)))
    .limit(1);
  if (!household) return null;
  if (input.customerId) {
    const [customer] = await database
      .select()
      .from(customers)
      .where(and(eq(customers.id, input.customerId), eq(customers.organizationId, input.organizationId), eq(customers.householdId, input.householdId)))
      .limit(1);
    if (!customer) return null;
  }
  return { plan };
}

export async function createMembership(input: MembershipMutationInput): Promise<MembershipRecord | null> {
  const database = getDatabase();
  if (!database) return null;
  const valid = await validateMembershipMutation(input);
  if (!valid) return null;

  const [membership] = await database
    .insert(memberships)
    .values({
      id: `mem_${crypto.randomUUID()}`,
      organizationId: input.organizationId,
      facilityId: input.facilityId,
      planId: input.planId,
      ownerType: input.ownerType,
      customerId: input.customerId ?? null,
      householdId: input.householdId ?? null,
      startsOn: input.startsOn,
      expiresOn: input.expiresOn ?? null,
      status: input.status ?? "active",
      notes: input.notes ?? null
    })
    .returning();
  return membership ?? null;
}

export async function updateMembership(
  membershipId: string,
  organizationId: string,
  input: Partial<Omit<MembershipMutationInput, "organizationId">>
): Promise<MembershipRecord | null> {
  const database = getDatabase();
  if (!database) return null;

  const existing = await getMembershipByOrganization(membershipId, organizationId);
  if (!existing) return null;
  const merged: MembershipMutationInput = {
    organizationId,
    facilityId: input.facilityId ?? existing.membership.facilityId,
    planId: input.planId ?? existing.membership.planId,
    ownerType: input.ownerType ?? existing.membership.ownerType,
    customerId: input.customerId === undefined ? existing.membership.customerId : input.customerId,
    householdId: input.householdId === undefined ? existing.membership.householdId : input.householdId,
    startsOn: input.startsOn ?? existing.membership.startsOn,
    expiresOn: input.expiresOn === undefined ? existing.membership.expiresOn : input.expiresOn,
    status: input.status ?? existing.membership.status,
    notes: input.notes === undefined ? existing.membership.notes : input.notes
  };
  const valid = await validateMembershipMutation(merged);
  if (!valid) return null;

  const [membership] = await database
    .update(memberships)
    .set({
      facilityId: merged.facilityId,
      planId: merged.planId,
      ownerType: merged.ownerType,
      customerId: merged.customerId ?? null,
      householdId: merged.householdId ?? null,
      startsOn: merged.startsOn,
      expiresOn: merged.expiresOn ?? null,
      status: merged.status,
      notes: merged.notes ?? null,
      updatedAt: new Date()
    })
    .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)))
    .returning();
  return membership ?? null;
}

export async function setMembershipStatus(
  membershipId: string,
  organizationId: string,
  status: "active" | "expired" | "cancelled" | "suspended"
): Promise<MembershipRecord | null> {
  const database = getDatabase();
  if (!database) return null;
  const now = new Date();
  const [membership] = await database
    .update(memberships)
    .set({
      status,
      cancelledAt: status === "cancelled" ? now : null,
      suspendedAt: status === "suspended" ? now : null,
      updatedAt: now
    })
    .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)))
    .returning();
  return membership ?? null;
}

export async function getActiveAccessForCustomer(
  customerId: string,
  organizationId: string,
  facilityId: string,
  at = new Date()
): Promise<{ membership: MembershipRecord; plan: MembershipPlanRecord } | null> {
  const database = getDatabase();
  if (!database) return null;
  const dayKey = at.toISOString().slice(0, 10);

  const [customer] = await database
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .limit(1);
  if (!customer) return null;

  const ownershipConditions = [eq(memberships.customerId, customerId)];
  if (customer.householdId) ownershipConditions.push(eq(memberships.householdId, customer.householdId));

  const [row] = await database
    .select({ membership: memberships, plan: membershipPlans })
    .from(memberships)
    .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.status, "active"),
        or(isNull(memberships.facilityId), eq(memberships.facilityId, facilityId)),
        lte(memberships.startsOn, dayKey),
        or(isNull(memberships.expiresOn), gte(memberships.expiresOn, dayKey)),
        or(...ownershipConditions)
      )
    )
    .orderBy(asc(memberships.expiresOn), asc(memberships.id))
    .limit(1);
  return row ?? null;
}

export function membershipToAccessRecord(row: { membership: MembershipRecord; plan: MembershipPlanRecord }): CustomerAccessRecord {
  return {
    id: row.membership.id,
    customerId: row.membership.customerId ?? "",
    productId: row.plan.id,
    type: row.membership.ownerType === "household" ? "household-membership" : "membership",
    status: row.membership.status === "cancelled" ? "cancelled" : row.membership.status,
    startDate: row.membership.startsOn,
    expirationDate: row.membership.expiresOn ?? undefined,
    unlimitedAccess: true,
    locationsAllowed: row.membership.facilityId ? [row.membership.facilityId] : undefined,
    householdId: row.membership.householdId ?? undefined,
    primaryMemberCustomerId: row.membership.customerId ?? undefined,
    notes: row.plan.name,
    updatedAt: row.membership.updatedAt.toISOString()
  };
}

export async function getMembershipStatusCounts(): Promise<MembershipStatusCounts> {
  const database = getDatabase();
  if (!database) return { total: 0, active: 0, expired: 0, suspended: 0, cancelled: 0 };

  const rows = await database.select({ status: memberships.status, value: count() }).from(memberships).groupBy(memberships.status);
  return rows.reduce<MembershipStatusCounts>(
    (accumulator, row) => ({ ...accumulator, [row.status]: row.value, total: accumulator.total + row.value }),
    { total: 0, active: 0, expired: 0, suspended: 0, cancelled: 0 }
  );
}

export async function getMembershipPlanCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;
  const [row] = await database.select({ value: count() }).from(membershipPlans);
  return row?.value ?? 0;
}

export async function getMembershipDataModeCounts(): Promise<MembershipDataModeCounts> {
  const database = getDatabase();
  if (!database) return { demo: 0, sandbox: 0, production: 0 };

  const rows = await database
    .select({ mode: organizations.dataMode, value: count(memberships.id) })
    .from(organizations)
    .leftJoin(memberships, eq(memberships.organizationId, organizations.id))
    .groupBy(organizations.dataMode);
  return rows.reduce<MembershipDataModeCounts>(
    (accumulator, row) => ({ ...accumulator, [row.mode]: row.value }),
    { demo: 0, sandbox: 0, production: 0 }
  );
}

export async function expirePastMemberships(organizationId: string): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const updated = await database
    .update(memberships)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.status, "active"), sql`${memberships.expiresOn} < ${today}`))
    .returning({ id: memberships.id });
  return updated.length;
}

export async function getMembershipsByIds(ids: string[], organizationId: string): Promise<MembershipRecord[]> {
  const database = getDatabase();
  if (!database || ids.length === 0) return [];
  return database.select().from(memberships).where(and(eq(memberships.organizationId, organizationId), inArray(memberships.id, ids)));
}
