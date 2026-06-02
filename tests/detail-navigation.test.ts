import { buildCustomerDetailHref, resolveContextBackLink, sourceFromPath } from "@/lib/navigation/detail-navigation";

describe("detail navigation helpers", () => {
  it("builds customer detail href with check-in source and return path", () => {
    const href = buildCustomerDetailHref({
      customerId: "cust_002",
      currentPathname: "/check-in",
      currentSearch: "query=maya&filter=eligible"
    });
    expect(href).toContain("/customers/cust_002?");
    expect(href).toContain("from=check-in");
    expect(href).toContain("fromLabel=Check-In");
    expect(href).toContain("returnTo=%2Fcheck-in%3Fquery%3Dmaya%26filter%3Deligible");
  });

  it("includes org context when launched from an org-scoped workflow", () => {
    const href = buildCustomerDetailHref({
      customerId: "cust_002",
      currentPathname: "/o/summit/check-in",
      currentSearch: "query=maya"
    });
    expect(href).toContain("contextOrg=summit");
  });

  it("resolves context-aware back link from search params", () => {
    const link = resolveContextBackLink(new URLSearchParams("from=registrations&returnTo=%2Fo%2Fsummit%2Fregistrations%3Fstatus%3Dwaitlisted"));
    expect(link.label).toBe("← Back to Registrations");
    expect(link.href).toBe("/o/summit/registrations?status=waitlisted");
  });

  it("falls back safely to customers when returnTo is missing or unsafe", () => {
    const missing = resolveContextBackLink(new URLSearchParams(""));
    expect(missing.label).toBe("← Back to Customers");
    expect(missing.href).toBe("/customers");

    const unsafe = resolveContextBackLink(new URLSearchParams("from=check-in&returnTo=//evil.example"));
    expect(unsafe.href).toBe("/customers");

    const external = resolveContextBackLink(new URLSearchParams("from=reports&returnTo=https%3A%2F%2Fevil.example"));
    expect(external.href).toBe("/customers");
  });

  it("rejects return routes that jump across orgs when fallback is org-scoped", () => {
    const link = resolveContextBackLink(
      new URLSearchParams("from=check-in&contextOrg=summit&returnTo=%2Fo%2Friverbend%2Fcheck-in%3Ffilter%3Dkids"),
      "/o/summit/customers",
      "Customers"
    );
    expect(link.href).toBe("/o/summit/customers");
  });

  it("maps known operational paths to sources", () => {
    expect(sourceFromPath("/check-in")).toBe("check-in");
    expect(sourceFromPath("/pos")).toBe("pos");
    expect(sourceFromPath("/registrations")).toBe("registrations");
    expect(sourceFromPath("/customers")).toBe("customers");
    expect(sourceFromPath("/waivers")).toBe("waivers");
  });
});
