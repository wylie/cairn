import "server-only";

import { and, asc, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { checkIns, customers, facilities, getDatabase, membershipPlans, memberships, organizations } from "@/db";
import { getActiveAccessForCustomer } from "@/db/repositories/membership-repository";

export type CheckInRecord = typeof checkIns.$inferSelect;
export type CheckInWithCustomer = {
  checkIn: CheckInRecord;
  customer: typeof customers.$inferSelect;
  membership: typeof memberships.$inferSelect | null;
  plan: typeof membershipPlans.$inferSelect | null;
};
export type CheckInResult =
  | { ok: true; record: CheckInRecord }
  | { ok: false; message: string };
export type CheckInStatusCounts = {
  today: number;
  currentlyIn: number;
  history: number;
};
export type CheckInDataModeCounts = {
  demo: number;
  sandbox: number;
  production: number;
};

function dayRange(date = new Date()) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function getTodayCheckIns(organizationId: string, facilityId?: string | null, date = new Date()): Promise<CheckInWithCustomer[]> {
  const database = getDatabase();
  if (!database) return [];
  const { start, end } = dayRange(date);

  return database
    .select({ checkIn: checkIns, customer: customers, membership: memberships, plan: membershipPlans })
    .from(checkIns)
    .innerJoin(customers, eq(checkIns.customerId, customers.id))
    .leftJoin(memberships, eq(checkIns.membershipId, memberships.id))
    .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .where(
      and(
        eq(checkIns.organizationId, organizationId),
        facilityId ? eq(checkIns.facilityId, facilityId) : undefined,
        gte(checkIns.checkedInAt, start),
        lt(checkIns.checkedInAt, end)
      )
    )
    .orderBy(desc(checkIns.checkedInAt), asc(checkIns.id));
}

export async function getActiveCheckIns(organizationId: string, facilityId?: string | null): Promise<CheckInWithCustomer[]> {
  const database = getDatabase();
  if (!database) return [];

  return database
    .select({ checkIn: checkIns, customer: customers, membership: memberships, plan: membershipPlans })
    .from(checkIns)
    .innerJoin(customers, eq(checkIns.customerId, customers.id))
    .leftJoin(memberships, eq(checkIns.membershipId, memberships.id))
    .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .where(and(eq(checkIns.organizationId, organizationId), facilityId ? eq(checkIns.facilityId, facilityId) : undefined, isNull(checkIns.checkedOutAt)))
    .orderBy(asc(checkIns.checkedInAt), asc(checkIns.id));
}

export async function getCheckInHistoryForCustomer(customerId: string, organizationId: string, limit = 10): Promise<CheckInWithCustomer[]> {
  const database = getDatabase();
  if (!database) return [];

  return database
    .select({ checkIn: checkIns, customer: customers, membership: memberships, plan: membershipPlans })
    .from(checkIns)
    .innerJoin(customers, eq(checkIns.customerId, customers.id))
    .leftJoin(memberships, eq(checkIns.membershipId, memberships.id))
    .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .where(and(eq(checkIns.organizationId, organizationId), eq(checkIns.customerId, customerId)))
    .orderBy(desc(checkIns.checkedInAt), asc(checkIns.id))
    .limit(limit);
}

export async function getCheckInByOrganization(checkInId: string, organizationId: string): Promise<CheckInRecord | null> {
  const database = getDatabase();
  if (!database) return null;
  const [record] = await database
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.id, checkInId), eq(checkIns.organizationId, organizationId)))
    .limit(1);
  return record ?? null;
}

export async function checkInCustomer(input: {
  organizationId: string;
  facilityId: string;
  customerId: string;
  staffUserId?: string | null;
  staffName?: string | null;
  override?: boolean;
  denialReason?: string | null;
}): Promise<CheckInResult> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };

  return database.transaction(async (tx) => {
    const [facility] = await tx
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, input.facilityId), eq(facilities.organizationId, input.organizationId)))
      .limit(1);
    if (!facility) return { ok: false, message: "Facility is not available for this organization." };

    const [customer] = await tx
      .select()
      .from(customers)
      .where(and(eq(customers.id, input.customerId), eq(customers.organizationId, input.organizationId), eq(customers.active, true)))
      .limit(1);
    if (!customer) return { ok: false, message: "Customer is not active in this organization." };

    const [active] = await tx
      .select()
      .from(checkIns)
      .where(and(eq(checkIns.organizationId, input.organizationId), eq(checkIns.customerId, input.customerId), isNull(checkIns.checkedOutAt)))
      .limit(1);
    if (active) return { ok: false, message: "Customer is already checked in." };

    const access = await getActiveAccessForCustomer(input.customerId, input.organizationId, input.facilityId);
    if (!access && !input.override) {
      return { ok: false, message: "No active membership is valid for this facility." };
    }

    const [record] = await tx
      .insert(checkIns)
      .values({
        id: `cin_${crypto.randomUUID()}`,
        organizationId: input.organizationId,
        facilityId: input.facilityId,
        customerId: input.customerId,
        membershipId: access?.membership.id ?? null,
        checkedInAt: new Date(),
        status: "checked-in",
        accessStatus: access ? "approved" : "override",
        denialReason: access ? null : input.denialReason ?? "Staff override",
        checkedInByStaffId: input.staffUserId ?? null,
        checkedInByStaffName: input.staffName ?? null
      })
      .returning();
    return record ? { ok: true, record } : { ok: false, message: "Check-in could not be created." };
  });
}

export async function checkOutCustomer(input: {
  organizationId: string;
  checkInId: string;
  staffUserId?: string | null;
  staffName?: string | null;
}): Promise<CheckInResult> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };

  const [record] = await database
    .update(checkIns)
    .set({
      checkedOutAt: new Date(),
      status: "checked-out",
      checkedOutByStaffId: input.staffUserId ?? null,
      checkedOutByStaffName: input.staffName ?? null
    })
    .where(and(eq(checkIns.id, input.checkInId), eq(checkIns.organizationId, input.organizationId), isNull(checkIns.checkedOutAt)))
    .returning();
  return record ? { ok: true, record } : { ok: false, message: "No active check-in was found." };
}

export async function getCheckInStatusCounts(): Promise<CheckInStatusCounts> {
  const database = getDatabase();
  if (!database) return { today: 0, currentlyIn: 0, history: 0 };
  const { start, end } = dayRange();
  const [todayRows, activeRows, historyRows] = await Promise.all([
    database.select({ value: count() }).from(checkIns).where(and(gte(checkIns.checkedInAt, start), lt(checkIns.checkedInAt, end))),
    database.select({ value: count() }).from(checkIns).where(isNull(checkIns.checkedOutAt)),
    database.select({ value: count() }).from(checkIns)
  ]);
  return {
    today: todayRows[0]?.value ?? 0,
    currentlyIn: activeRows[0]?.value ?? 0,
    history: historyRows[0]?.value ?? 0
  };
}

export async function getCheckInDataModeCounts(): Promise<CheckInDataModeCounts> {
  const database = getDatabase();
  if (!database) return { demo: 0, sandbox: 0, production: 0 };

  const rows = await database
    .select({ mode: organizations.dataMode, value: count(checkIns.id) })
    .from(organizations)
    .leftJoin(checkIns, eq(checkIns.organizationId, organizations.id))
    .groupBy(organizations.dataMode);
  return rows.reduce<CheckInDataModeCounts>(
    (accumulator, row) => ({ ...accumulator, [row.mode]: row.value }),
    { demo: 0, sandbox: 0, production: 0 }
  );
}

export async function getCheckInTableCounts() {
  const database = getDatabase();
  if (!database) return { checkIns: 0 };
  const [row] = await database.select({ value: count() }).from(checkIns);
  return { checkIns: row?.value ?? 0 };
}

export async function getDeniedCheckInCount(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;
  const [row] = await database.select({ value: count() }).from(checkIns).where(eq(checkIns.accessStatus, "denied"));
  return row?.value ?? 0;
}

export async function clearActiveCheckInsForFacility(organizationId: string, facilityId: string) {
  const database = getDatabase();
  if (!database) return 0;
  const rows = await database
    .update(checkIns)
    .set({ checkedOutAt: new Date(), status: "checked-out" })
    .where(and(eq(checkIns.organizationId, organizationId), eq(checkIns.facilityId, facilityId), isNull(checkIns.checkedOutAt)))
    .returning({ id: checkIns.id });
  return rows.length;
}

export async function rawCheckInCountByOrganization(organizationId: string): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;
  const [row] = await database.select({ value: count() }).from(checkIns).where(eq(checkIns.organizationId, organizationId));
  return row?.value ?? 0;
}

export async function assertNoCrossOrganizationCheckInLinks(): Promise<number> {
  const database = getDatabase();
  if (!database) return 0;
  const [row] = await database.execute<{ value: number }>(sql`
    select count(*)::int as value
    from ${checkIns} ci
    join ${customers} c on c.id = ci.customer_id
    join ${facilities} f on f.id = ci.facility_id
    where ci.organization_id <> c.organization_id
       or ci.organization_id <> f.organization_id
  `);
  return row?.value ?? 0;
}
