export type PaymentMethod = "card" | "cash" | "comp" | "gift_card" | "account_credit" | "split";

export interface PaymentChargeRequest {
  amountCents: number;
  method: PaymentMethod;
  splitBreakdown?: Array<{ method: Exclude<PaymentMethod, "split">; amountCents: number }>;
  customerId?: string;
  locationId: string;
  organizationId: string;
  initiatedByStaffId?: string;
}

export interface PaymentChargeResult {
  ok: boolean;
  approvalCode?: string;
  processorName: string;
  method: PaymentMethod;
  last4?: string;
  message: string;
}

export interface PaymentProvider {
  charge(request: PaymentChargeRequest): PaymentChargeResult;
  refund?(request: { transactionId: string; amountCents: number; reason: string }): { ok: boolean; message: string };
}

export const mockPaymentProvider: PaymentProvider = {
  charge(request) {
    if (request.amountCents < 0) {
      return {
        ok: false,
        processorName: "Mock Payments",
        method: request.method,
        message: "Invalid charge amount."
      };
    }

    if (request.method === "comp") {
      return {
        ok: true,
        processorName: "Mock Payments",
        method: request.method,
        approvalCode: `COMP-${request.locationId.slice(-3)}-${request.amountCents}`,
        message: "Comp approved."
      };
    }

    if (request.method === "card") {
      return {
        ok: true,
        processorName: "Mock Payments",
        method: request.method,
        approvalCode: `APP-${request.organizationId.slice(-4)}-${request.amountCents}`,
        last4: "4242",
        message: "Card approved."
      };
    }

    if (request.method === "split") {
      const parts = request.splitBreakdown ?? [];
      const total = parts.reduce((sum, entry) => sum + Math.max(0, Math.round(entry.amountCents)), 0);
      if (parts.length === 0) {
        return {
          ok: false,
          processorName: "Mock Payments",
          method: request.method,
          message: "Split payment requires at least one payment segment."
        };
      }
      if (total !== request.amountCents) {
        return {
          ok: false,
          processorName: "Mock Payments",
          method: request.method,
          message: "Split payment amounts must equal total owed."
        };
      }
      return {
        ok: true,
        processorName: "Mock Payments",
        method: request.method,
        approvalCode: `SPLIT-${request.organizationId.slice(-4)}-${request.amountCents}`,
        message: "Split payment approved."
      };
    }

    return {
      ok: true,
      processorName: "Mock Payments",
      method: request.method,
      approvalCode: `OK-${request.method}-${request.amountCents}`,
      message: "Payment approved."
    };
  }
};
