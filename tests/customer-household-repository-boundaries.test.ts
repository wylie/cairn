import { readFileSync } from "node:fs";
import { join } from "node:path";

function readProjectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("customer and household repository boundaries", () => {
  it("does not expose unscoped customer or household read helpers", () => {
    const customerRepository = readProjectFile("db/repositories/customer-repository.ts");
    const householdRepository = readProjectFile("db/repositories/household-repository.ts");

    expect(customerRepository).not.toMatch(/export async function getCustomer\(/);
    expect(customerRepository).not.toMatch(/export async function getCustomers\(/);
    expect(customerRepository).not.toMatch(/export async function findDuplicateCustomer\(/);
    expect(householdRepository).not.toMatch(/export async function getHousehold\(/);
    expect(householdRepository).not.toMatch(/export async function getHouseholds\(/);
  });

  it("keeps customer and household UI routes/components off the raw database client", () => {
    const checkedFiles = [
      "app/(app)/customers/page.tsx",
      "app/(app)/customers/[id]/page.tsx",
      "app/(app)/customers/actions.ts",
      "app/(app)/households/page.tsx",
      "app/(app)/households/[id]/page.tsx",
      "app/(app)/households/actions.ts",
      "components/customers/customer-list.tsx",
      "components/customers/customer-detail-view.tsx",
      "components/households/households-workspace.tsx"
    ];

    for (const file of checkedFiles) {
      const source = readProjectFile(file);
      expect(source, file).not.toMatch(/from ["']@\/db["']/);
      expect(source, file).not.toMatch(/\bgetDatabase\b/);
    }
  });
});
