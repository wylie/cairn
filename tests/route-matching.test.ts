import { describe, expect, it } from "vitest";
import { getActiveRouteHref, isRouteActive } from "@/lib/navigation/route-matching";

describe("route matching", () => {
  it("matches exact and child routes without partial sibling matches", () => {
    expect(isRouteActive("/o/summit/customers/cust_001", "/o/summit/customers")).toBe(true);
    expect(isRouteActive("/o/summit/customer-service", "/o/summit/customers")).toBe(false);
    expect(isRouteActive("/o/summit/products", "/o/summit/pos")).toBe(false);
  });

  it("keeps platform admin dashboard independent from child routes", () => {
    const items = [{ href: "/admin" }, { href: "/admin/support" }, { href: "/admin/organizations" }];
    expect(getActiveRouteHref("/admin", items, { exactHrefs: ["/admin"] })).toBe("/admin");
    expect(getActiveRouteHref("/admin/support", items, { exactHrefs: ["/admin"] })).toBe("/admin/support");
    expect(getActiveRouteHref("/admin/organizations/new", items, { exactHrefs: ["/admin"] })).toBe("/admin/organizations");
  });
});
