import { describe, expect, it } from "vitest";
import { householdMembers } from "@/lib/mocks/households";
import { getVisibleCustomerIds } from "@/lib/portal/visibility";

describe("portal visibility boundaries", () => {
  it("returns self only when customer has no household management permissions", () => {
    const ids = getVisibleCustomerIds("cust_004", householdMembers);
    expect(ids).toEqual(["cust_004"]);
  });

  it("returns household members when customer can manage household", () => {
    const ids = getVisibleCustomerIds("cust_003", householdMembers);
    expect(ids).toContain("cust_003");
    expect(ids.length).toBeGreaterThan(1);
  });
});
