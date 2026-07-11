import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "app/(app)/programs/page.tsx"), "utf8");
const actionSource = readFileSync(join(process.cwd(), "app/(app)/programs/actions.ts"), "utf8");

describe("Programs page persistence wiring", () => {
  it("uses server repositories instead of customer mock state", () => {
    expect(pageSource).toContain("getProgramsByOrganization");
    expect(pageSource).toContain("getSessionsByOrganization");
    expect(pageSource).toContain("getActiveFacilityContext");
    expect(pageSource).not.toContain("useCustomerState");
    expect(pageSource).not.toContain("ProgramCatalog");
  });

  it("exposes program and session lifecycle actions", () => {
    expect(actionSource).toContain("createProgramAction");
    expect(actionSource).toContain("updateProgramAction");
    expect(actionSource).toContain("deleteProgramAction");
    expect(actionSource).toContain("createProgramSessionAction");
    expect(actionSource).toContain("updateProgramSessionAction");
    expect(actionSource).toContain("setProgramSessionStatusAction");
  });

  it("renders capacity, waitlist, empty-state, and admin navigation copy", () => {
    expect(pageSource).toContain("Neon-backed program catalog, sessions, capacity, and waitlists.");
    expect(pageSource).toContain("No programs yet. Create the first program to start scheduling sessions.");
    expect(pageSource).toContain("Waitlist enabled");
    expect(pageSource).toContain("Delete or Archive Program");
    expect(pageSource).toContain("Manage Registrations");
  });
});
