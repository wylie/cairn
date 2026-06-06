import type {
  BillingAccount,
  BillingCreditEntry,
  BillingInvoice,
  BillingRefundRecord,
  BillingStatement,
  MembershipRenewalRecord
} from "@/types/domain";

export interface BillingProvider {
  processRenewal(input: {
    renewal: MembershipRenewalRecord;
    account: BillingAccount;
  }): { ok: boolean; message: string; processedAt: string };
  applyCredit(input: {
    account: BillingAccount;
    amountCents: number;
  }): { ok: boolean; message: string };
}

export interface InvoiceProvider {
  issueInvoice(input: {
    invoice: BillingInvoice;
  }): { ok: boolean; message: string; issuedAt: string };
  generateStatement(input: {
    statement: BillingStatement;
  }): { ok: boolean; message: string; generatedAt: string };
}

export interface RefundProvider {
  issueRefund(input: {
    refund: BillingRefundRecord;
  }): { ok: boolean; message: string; refundedAt: string };
}

export const mockBillingProvider: BillingProvider = {
  processRenewal(input) {
    if (input.renewal.renewalAmountCents <= 0) {
      return { ok: false, message: "Renewal amount must be greater than zero.", processedAt: new Date().toISOString() };
    }
    return {
      ok: true,
      message: `Mock renewal processed for ${input.renewal.renewalAmountCents} cents.`,
      processedAt: new Date().toISOString()
    };
  },
  applyCredit(input) {
    if (input.amountCents <= 0) {
      return { ok: false, message: "Credit amount must be greater than zero." };
    }
    return { ok: true, message: `Applied ${input.amountCents} cents of mock account credit.` };
  }
};

export const mockInvoiceProvider: InvoiceProvider = {
  issueInvoice(input) {
    return {
      ok: true,
      message: `Invoice ${input.invoice.invoiceNumber} is available.`,
      issuedAt: new Date().toISOString()
    };
  },
  generateStatement(input) {
    return {
      ok: true,
      message: `Statement ${input.statement.statementNumber} generated.`,
      generatedAt: new Date().toISOString()
    };
  }
};

export const mockRefundProvider: RefundProvider = {
  issueRefund(input) {
    return {
      ok: true,
      message: `Refund recorded for ${input.refund.amountCents} cents.`,
      refundedAt: new Date().toISOString()
    };
  }
};

export const billingProvider = mockBillingProvider;
export const invoiceProvider = mockInvoiceProvider;
export const refundProvider = mockRefundProvider;
