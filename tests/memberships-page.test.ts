import { readFileSync } from "node:fs";
import { join } from "node:path";

function readProjectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Memberships workspace", () => {
  it("renders the server-backed membership workspace surfaces", () => {
    const page = readProjectFile("app/(app)/memberships/page.tsx");

    expect(page).toContain('data-testid="memberships-workspace"');
    expect(page).toContain('aria-label="membership-list"');
    expect(page).toContain('aria-label="membership-detail-panel"');
    expect(page).toContain("Sell / Create Membership");
    expect(page).toContain("Create Membership");
    expect(page).toContain("Save Membership");
    expect(page).toContain("@/db/repositories/membership-repository");
  });

  it("uses server actions for membership create, edit, and status transitions", () => {
    const page = readProjectFile("app/(app)/memberships/page.tsx");
    const actions = readProjectFile("app/(app)/memberships/actions.ts");

    expect(page).toContain("createMembershipAction");
    expect(page).toContain("updateMembershipAction");
    expect(page).toContain("setMembershipStatusAction");
    expect(actions).toContain("export async function createMembershipAction");
    expect(actions).toContain("export async function updateMembershipAction");
    expect(actions).toContain("export async function setMembershipStatusAction");
    expect(actions).toContain("getActiveFacilityContext");
  });

  it("does not use the old client mock customer state for active membership workflows", () => {
    const page = readProjectFile("app/(app)/memberships/page.tsx");
    const actions = readProjectFile("app/(app)/memberships/actions.ts");

    expect(page).not.toContain("useCustomerState");
    expect(actions).not.toContain("useCustomerState");
    expect(page).not.toContain("localStorage");
    expect(actions).not.toContain("localStorage");
  });
});
