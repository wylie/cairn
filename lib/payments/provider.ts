export type PaymentMethod = "card" | "cash" | "comp" | "gift_card" | "account_credit";

export interface PaymentChargeRequest {
  amountCents: number;
  method: PaymentMethod;
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

    return {
      ok: true,
      processorName: "Mock Payments",
      method: request.method,
      approvalCode: `OK-${request.method}-${request.amountCents}`,
      message: "Payment approved."
    };
  }
};
