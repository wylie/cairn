import "server-only";

import { and, asc, count, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
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
export type MembershipMutationResult =
  | { ok: true; membership: MembershipRecord }
  | { ok: false; message: string };
export type MembershipAccessDecision = {
  status: "allowed" | "warning" | "denied";
  code:
    | "allowed"
    | "expires-soon"
    | "customer-not-found"
    | "no-membership"
    | "wrong-facility"
    | "not-started"
    | "expired"
    | "suspended"
    | "cancelled";
  message: string;
  membership?: MembershipRecord;
  plan?: MembershipPlanRecord;
};

function toDayKey(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function addDays(dayKey: string, days: number) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatAccessDate(dayKey?: string | null) {
  if (!dayKey) return null;
  const date = new Date(`${dayKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

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

async function findOverlappingActiveMembership(input: MembershipMutationInput, excludeMembershipId?: string) {
  const database = getDatabase();
  if (!database) return null;

  if (input.status !== "active") return null;
  const ownerCondition = input.ownerType === "customer"
    ? eq(memberships.customerId, input.customerId ?? "")
    : eq(memberships.householdId, input.householdId ?? "");
  const facilityCondition = input.facilityId ? eq(memberships.facilityId, input.facilityId) : isNull(memberships.facilityId);
  const overlapEnd = input.expiresOn ?? "9999-12-31";
  const filters = [
    eq(memberships.organizationId, input.organizationId),
    eq(memberships.ownerType, input.ownerType),
    eq(memberships.planId, input.planId),
    eq(memberships.status, "active"),
    ownerCondition,
    facilityCondition,
    lte(memberships.startsOn, overlapEnd),
    or(isNull(memberships.expiresOn), gte(memberships.expiresOn, input.startsOn))
  ];
  if (excludeMembershipId) filters.push(ne(memberships.id, excludeMembershipId));

  const [duplicate] = await database.select().from(memberships).where(and(...filters)).limit(1);
  return duplicate ?? null;
}

async function validateMembershipMutation(input: MembershipMutationInput, excludeMembershipId?: string): Promise<{ plan: MembershipPlanRecord } | { message: string }> {
  const database = getDatabase();
  if (!database) return { message: "Database is unavailable." };

  const today = toDayKey();
  if (!input.planId) return { message: "Choose a membership plan." };
  if (!input.startsOn) return { message: "Start date is required." };
  if (input.expiresOn && input.expiresOn < input.startsOn) return { message: "Expiration date must be on or after the start date." };
  if (input.status === "active" && input.expiresOn && input.expiresOn < today) {
    return { message: "Active memberships must expire today or later. Mark this membership expired instead." };
  }

  const [plan] = await database
    .select()
    .from(membershipPlans)
    .where(and(eq(membershipPlans.id, input.planId), eq(membershipPlans.organizationId, input.organizationId)))
    .limit(1);
  if (!plan) return { message: "Membership plan is not available for this organization." };

  if (input.facilityId) {
    const [facility] = await database
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, input.facilityId), eq(facilities.organizationId, input.organizationId)))
      .limit(1);
    if (!facility) return { message: "Facility is not available for this organization." };
  }

  if (input.ownerType === "customer") {
    if (!input.customerId || input.householdId) return { message: "Choose exactly one customer for an individual membership." };
    const [customer] = await database
      .select()
      .from(customers)
      .where(and(eq(customers.id, input.customerId), eq(customers.organizationId, input.organizationId)))
      .limit(1);
    if (!customer) return { message: "Customer is not available for this organization." };
  } else {
    if (!input.householdId) return { message: "Choose a household for a household membership." };
    const [household] = await database
      .select()
      .from(households)
      .where(and(eq(households.id, input.householdId), eq(households.organizationId, input.organizationId)))
      .limit(1);
    if (!household) return { message: "Household is not available for this organization." };
    if (input.customerId) {
      const [customer] = await database
        .select()
        .from(customers)
        .where(and(eq(customers.id, input.customerId), eq(customers.organizationId, input.organizationId), eq(customers.householdId, input.householdId)))
        .limit(1);
      if (!customer) return { message: "Primary household member must belong to the selected household." };
    }
  }

  const duplicate = await findOverlappingActiveMembership(input, excludeMembershipId);
  if (duplicate) {
    return { message: "An overlapping active membership already exists for this owner, plan, and facility scope." };
  }
  return { plan };
}

export async function createMembership(input: MembershipMutationInput): Promise<MembershipMutationResult> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  const valid = await validateMembershipMutation(input);
  if ("message" in valid) return { ok: false, message: valid.message };

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
  return membership ? { ok: true, membership } : { ok: false, message: "Membership could not be created." };
}

export async function updateMembership(
  membershipId: string,
  organizationId: string,
  input: Partial<Omit<MembershipMutationInput, "organizationId">>
): Promise<MembershipMutationResult> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };

  const existing = await getMembershipByOrganization(membershipId, organizationId);
  if (!existing) return { ok: false, message: "Membership was not found for this organization." };
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
  const valid = await validateMembershipMutation(merged, membershipId);
  if ("message" in valid) return { ok: false, message: valid.message };

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
  return membership ? { ok: true, membership } : { ok: false, message: "Membership could not be updated." };
}

export async function setMembershipStatus(
  membershipId: string,
  organizationId: string,
  status: "active" | "expired" | "cancelled" | "suspended"
): Promise<MembershipMutationResult> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  const existing = await getMembershipByOrganization(membershipId, organizationId);
  if (!existing) return { ok: false, message: "Membership was not found for this organization." };
  if (status === "active") {
    const valid = await validateMembershipMutation({
      organizationId,
      facilityId: existing.membership.facilityId,
      planId: existing.membership.planId,
      ownerType: existing.membership.ownerType,
      customerId: existing.membership.customerId,
      householdId: existing.membership.householdId,
      startsOn: existing.membership.startsOn,
      expiresOn: existing.membership.expiresOn,
      status,
      notes: existing.membership.notes
    }, membershipId);
    if ("message" in valid) return { ok: false, message: valid.message };
  }
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
  return membership ? { ok: true, membership } : { ok: false, message: "Membership status could not be updated." };
}

export async function extendMembership(
  membershipId: string,
  organizationId: string,
  days = 30
): Promise<MembershipMutationResult> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };

  const existing = await getMembershipByOrganization(membershipId, organizationId);
  if (!existing) return { ok: false, message: "Membership was not found for this organization." };
  const today = toDayKey();
  const base = existing.membership.expiresOn && existing.membership.expiresOn > today ? existing.membership.expiresOn : today;
  const nextExpiration = addDays(base, Math.max(1, days));
  return updateMembership(membershipId, organizationId, {
    facilityId: existing.membership.facilityId,
    planId: existing.membership.planId,
    ownerType: existing.membership.ownerType,
    customerId: existing.membership.customerId,
    householdId: existing.membership.householdId,
    startsOn: existing.membership.startsOn,
    expiresOn: nextExpiration,
    status: "active",
    notes: existing.membership.notes
  });
}

export async function getMembershipAccessDecision(
  customerId: string,
  organizationId: string,
  facilityId: string,
  at = new Date()
): Promise<MembershipAccessDecision> {
  const database = getDatabase();
  if (!database) {
    return { status: "denied", code: "no-membership", message: "Database is unavailable." };
  }
  const dayKey = toDayKey(at);

  const [customer] = await database
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
    .limit(1);
  if (!customer) {
    return { status: "denied", code: "customer-not-found", message: "Customer is not available for this organization." };
  }

  const ownershipConditions = [eq(memberships.customerId, customerId)];
  if (customer.householdId) ownershipConditions.push(eq(memberships.householdId, customer.householdId));

  const rows = await database
    .select({ membership: memberships, plan: membershipPlans })
    .from(memberships)
    .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .where(and(eq(memberships.organizationId, organizationId), or(...ownershipConditions)))
    .orderBy(desc(memberships.updatedAt), asc(memberships.id));

  if (rows.length === 0) {
    return { status: "denied", code: "no-membership", message: "No membership is attached to this customer or household." };
  }

  const scopedRows = rows.filter((row) => !row.membership.facilityId || row.membership.facilityId === facilityId);
  if (scopedRows.length === 0) {
    return { status: "denied", code: "wrong-facility", message: "Membership exists, but it is not valid for this facility." };
  }

  const sortedRows = scopedRows.slice().sort((a, b) => {
    const priority = (row: typeof a) => {
      if (row.membership.status === "active" && row.membership.startsOn <= dayKey && (!row.membership.expiresOn || row.membership.expiresOn >= dayKey)) return 0;
      if (row.membership.status === "active" && row.membership.startsOn > dayKey) return 1;
      if (row.membership.status === "suspended") return 2;
      if (row.membership.status === "expired" || (row.membership.expiresOn && row.membership.expiresOn < dayKey)) return 3;
      if (row.membership.status === "cancelled") return 4;
      return 5;
    };
    return priority(a) - priority(b);
  });

  const row = sortedRows[0];
  if (!row) return { status: "denied", code: "no-membership", message: "No membership is valid for this facility." };

  if (row.membership.status === "suspended") {
    return { status: "denied", code: "suspended", message: "Membership is suspended.", membership: row.membership, plan: row.plan };
  }
  if (row.membership.status === "cancelled") {
    return { status: "denied", code: "cancelled", message: "Membership is cancelled.", membership: row.membership, plan: row.plan };
  }
  if (row.membership.status === "expired" || (row.membership.expiresOn && row.membership.expiresOn < dayKey)) {
    return {
      status: "denied",
      code: "expired",
      message: `Membership expired${formatAccessDate(row.membership.expiresOn) ? ` on ${formatAccessDate(row.membership.expiresOn)}` : ""}.`,
      membership: row.membership,
      plan: row.plan
    };
  }
  if (row.membership.startsOn > dayKey) {
    return {
      status: "denied",
      code: "not-started",
      message: `Membership starts on ${formatAccessDate(row.membership.startsOn)}.`,
      membership: row.membership,
      plan: row.plan
    };
  }

  if (row.membership.expiresOn) {
    const daysUntilExpiration = Math.ceil((new Date(`${row.membership.expiresOn}T00:00:00Z`).getTime() - new Date(`${dayKey}T00:00:00Z`).getTime()) / 86_400_000);
    if (daysUntilExpiration <= 7) {
      return {
        status: "warning",
        code: "expires-soon",
        message: `Membership is active but expires on ${formatAccessDate(row.membership.expiresOn)}.`,
        membership: row.membership,
        plan: row.plan
      };
    }
  }

  return {
    status: "allowed",
    code: "allowed",
    message: `Membership active: ${row.plan.name}.`,
    membership: row.membership,
    plan: row.plan
  };
}

export async function getActiveAccessForCustomer(
  customerId: string,
  organizationId: string,
  facilityId: string,
  at = new Date()
): Promise<{ membership: MembershipRecord; plan: MembershipPlanRecord } | null> {
  const decision = await getMembershipAccessDecision(customerId, organizationId, facilityId, at);
  return decision.membership && decision.plan && decision.status !== "denied"
    ? { membership: decision.membership, plan: decision.plan }
    : null;
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
