import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoSource = readFileSync(join(process.cwd(), "db/repositories/program-repository.ts"), "utf8");
const schemaSource = readFileSync(join(process.cwd(), "db/schema/programs.ts"), "utf8");
const migrationSource = readFileSync(join(process.cwd(), "db/migrations/0009_programs_registrations.sql"), "utf8");

describe("program and registration persistence boundaries", () => {
  it("defines Neon tables for programs, sessions, and registrations", () => {
    expect(schemaSource).toContain("export const programs = pgTable");
    expect(schemaSource).toContain("export const programSessions = pgTable");
    expect(schemaSource).toContain("export const programRegistrations = pgTable");
    expect(schemaSource).toContain("organizationId");
    expect(schemaSource).toContain("facilityId");
    expect(schemaSource).toContain("waitlistEnabled");
  });

  it("adds migration constraints and indexes for organization-scoped registration integrity", () => {
    expect(migrationSource).toContain('CREATE TABLE "programs"');
    expect(migrationSource).toContain('CREATE TABLE "program_sessions"');
    expect(migrationSource).toContain('CREATE TABLE "program_registrations"');
    expect(migrationSource).toContain("program_registrations_one_active_customer_session_idx");
    expect(migrationSource).toContain("WHERE \"status\" IN ('confirmed', 'waitlisted', 'attended', 'absent')");
    expect(migrationSource).toContain("program_registrations_waitlist_idx");
    expect(migrationSource).toContain("program_sessions_organization_starts_idx");
  });

  it("keeps capacity, duplicate prevention, waitlists, and promotion in the repository", () => {
    expect(repoSource).toContain("registerCustomerForSession");
    expect(repoSource).toContain("database.transaction");
    expect(repoSource).toContain("Customer is already registered or waitlisted for this session.");
    expect(repoSource).toContain("confirmedTotal < sessionRow.session.capacity");
    expect(repoSource).toContain("status: shouldWaitlist ? \"waitlisted\" : \"confirmed\"");
    expect(repoSource).toContain("promoteNextWaitlistedRegistration");
  });

  it("requires organization scope before program, session, and registration writes", () => {
    expect(repoSource).toContain("eq(programs.organizationId, organizationId)");
    expect(repoSource).toContain("eq(programSessions.organizationId, organizationId)");
    expect(repoSource).toContain("eq(programRegistrations.organizationId, input.organizationId)");
    expect(repoSource).toContain("eq(customers.organizationId, input.organizationId)");
    expect(repoSource).toContain("assertFacilityScope");
    expect(repoSource).toContain("assertStaffScope");
  });
});
