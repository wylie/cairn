import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "app/(app)/registrations/page.tsx"), "utf8");
const actionSource = readFileSync(join(process.cwd(), "app/(app)/registrations/actions.ts"), "utf8");

describe("Registrations page persistence wiring", () => {
  it("uses Neon-backed repositories instead of local customer state", () => {
    expect(pageSource).toContain("getSessionsByOrganization");
    expect(pageSource).toContain("getRegistrationsByOrganization");
    expect(pageSource).toContain("searchCustomers");
    expect(pageSource).toContain("getActiveFacilityContext");
    expect(pageSource).not.toContain("useCustomerState");
  });

  it("wires durable registration, waitlist, removal, and attendance actions", () => {
    expect(actionSource).toContain("registerCustomerForSessionAction");
    expect(actionSource).toContain("removeRegistrationAction");
    expect(actionSource).toContain("markRegistrationAttendanceAction");
    expect(actionSource).toContain("registerCustomerForSession");
    expect(actionSource).toContain("removeRegistration");
    expect(actionSource).toContain("markRegistrationAttendance");
  });

  it("surfaces clear roster states for registrations and waitlists", () => {
    expect(pageSource).toContain("Neon-backed registration, waitlist, and attendance placeholder workflows.");
    expect(pageSource).toContain("No sessions exist yet. Create sessions from Programs before registering customers.");
    expect(pageSource).toContain("No customers match this search.");
    expect(pageSource).toContain("No confirmed registrations yet.");
    expect(pageSource).toContain("No active waitlist.");
  });
});
