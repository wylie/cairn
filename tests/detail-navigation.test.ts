import { buildCustomerDetailHref, resolveDetailBackLink, sourceFromPath } from "@/lib/navigation/detail-navigation";

describe("detail navigation helpers", () => {
  it("builds customer detail href with check-in source and return path", () => {
    const href = buildCustomerDetailHref({
      customerId: "cust_002",
      currentPathname: "/check-in",
      currentSearch: "query=maya&filter=eligible"
    });
    expect(href).toContain("/customers/cust_002?");
    expect(href).toContain("from=check-in");
    expect(href).toContain("returnTo=%2Fcheck-in%3Fquery%3Dmaya%26filter%3Deligible");
  });

  it("resolves context-aware back link from search params", () => {
    const link = resolveDetailBackLink(new URLSearchParams("from=registrations&returnTo=%2Fregistrations%3Fstatus%3Dwaitlisted"));
    expect(link.label).toBe("← Back to Registrations");
    expect(link.href).toBe("/registrations?status=waitlisted");
  });

  it("falls back safely to customers when returnTo is missing or unsafe", () => {
    const missing = resolveDetailBackLink(new URLSearchParams(""));
    expect(missing.label).toBe("← Back to Customers");
    expect(missing.href).toBe("/customers");

    const unsafe = resolveDetailBackLink(new URLSearchParams("from=check-in&returnTo=//evil.example"));
    expect(unsafe.href).toBe("/customers");
  });

  it("maps known operational paths to sources", () => {
    expect(sourceFromPath("/check-in")).toBe("check-in");
    expect(sourceFromPath("/pos")).toBe("pos");
    expect(sourceFromPath("/registrations")).toBe("registrations");
    expect(sourceFromPath("/customers")).toBe("customers");
  });
});

