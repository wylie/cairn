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
    expect(res.headers.get("location")).toContain("/login?next=%2Fo%2Fsummit%2Fdashboard");
  });

  it("redirects customer portal routes to customer login when unauthenticated", () => {
    const req = new NextRequest("http://localhost:3000/p/summit/dashboard");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/p/login?next=%2Fp%2Fsummit%2Fdashboard");
  });
});
