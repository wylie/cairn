import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { AUTH_COOKIE, encodeSession } from "@/lib/auth/session";
import { ORG_REGISTRY_COOKIE, buildProvisionedOrganization } from "@/lib/platform-admin/registry";

describe("middleware auth routing", () => {
  it("keeps root public", () => {
    const req = new NextRequest("http://localhost:3000/");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("redirects protected org routes to login when unauthenticated", () => {
    const req = new NextRequest("http://localhost:3000/o/summit/dashboard");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/o/summit/login?next=%2Fo%2Fsummit%2Fdashboard");
  });

  it("protects integrations routes under the staff portal", () => {
    const req = new NextRequest("http://localhost:3000/o/summit/integrations");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/o/summit/login?next=%2Fo%2Fsummit%2Fintegrations");
  });

  it("redirects customer portal routes to customer login when unauthenticated", () => {
    const req = new NextRequest("http://localhost:3000/p/summit/dashboard");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/p/summit/login?next=%2Fp%2Fsummit%2Fdashboard");
  });

  it("keeps facility landing page public", () => {
    const req = new NextRequest("http://localhost:3000/f/summit");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows public program discovery routes when unauthenticated", () => {
    const req = new NextRequest("http://localhost:3000/p/summit/programs");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows public waiver signing and kiosk routes when unauthenticated", () => {
    const waiverReq = new NextRequest("http://localhost:3000/p/summit/waivers/wtpl_general");
    const kioskReq = new NextRequest("http://localhost:3000/p/summit/kiosk/waivers");
    expect(middleware(waiverReq).status).toBe(200);
    expect(middleware(kioskReq).status).toBe(200);
  });

  it("redirects /admin to platform admin login when unauthenticated", () => {
    const req = new NextRequest("http://localhost:3000/admin");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login?next=%2Fadmin");
  });

  it("allows platform admin into /admin and redirects /login to /admin", () => {
    const session = encodeSession({
      userId: "auth_platform_admin",
      email: "platform@cairn.app",
      organizationSlugs: [],
      kind: "platform_admin"
    });
    const adminReq = new NextRequest("http://localhost:3000/admin", {
      headers: { cookie: `${AUTH_COOKIE}=${session}` }
    });
    const loginReq = new NextRequest("http://localhost:3000/login", {
      headers: { cookie: `${AUTH_COOKIE}=${session}` }
    });

    expect(middleware(adminReq).status).toBe(200);
    const loginRes = middleware(loginReq);
    expect(loginRes.status).toBe(307);
    expect(loginRes.headers.get("location")).toContain("/admin");
  });

  it("recognizes provisioned organization slugs from the registry cookie", () => {
    const record = buildProvisionedOrganization({
      name: "North Shore Camp",
      slug: "north-shore",
      facilityType: "Camp",
      primaryLocationName: "North Shore Base",
      ownerName: "Morgan Hale",
      ownerEmail: "morgan@northshore.example.com",
      primaryColor: "#0E9AC8",
      secondaryColor: "#1F2937",
      description: "Seasonal camp operations template."
    });
    const req = new NextRequest("http://localhost:3000/o/north-shore/dashboard", {
      headers: { cookie: `${ORG_REGISTRY_COOKIE}=${encodeURIComponent(JSON.stringify([record]))}` }
    });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/o/north-shore/login?next=%2Fo%2Fnorth-shore%2Fdashboard");
  });
});
