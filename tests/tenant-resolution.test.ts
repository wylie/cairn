import { beforeEach, describe, expect, it } from "vitest";
import { resolveTenant, resolveOrganizationBySlug } from "@/lib/tenant/resolve";
import { customers } from "@/lib/mocks/customers";
import { ORG_REGISTRY_COOKIE, buildProvisionedOrganization } from "@/lib/platform-admin/registry";

describe("tenant resolution and data isolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = `${ORG_REGISTRY_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

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

  it("synthesizes a default location for provisioned runtime organizations", () => {
    const record = buildProvisionedOrganization({
      name: "North Shore Camp",
      slug: "north-shore",
      facilityType: "Camp",
      primaryLocationName: "North Shore Base",
      ownerName: "Morgan Hale",
      ownerEmail: "morgan@northshore.example.com",
      primaryColor: "#0E9AC8",
      secondaryColor: "#1F2937",
      description: ""
    });
    window.localStorage.setItem("cairn_platform_org_registry", JSON.stringify([record]));
    document.cookie = `${ORG_REGISTRY_COOKIE}=${encodeURIComponent(JSON.stringify([record]))}; path=/`;

    const tenant = resolveTenant("north-shore");
    expect(tenant?.organizationName).toBe("North Shore Camp");
    expect(tenant?.allowedLocations[0]?.name).toBe("North Shore Base");
    expect(tenant?.currentLocationId).toBe("loc_north-shore_primary");
  });
});
