import { describe, expect, it } from "vitest";
import { resolveTenant, resolveOrganizationBySlug } from "@/lib/tenant/resolve";
import { customers } from "@/lib/mocks/customers";

describe("tenant resolution and data isolation", () => {
  it("resolves summit and riverbend slugs", () => {
    expect(resolveOrganizationBySlug("summit")?.id).toBe("org_summit");
    expect(resolveOrganizationBySlug("riverbend")?.id).toBe("org_riverbend");
  });

  it("returns null for invalid org slug", () => {
    expect(resolveTenant("nope")).toBeNull();
  });

  it("seed customers are organization-scoped", () => {
    const summit = customers.filter((entry) => entry.organizationId === "org_summit");
    const riverbend = customers.filter((entry) => entry.organizationId === "org_riverbend");
    expect(summit.length).toBeGreaterThan(0);
    expect(riverbend.length).toBeGreaterThan(0);
    expect(riverbend.some((entry) => summit.some((s) => s.id === entry.id))).toBe(false);
  });
});
