import { readFileSync } from "node:fs";
import { join } from "node:path";

function readProjectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("membership and check-in persistence boundaries", () => {
  it("exports Neon schema for memberships and check-ins", () => {
    const schemaIndex = readProjectFile("db/schema/index.ts");
    const membershipsSchema = readProjectFile("db/schema/memberships.ts");
    const checkInsSchema = readProjectFile("db/schema/check-ins.ts");

    expect(schemaIndex).toContain('export * from "./memberships";');
    expect(schemaIndex).toContain('export * from "./check-ins";');
    expect(membershipsSchema).toContain('export const membershipPlans = pgTable("membership_plans"');
    expect(membershipsSchema).toContain('export const memberships = pgTable("memberships"');
    expect(membershipsSchema).toContain("organizationId: text(\"organization_id\")");
    expect(membershipsSchema).toContain("facilityId: text(\"facility_id\")");
    expect(checkInsSchema).toContain('export const checkIns = pgTable("check_ins"');
    expect(checkInsSchema).toContain("organizationId: text(\"organization_id\")");
    expect(checkInsSchema).toContain("facilityId: text(\"facility_id\")");
    expect(checkInsSchema).toContain("customerId: text(\"customer_id\")");
  });

  it("adds database safeguards for ownership and duplicate active check-ins", () => {
    const migration = readProjectFile("db/migrations/0007_memberships_checkins.sql");

    expect(migration).toContain('CREATE TYPE "public"."membership_owner_type"');
    expect(migration).toContain('CREATE TABLE "membership_plans"');
    expect(migration).toContain('CREATE TABLE "memberships"');
    expect(migration).toContain('CREATE TABLE "check_ins"');
    expect(migration).toContain("memberships_owner_target_check");
    expect(migration).toContain("check_ins_one_active_customer_per_org_idx");
    expect(migration).toContain('WHERE "checked_out_at" IS NULL');
    expect(migration).toContain('FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")');
    expect(migration).toContain('FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id")');
  });

  it("keeps active membership and check-in routes on repositories instead of localStorage state", () => {
    const activeFiles = [
      "app/(app)/memberships/page.tsx",
      "app/(app)/memberships/actions.ts",
      "app/(app)/check-in/page.tsx",
      "app/(app)/check-in/actions.ts"
    ].map(readProjectFile);

    for (const contents of activeFiles) {
      expect(contents).not.toContain("localStorage");
      expect(contents).not.toContain("useCustomerState");
      expect(contents).not.toContain("@/db\"");
      expect(contents).not.toContain("@/db/index");
    }

    expect(activeFiles.join("\n")).toContain("@/db/repositories/membership-repository");
    expect(activeFiles.join("\n")).toContain("@/db/repositories/check-in-repository");
  });

  it("centralizes access decisions and attendance integrity in repositories", () => {
    const membershipRepository = readProjectFile("db/repositories/membership-repository.ts");
    const checkInRepository = readProjectFile("db/repositories/check-in-repository.ts");

    expect(membershipRepository).toContain("export async function getActiveAccessForCustomer");
    expect(membershipRepository).toContain("eq(memberships.organizationId, organizationId)");
    expect(membershipRepository).toContain("eq(memberships.facilityId, facilityId)");
    expect(membershipRepository).toContain("eq(memberships.status, \"active\")");
    expect(membershipRepository).toContain("eq(memberships.householdId, customer.householdId)");

    expect(checkInRepository).toContain("export async function checkInCustomer");
    expect(checkInRepository).toContain("export async function checkOutCustomer");
    expect(checkInRepository).toContain("eq(checkIns.organizationId, input.organizationId)");
    expect(checkInRepository).toContain("eq(checkIns.customerId, input.customerId)");
    expect(checkInRepository).toContain("isNull(checkIns.checkedOutAt)");
    expect(checkInRepository).toContain("return { ok: false, message: \"Customer is already checked in.");
    expect(checkInRepository).toContain("return record ? { ok: true, record } : { ok: false, message: \"No active check-in was found.\"");
  });
});
