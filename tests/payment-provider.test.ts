import { describe, expect, it } from "vitest";
import { mockPaymentProvider } from "@/lib/payments/provider";

describe("mockPaymentProvider", () => {
  it("approves card and returns last4", () => {
    const result = mockPaymentProvider.charge({
      amountCents: 2800,
      method: "card",
      customerId: "cust_001",
      locationId: "loc_001",
      organizationId: "org_summit",
      initiatedByStaffId: "staff_001"
    });

    expect(result.ok).toBe(true);
    expect(result.last4).toBe("4242");
    expect(result.processorName).toBe("Mock Payments");
  });

  it("approves comp", () => {
    const result = mockPaymentProvider.charge({
      amountCents: 0,
      method: "comp",
      locationId: "loc_001",
      organizationId: "org_summit"
    });

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/comp approved/i);
  });
});
