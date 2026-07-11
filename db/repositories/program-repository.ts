import "server-only";

import { and, asc, count, desc, eq, inArray, max, ne, sql } from "drizzle-orm";
import {
  customers,
  type Database,
  facilities,
  getDatabase,
  organizations,
  programRegistrations,
  programs,
  programSessions,
  staffUsers
} from "@/db";

export type ProgramRecord = typeof programs.$inferSelect;
export type ProgramSessionRecord = typeof programSessions.$inferSelect;
export type ProgramRegistrationRecord = typeof programRegistrations.$inferSelect;
export type ProgramWithCounts = {
  program: ProgramRecord;
  sessionCount: number;
  confirmedRegistrationCount: number;
  waitlistCount: number;
};
export type ProgramSessionWithCounts = {
  session: ProgramSessionRecord;
  program: ProgramRecord;
  confirmedRegistrationCount: number;
  waitlistCount: number;
  availableSpots: number;
};
export type ProgramRegistrationWithRelations = {
  registration: ProgramRegistrationRecord;
  session: ProgramSessionRecord;
  program: ProgramRecord;
  customer: typeof customers.$inferSelect;
};
export type ProgramStatusCounts = {
  programs: number;
  sessions: number;
  registrations: number;
  waitlists: number;
};
export type ProgramMutationResult<T> = { ok: true; record: T; message?: string } | { ok: false; message: string };
export type ProgramInput = {
  organizationId: string;
  facilityId: string | null;
  name: string;
  description?: string | null;
  category: string;
  capacity: number;
  minimumAge?: number | null;
  maximumAge?: number | null;
  status?: "active" | "inactive" | "archived";
  waitlistEnabled?: boolean;
};
export type ProgramSessionInput = {
  organizationId: string;
  facilityId: string;
  programId: string;
  title?: string | null;
  startsAt: Date;
  endsAt: Date;
  instructorStaffId?: string | null;
  instructorName?: string | null;
  capacity: number;
  status?: "scheduled" | "cancelled" | "archived";
  waitlistEnabled?: boolean;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeCapacity(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function isRegistrationActive(status: ProgramRegistrationRecord["status"]) {
  return status === "confirmed" || status === "waitlisted" || status === "attended" || status === "absent";
}

function activeRegistrationStatuses(): Array<ProgramRegistrationRecord["status"]> {
  return ["confirmed", "waitlisted", "attended", "absent"];
}

async function assertFacilityScope(organizationId: string, facilityId: string | null) {
  const database = getDatabase();
  if (!database || !facilityId) return true;
  const [facility] = await database
    .select({ id: facilities.id })
    .from(facilities)
    .where(and(eq(facilities.id, facilityId), eq(facilities.organizationId, organizationId)))
    .limit(1);
  return Boolean(facility);
}

async function assertStaffScope(organizationId: string, staffUserId: string | null | undefined) {
  const database = getDatabase();
  if (!database || !staffUserId) return true;
  const [staff] = await database
    .select({ id: staffUsers.id })
    .from(staffUsers)
    .where(and(eq(staffUsers.id, staffUserId), eq(staffUsers.organizationId, organizationId)))
    .limit(1);
  return Boolean(staff);
}

function validateProgramInput(input: ProgramInput): string | null {
  if (!input.organizationId) return "Organization is required.";
  if (!input.name.trim()) return "Program name is required.";
  if (!input.category.trim()) return "Program category is required.";
  if (input.capacity < 0) return "Program capacity cannot be negative.";
  if (input.minimumAge != null && input.minimumAge < 0) return "Minimum age cannot be negative.";
  if (input.maximumAge != null && input.maximumAge < 0) return "Maximum age cannot be negative.";
  if (input.minimumAge != null && input.maximumAge != null && input.minimumAge > input.maximumAge) {
    return "Minimum age must be less than or equal to maximum age.";
  }
  return null;
}

function validateSessionInput(input: ProgramSessionInput): string | null {
  if (!input.organizationId) return "Organization is required.";
  if (!input.facilityId) return "Facility is required.";
  if (!input.programId) return "Program is required.";
  if (!input.startsAt || Number.isNaN(input.startsAt.getTime())) return "Session start date and time are required.";
  if (!input.endsAt || Number.isNaN(input.endsAt.getTime())) return "Session end date and time are required.";
  if (input.endsAt <= input.startsAt) return "Session end time must be after the start time.";
  if (input.capacity < 0) return "Session capacity cannot be negative.";
  return null;
}

export async function getProgramsByOrganization(organizationId: string): Promise<ProgramWithCounts[]> {
  const database = getDatabase();
  if (!database) return [];

  const rows = await database.select().from(programs).where(eq(programs.organizationId, organizationId)).orderBy(asc(programs.name), asc(programs.id));
  const sessionRows = await database
    .select({
      programId: programSessions.programId,
      sessionCount: count(programSessions.id)
    })
    .from(programSessions)
    .where(eq(programSessions.organizationId, organizationId))
    .groupBy(programSessions.programId);
  const registrationRows = await database
    .select({
      programId: programSessions.programId,
      confirmedRegistrationCount: sql<number>`count(*) filter (where ${programRegistrations.status} in ('confirmed', 'attended', 'absent'))`,
      waitlistCount: sql<number>`count(*) filter (where ${programRegistrations.status} = 'waitlisted')`
    })
    .from(programSessions)
    .innerJoin(programRegistrations, eq(programRegistrations.sessionId, programSessions.id))
    .where(eq(programSessions.organizationId, organizationId))
    .groupBy(programSessions.programId);

  const sessionCounts = new Map(sessionRows.map((row) => [row.programId, Number(row.sessionCount)]));
  const registrationCounts = new Map(registrationRows.map((row) => [
    row.programId,
    {
      confirmedRegistrationCount: Number(row.confirmedRegistrationCount),
      waitlistCount: Number(row.waitlistCount)
    }
  ]));

  return rows.map((program) => ({
    program,
    sessionCount: sessionCounts.get(program.id) ?? 0,
    confirmedRegistrationCount: registrationCounts.get(program.id)?.confirmedRegistrationCount ?? 0,
    waitlistCount: registrationCounts.get(program.id)?.waitlistCount ?? 0
  }));
}

export async function getProgramByOrganization(programId: string, organizationId: string): Promise<ProgramRecord | null> {
  const database = getDatabase();
  if (!database) return null;
  const [program] = await database
    .select()
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.organizationId, organizationId)))
    .limit(1);
  return program ?? null;
}

export async function createProgram(input: ProgramInput): Promise<ProgramMutationResult<ProgramRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  const validationError = validateProgramInput(input);
  if (validationError) return { ok: false, message: validationError };
  if (!(await assertFacilityScope(input.organizationId, input.facilityId))) {
    return { ok: false, message: "Facility is not available for this organization." };
  }

  const [record] = await database
    .insert(programs)
    .values({
      id: `prog_${crypto.randomUUID()}`,
      organizationId: input.organizationId,
      facilityId: input.facilityId,
      name: input.name.trim(),
      description: normalizeText(input.description),
      category: input.category.trim(),
      capacity: normalizeCapacity(input.capacity),
      minimumAge: input.minimumAge ?? null,
      maximumAge: input.maximumAge ?? null,
      status: input.status ?? "active",
      waitlistEnabled: input.waitlistEnabled ?? true
    })
    .returning();
  return record ? { ok: true, record } : { ok: false, message: "Program could not be created." };
}

export async function updateProgram(programId: string, organizationId: string, input: Omit<ProgramInput, "organizationId">): Promise<ProgramMutationResult<ProgramRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  const existing = await getProgramByOrganization(programId, organizationId);
  if (!existing) return { ok: false, message: "Program was not found for this organization." };
  const validationError = validateProgramInput({ ...input, organizationId });
  if (validationError) return { ok: false, message: validationError };
  if (!(await assertFacilityScope(organizationId, input.facilityId))) {
    return { ok: false, message: "Facility is not available for this organization." };
  }

  const [record] = await database
    .update(programs)
    .set({
      facilityId: input.facilityId,
      name: input.name.trim(),
      description: normalizeText(input.description),
      category: input.category.trim(),
      capacity: normalizeCapacity(input.capacity),
      minimumAge: input.minimumAge ?? null,
      maximumAge: input.maximumAge ?? null,
      status: input.status ?? existing.status,
      waitlistEnabled: input.waitlistEnabled ?? existing.waitlistEnabled,
      updatedAt: new Date()
    })
    .where(and(eq(programs.id, programId), eq(programs.organizationId, organizationId)))
    .returning();
  return record ? { ok: true, record } : { ok: false, message: "Program could not be saved." };
}

export async function deleteProgram(programId: string, organizationId: string): Promise<ProgramMutationResult<ProgramRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  const existing = await getProgramByOrganization(programId, organizationId);
  if (!existing) return { ok: false, message: "Program was not found for this organization." };

  const [sessionCount] = await database
    .select({ value: count(programSessions.id) })
    .from(programSessions)
    .where(and(eq(programSessions.organizationId, organizationId), eq(programSessions.programId, programId)));
  if (Number(sessionCount?.value ?? 0) > 0) {
    const [archived] = await database
      .update(programs)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(programs.id, programId), eq(programs.organizationId, organizationId)))
      .returning();
    return archived
      ? { ok: true, record: archived, message: "Program has sessions, so it was archived instead of deleted." }
      : { ok: false, message: "Program could not be archived." };
  }

  const [deleted] = await database
    .delete(programs)
    .where(and(eq(programs.id, programId), eq(programs.organizationId, organizationId)))
    .returning();
  return deleted ? { ok: true, record: deleted, message: "Program deleted." } : { ok: false, message: "Program could not be deleted." };
}

export async function getSessionsByOrganization(organizationId: string): Promise<ProgramSessionWithCounts[]> {
  const database = getDatabase();
  if (!database) return [];
  const rows = await database
    .select({ session: programSessions, program: programs })
    .from(programSessions)
    .innerJoin(programs, eq(programSessions.programId, programs.id))
    .where(eq(programSessions.organizationId, organizationId))
    .orderBy(asc(programSessions.startsAt), asc(programSessions.id));
  const registrationRows = await database
    .select({
      sessionId: programRegistrations.sessionId,
      confirmedRegistrationCount: sql<number>`count(*) filter (where ${programRegistrations.status} in ('confirmed', 'attended', 'absent'))`,
      waitlistCount: sql<number>`count(*) filter (where ${programRegistrations.status} = 'waitlisted')`
    })
    .from(programRegistrations)
    .where(eq(programRegistrations.organizationId, organizationId))
    .groupBy(programRegistrations.sessionId);
  const countsBySession = new Map(registrationRows.map((row) => [
    row.sessionId,
    {
      confirmedRegistrationCount: Number(row.confirmedRegistrationCount),
      waitlistCount: Number(row.waitlistCount)
    }
  ]));

  return rows.map(({ session, program }) => {
    const registrationCounts = countsBySession.get(session.id);
    const confirmedRegistrationCount = registrationCounts?.confirmedRegistrationCount ?? 0;
    const waitlistCount = registrationCounts?.waitlistCount ?? 0;
    return {
      session,
      program,
      confirmedRegistrationCount,
      waitlistCount,
      availableSpots: Math.max(0, session.capacity - confirmedRegistrationCount)
    };
  });
}

export async function getSessionByOrganization(sessionId: string, organizationId: string): Promise<ProgramSessionWithCounts | null> {
  const sessions = await getSessionsByOrganization(organizationId);
  return sessions.find((row) => row.session.id === sessionId) ?? null;
}

export async function createProgramSession(input: ProgramSessionInput): Promise<ProgramMutationResult<ProgramSessionRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  const validationError = validateSessionInput(input);
  if (validationError) return { ok: false, message: validationError };
  if (!(await assertFacilityScope(input.organizationId, input.facilityId))) return { ok: false, message: "Facility is not available for this organization." };
  if (!(await assertStaffScope(input.organizationId, input.instructorStaffId))) return { ok: false, message: "Instructor is not available for this organization." };
  const program = await getProgramByOrganization(input.programId, input.organizationId);
  if (!program) return { ok: false, message: "Program is not available for this organization." };

  const [record] = await database
    .insert(programSessions)
    .values({
      id: `sess_${crypto.randomUUID()}`,
      organizationId: input.organizationId,
      facilityId: input.facilityId,
      programId: input.programId,
      title: normalizeText(input.title),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      instructorStaffId: input.instructorStaffId ?? null,
      instructorName: normalizeText(input.instructorName),
      capacity: normalizeCapacity(input.capacity),
      status: input.status ?? "scheduled",
      waitlistEnabled: input.waitlistEnabled ?? program.waitlistEnabled
    })
    .returning();
  return record ? { ok: true, record } : { ok: false, message: "Session could not be created." };
}

export async function updateProgramSession(sessionId: string, organizationId: string, input: Omit<ProgramSessionInput, "organizationId">): Promise<ProgramMutationResult<ProgramSessionRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  const existing = await getSessionByOrganization(sessionId, organizationId);
  if (!existing) return { ok: false, message: "Session was not found for this organization." };
  const validationError = validateSessionInput({ ...input, organizationId });
  if (validationError) return { ok: false, message: validationError };
  if (!(await assertFacilityScope(organizationId, input.facilityId))) return { ok: false, message: "Facility is not available for this organization." };
  if (!(await assertStaffScope(organizationId, input.instructorStaffId))) return { ok: false, message: "Instructor is not available for this organization." };
  const program = await getProgramByOrganization(input.programId, organizationId);
  if (!program) return { ok: false, message: "Program is not available for this organization." };
  if (input.capacity < existing.confirmedRegistrationCount) {
    return { ok: false, message: "Session capacity cannot be lower than the current confirmed registration count." };
  }

  const [record] = await database
    .update(programSessions)
    .set({
      facilityId: input.facilityId,
      programId: input.programId,
      title: normalizeText(input.title),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      instructorStaffId: input.instructorStaffId ?? null,
      instructorName: normalizeText(input.instructorName),
      capacity: normalizeCapacity(input.capacity),
      status: input.status ?? existing.session.status,
      waitlistEnabled: input.waitlistEnabled ?? existing.session.waitlistEnabled,
      updatedAt: new Date()
    })
    .where(and(eq(programSessions.id, sessionId), eq(programSessions.organizationId, organizationId)))
    .returning();
  return record ? { ok: true, record } : { ok: false, message: "Session could not be saved." };
}

export async function setProgramSessionStatus(sessionId: string, organizationId: string, status: ProgramSessionRecord["status"]): Promise<ProgramMutationResult<ProgramSessionRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  if (!["scheduled", "cancelled", "archived"].includes(status)) return { ok: false, message: "Choose a valid session status." };
  const [record] = await database
    .update(programSessions)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(programSessions.id, sessionId), eq(programSessions.organizationId, organizationId)))
    .returning();
  return record ? { ok: true, record } : { ok: false, message: "Session was not found for this organization." };
}

export async function getRegistrationsByOrganization(organizationId: string): Promise<ProgramRegistrationWithRelations[]> {
  const database = getDatabase();
  if (!database) return [];
  return database
    .select({ registration: programRegistrations, session: programSessions, program: programs, customer: customers })
    .from(programRegistrations)
    .innerJoin(programSessions, eq(programRegistrations.sessionId, programSessions.id))
    .innerJoin(programs, eq(programSessions.programId, programs.id))
    .innerJoin(customers, eq(programRegistrations.customerId, customers.id))
    .where(eq(programRegistrations.organizationId, organizationId))
    .orderBy(desc(programRegistrations.registeredAt), asc(programRegistrations.id));
}

export async function getRegistrationsForCustomer(customerId: string, organizationId: string): Promise<ProgramRegistrationWithRelations[]> {
  const database = getDatabase();
  if (!database) return [];
  return database
    .select({ registration: programRegistrations, session: programSessions, program: programs, customer: customers })
    .from(programRegistrations)
    .innerJoin(programSessions, eq(programRegistrations.sessionId, programSessions.id))
    .innerJoin(programs, eq(programSessions.programId, programs.id))
    .innerJoin(customers, eq(programRegistrations.customerId, customers.id))
    .where(and(eq(programRegistrations.customerId, customerId), eq(programRegistrations.organizationId, organizationId)))
    .orderBy(desc(programSessions.startsAt), asc(programRegistrations.id));
}

async function promoteNextWaitlistedRegistration(tx: Pick<Database, "select" | "update">, organizationId: string, sessionId: string) {
  const [next] = await tx
    .select()
    .from(programRegistrations)
    .where(and(eq(programRegistrations.organizationId, organizationId), eq(programRegistrations.sessionId, sessionId), eq(programRegistrations.status, "waitlisted")))
    .orderBy(asc(programRegistrations.waitlistPosition), asc(programRegistrations.registeredAt))
    .limit(1);
  if (!next) return null;
  const [promoted] = await tx
    .update(programRegistrations)
    .set({ status: "confirmed", waitlistPosition: null, updatedAt: new Date() })
    .where(eq(programRegistrations.id, next.id))
    .returning();
  return promoted ?? null;
}

export async function registerCustomerForSession(input: {
  organizationId: string;
  sessionId: string;
  customerId: string;
  forceWaitlist?: boolean;
}): Promise<ProgramMutationResult<ProgramRegistrationRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  if (!input.sessionId) return { ok: false, message: "Choose a program session." };
  if (!input.customerId) return { ok: false, message: "Choose a customer." };

  return database.transaction(async (tx) => {
    const [sessionRow] = await tx
      .select({ session: programSessions, program: programs })
      .from(programSessions)
      .innerJoin(programs, eq(programSessions.programId, programs.id))
      .where(and(eq(programSessions.id, input.sessionId), eq(programSessions.organizationId, input.organizationId)))
      .limit(1);
    if (!sessionRow) return { ok: false, message: "Session is not available for this organization." };
    if (sessionRow.session.status !== "scheduled") return { ok: false, message: "Registration is only available for scheduled sessions." };

    const [customer] = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, input.customerId), eq(customers.organizationId, input.organizationId), eq(customers.active, true)))
      .limit(1);
    if (!customer) return { ok: false, message: "Customer is not active in this organization." };

    const [duplicate] = await tx
      .select()
      .from(programRegistrations)
      .where(
        and(
          eq(programRegistrations.organizationId, input.organizationId),
          eq(programRegistrations.sessionId, input.sessionId),
          eq(programRegistrations.customerId, input.customerId),
          inArray(programRegistrations.status, activeRegistrationStatuses())
        )
      )
      .limit(1);
    if (duplicate && isRegistrationActive(duplicate.status)) return { ok: false, message: "Customer is already registered or waitlisted for this session." };

    const [confirmedCount] = await tx
      .select({ value: count(programRegistrations.id) })
      .from(programRegistrations)
      .where(
        and(
          eq(programRegistrations.organizationId, input.organizationId),
          eq(programRegistrations.sessionId, input.sessionId),
          inArray(programRegistrations.status, ["confirmed", "attended", "absent"])
        )
      );
    const confirmedTotal = Number(confirmedCount?.value ?? 0);
    const hasSpace = confirmedTotal < sessionRow.session.capacity;
    const shouldWaitlist = input.forceWaitlist || !hasSpace;
    if (shouldWaitlist && !sessionRow.session.waitlistEnabled) return { ok: false, message: "Session is full and waitlist is disabled." };

    let waitlistPosition: number | null = null;
    if (shouldWaitlist) {
      const [maxPosition] = await tx
        .select({ value: max(programRegistrations.waitlistPosition) })
        .from(programRegistrations)
        .where(and(eq(programRegistrations.organizationId, input.organizationId), eq(programRegistrations.sessionId, input.sessionId), eq(programRegistrations.status, "waitlisted")));
      waitlistPosition = Number(maxPosition?.value ?? 0) + 1;
    }

    const [record] = await tx
      .insert(programRegistrations)
      .values({
        id: `reg_${crypto.randomUUID()}`,
        organizationId: input.organizationId,
        sessionId: input.sessionId,
        customerId: input.customerId,
        status: shouldWaitlist ? "waitlisted" : "confirmed",
        waitlistPosition
      })
      .returning();
    return record
      ? { ok: true, record, message: record.status === "waitlisted" ? "Customer added to waitlist." : "Customer registered." }
      : { ok: false, message: "Registration could not be created." };
  });
}

export async function removeRegistration(registrationId: string, organizationId: string): Promise<ProgramMutationResult<ProgramRegistrationRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  if (!registrationId) return { ok: false, message: "Registration was not selected." };

  return database.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(programRegistrations)
      .where(and(eq(programRegistrations.id, registrationId), eq(programRegistrations.organizationId, organizationId)))
      .limit(1);
    if (!existing) return { ok: false, message: "Registration was not found for this organization." };
    if (existing.status === "cancelled") return { ok: false, message: "Registration is already cancelled." };

    const wasConfirmed = existing.status === "confirmed" || existing.status === "attended" || existing.status === "absent";
    const [record] = await tx
      .update(programRegistrations)
      .set({ status: "cancelled", waitlistPosition: null, updatedAt: new Date() })
      .where(and(eq(programRegistrations.id, registrationId), eq(programRegistrations.organizationId, organizationId)))
      .returning();
    if (wasConfirmed) await promoteNextWaitlistedRegistration(tx, organizationId, existing.sessionId);
    return record ? { ok: true, record, message: "Registration removed." } : { ok: false, message: "Registration could not be removed." };
  });
}

export async function markRegistrationAttendance(
  registrationId: string,
  organizationId: string,
  status: "attended" | "absent"
): Promise<ProgramMutationResult<ProgramRegistrationRecord>> {
  const database = getDatabase();
  if (!database) return { ok: false, message: "Database is unavailable." };
  const [record] = await database
    .update(programRegistrations)
    .set({ status, attendanceStatus: status, updatedAt: new Date() })
    .where(and(eq(programRegistrations.id, registrationId), eq(programRegistrations.organizationId, organizationId), ne(programRegistrations.status, "waitlisted")))
    .returning();
  return record ? { ok: true, record } : { ok: false, message: "Attendance can only be marked for confirmed registrations." };
}

export async function getProgramStatusCounts(): Promise<ProgramStatusCounts> {
  const database = getDatabase();
  if (!database) return { programs: 0, sessions: 0, registrations: 0, waitlists: 0 };
  const [programCount, sessionCount, registrationCount, waitlistCount] = await Promise.all([
    database.select({ value: count(programs.id) }).from(programs),
    database.select({ value: count(programSessions.id) }).from(programSessions),
    database.select({ value: count(programRegistrations.id) }).from(programRegistrations),
    database.select({ value: count(programRegistrations.id) }).from(programRegistrations).where(eq(programRegistrations.status, "waitlisted"))
  ]);
  return {
    programs: Number(programCount[0]?.value ?? 0),
    sessions: Number(sessionCount[0]?.value ?? 0),
    registrations: Number(registrationCount[0]?.value ?? 0),
    waitlists: Number(waitlistCount[0]?.value ?? 0)
  };
}

export async function getProgramDataModeCounts() {
  const database = getDatabase();
  if (!database) return { demo: 0, sandbox: 0, production: 0 };
  const rows = await database
    .select({ mode: organizations.dataMode, value: count(programs.id) })
    .from(programs)
    .innerJoin(organizations, eq(programs.organizationId, organizations.id))
    .groupBy(organizations.dataMode);
  return rows.reduce(
    (acc, row) => ({ ...acc, [row.mode]: Number(row.value) }),
    { demo: 0, sandbox: 0, production: 0 }
  );
}
