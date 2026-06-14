import { describe, expect, it } from "vitest";
import { getStaffLoginPath } from "@/lib/tenant/path";

describe("tenant paths", () => {
  it("returns staff to the facility login for the current route", () => {
    expect(getStaffLoginPath("/o/riverbend/check-in", "summit")).toBe("/o/riverbend/login");
  });

  it("uses a safe fallback when no organization route exists", () => {
    expect(getStaffLoginPath("/dashboard", "summit")).toBe("/o/summit/login");
  });
});
