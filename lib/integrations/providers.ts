import type { CommunicationSendRequest } from "@/types/domain";
import type { PaymentChargeRequest } from "@/lib/payments/provider";
import { mockPaymentProvider } from "@/lib/payments/provider";
import type { IntegrationProviderResult } from "@/types/domain";

function buildResult(provider: string, message: string, externalIdPrefix: string): IntegrationProviderResult {
  return {
    ok: true,
    provider,
    message,
    syncedAt: new Date().toISOString(),
    externalId: `${externalIdPrefix}_${Math.random().toString(36).slice(2, 10)}`
  };
}

export interface CalendarProvider {
  createEvent(input: { title: string; startsAt: string; endsAt: string; locationName?: string }): Promise<IntegrationProviderResult>;
  updateEvent(input: { externalId: string; title?: string; startsAt?: string; endsAt?: string }): Promise<IntegrationProviderResult>;
}

export interface EmailIntegrationProvider {
  send(request: CommunicationSendRequest): Promise<IntegrationProviderResult>;
}

export interface SmsIntegrationProvider {
  send(request: CommunicationSendRequest): Promise<IntegrationProviderResult>;
}

export interface PaymentIntegrationProvider {
  charge(request: PaymentChargeRequest): Promise<IntegrationProviderResult>;
  refund(request: { transactionId: string; amountCents: number; reason: string }): Promise<IntegrationProviderResult>;
}

export interface IdentityProvider {
  provisionAccount(input: { email: string; name: string; role?: string }): Promise<IntegrationProviderResult>;
}

export interface AccountingProvider {
  exportInvoice(input: { invoiceNumber: string; totalCents: number; customerName: string }): Promise<IntegrationProviderResult>;
}

export const calendarProvider: CalendarProvider = {
  async createEvent(input) {
    return buildResult("Mock Calendar", `Prepared calendar event for ${input.title}.`, "cal");
  },
  async updateEvent(input) {
    return buildResult("Mock Calendar", `Prepared calendar update for ${input.externalId}.`, "cal_update");
  }
};

export const emailProvider: EmailIntegrationProvider = {
  async send(request) {
    return buildResult("Mock Email", `Prepared email for ${request.recipients.length} recipient(s).`, "email");
  }
};

export const smsProvider: SmsIntegrationProvider = {
  async send(request) {
    return buildResult("Mock SMS", `Prepared SMS for ${request.recipients.length} recipient(s).`, "sms");
  }
};

export const paymentProvider: PaymentIntegrationProvider = {
  async charge(request) {
    const result = mockPaymentProvider.charge(request);
    return {
      ok: result.ok,
      provider: result.processorName,
      message: result.message,
      syncedAt: new Date().toISOString(),
      externalId: result.approvalCode
    };
  },
  async refund(request) {
    return buildResult("Mock Payments", `Prepared refund for ${request.transactionId}.`, "refund");
  }
};

export const identityProvider: IdentityProvider = {
  async provisionAccount(input) {
    return buildResult("Mock Identity", `Prepared identity account for ${input.email}.`, "idp");
  }
};

export const accountingProvider: AccountingProvider = {
  async exportInvoice(input) {
    return buildResult("Mock Accounting", `Prepared invoice export for ${input.invoiceNumber}.`, "acct");
  }
};
