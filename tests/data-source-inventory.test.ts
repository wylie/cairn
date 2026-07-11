import { dataSourceInventory } from "@/lib/data-sources";

describe("data source inventory", () => {
  it("marks completed customer and household workflows as Neon-backed", () => {
    const statuses = new Map(dataSourceInventory.map((entry) => [entry.module, entry.status]));

    expect(statuses.get("Customers")).toBe("Neon-backed");
    expect(statuses.get("Customer Search")).toBe("Neon-backed");
    expect(statuses.get("Customer Create/Edit/Delete")).toBe("Neon-backed");
    expect(statuses.get("Households")).toBe("Neon-backed");
    expect(statuses.get("Household Create/Edit/Delete")).toBe("Neon-backed");
    expect(statuses.get("Customer-Household Relationships")).toBe("Neon-backed");
  });

  it("keeps deferred customer-adjacent workflows out of the completed migration", () => {
    const statuses = new Map(dataSourceInventory.map((entry) => [entry.module, entry.status]));

    expect(statuses.get("Memberships")).toBe("Demo-backed");
    expect(statuses.get("Check-ins")).toBe("Demo-backed");
    expect(statuses.get("Programs")).toBe("Demo-backed");
    expect(statuses.get("Registrations")).toBe("Demo-backed");
    expect(statuses.get("POS")).toBe("Demo-backed");
  });
});
