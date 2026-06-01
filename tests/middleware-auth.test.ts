import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

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
});
