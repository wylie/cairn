import { describe, expect, it } from "vitest";
import { resolveTenant, resolveOrganizationBySlug } from "@/lib/tenant/resolve";
import { customers } from "@/lib/mocks/customers";

describe("tenant resolution and data isolation", () => {
  it("resolves summit and fiddlehead slugs", () => {
    expect(resolveOrganizationBySlug("summit")?.id).toBe("org_summit");
    expect(resolveOrganizationBySlug("fiddlehead")?.id).toBe("org_fiddlehead");
  });

  it("returns null for invalid org slug", () => {
    expect(resolveTenant("nope")).toBeNull();
  });

  it("seed customers are organization-scoped", () => {
    const summit = customers.filter((entry) => entry.organizationId === "org_summit");
    const fiddlehead = customers.filter((entry) => entry.organizationId === "org_fiddlehead");
    expect(summit.length).toBeGreaterThan(0);
    expect(fiddlehead.length).toBeGreaterThan(0);
    expect(fiddlehead.some((entry) => summit.some((s) => s.id === entry.id))).toBe(false);
  });
});
