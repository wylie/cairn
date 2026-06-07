import type {
  BillingAccount,
  BillingCreditEntry,
  BillingInvoice,
  BillingRefundRecord,
  BillingStatement,
  MembershipRenewalRecord
} from "@/types/domain";
import { dateKeyAtOffset, isoAtOffset } from "@/lib/demo/dates";

export const billingAccounts: BillingAccount[] = [
  {
    id: "billacct_hh_001",
    organizationId: "org_summit",
    locationId: "loc_001",
    ownerType: "household",
    ownerId: "hh_001",
    primaryBillingCustomerId: "cust_003",
    status: "due",
    currentBalanceCents: -8500,
    availableCreditCents: 0,
    autoApplyCredits: true,
    paymentMethodTypes: ["credit_card", "store_credit"],
    lastPaymentMethodLabel: "Visa ending 4242",
    createdAt: isoAtOffset(-66, 10, 0),
    updatedAt: isoAtOffset(-1, 8, 45)
  },
  {
    id: "billacct_hh_003",
    organizationId: "org_summit",
    locationId: "loc_001",
    ownerType: "household",
    ownerId: "hh_003",
    primaryBillingCustomerId: "cust_001",
    status: "credit",
    currentBalanceCents: 5000,
    availableCreditCents: 5000,
    autoApplyCredits: true,
    paymentMethodTypes: ["credit_card", "store_credit"],
    lastPaymentMethodLabel: "Visa ending 4242",
    createdAt: isoAtOffset(-90, 13, 15),
    updatedAt: isoAtOffset(-2, 11, 20)
  },
  {
    id: "billacct_cust_005",
    organizationId: "org_summit",
    locationId: "loc_001",
    ownerType: "customer",
    ownerId: "cust_005",
    primaryBillingCustomerId: "cust_005",
    status: "current",
    currentBalanceCents: 0,
    availableCreditCents: 0,
    autoApplyCredits: false,
    paymentMethodTypes: ["cash"],
    lastPaymentMethodLabel: "Pay at front desk",
    createdAt: isoAtOffset(-18, 10, 30),
    updatedAt: isoAtOffset(0, 10, 25)
  }
];

export const billingCreditEntries: BillingCreditEntry[] = [
  {
    id: "billcred_001",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_003",
    amountCents: 5000,
    action: "add",
    reason: "Store credit from partial membership refund",
    householdId: "hh_003",
    customerId: "cust_001",
    refundId: "billrefund_001",
    createdAt: isoAtOffset(-2, 11, 20),
    createdByStaffId: "staff_002",
    createdByStaffName: "Maya Lopez"
  },
  {
    id: "billcred_002",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_001",
    amountCents: 1500,
    action: "apply",
    reason: "Applied loyalty credit to camp invoice",
    householdId: "hh_001",
    customerId: "cust_003",
    invoiceId: "inv_002",
    createdAt: isoAtOffset(-5, 9, 0),
    createdByStaffId: "staff_001",
    createdByStaffName: "Taylor Nguyen"
  }
];

export const billingInvoices: BillingInvoice[] = [
  {
    id: "inv_001",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_003",
    invoiceNumber: "INV-2026-001",
    issueDate: dateKeyAtOffset(-25),
    dueDate: dateKeyAtOffset(-25),
    status: "paid",
    lineItems: [
      {
        id: "invitem_001",
        label: "Unlimited Access renewal",
        category: "membership",
        quantity: 1,
        unitAmountCents: 10900,
        lineTotalCents: 10900,
        customerId: "cust_001",
        householdId: "hh_003",
        membershipId: "mem_001"
      }
    ],
    subtotalCents: 10900,
    taxCents: 0,
    discountCents: 0,
    totalCents: 10900,
    appliedCreditCents: 0,
    balanceCents: 0,
    customerId: "cust_001",
    householdId: "hh_003",
    membershipId: "mem_001",
    renewalId: "renew_001",
    transactionId: "txn_seed_003",
    notes: "Auto-renewal completed successfully.",
    createdAt: isoAtOffset(-25, 7, 0),
    updatedAt: isoAtOffset(-25, 7, 5)
  },
  {
    id: "inv_002",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_001",
    invoiceNumber: "INV-2026-014",
    issueDate: dateKeyAtOffset(-5),
    dueDate: dateKeyAtOffset(2),
    status: "overdue",
    lineItems: [
      {
        id: "invitem_002",
        label: "Youth Camp Seasonal renewal",
        category: "membership",
        quantity: 1,
        unitAmountCents: 10000,
        lineTotalCents: 10000,
        customerId: "cust_003",
        householdId: "hh_001",
        membershipId: "mem_003"
      }
    ],
    subtotalCents: 10000,
    taxCents: 0,
    discountCents: 0,
    totalCents: 10000,
    appliedCreditCents: 1500,
    balanceCents: 8500,
    customerId: "cust_003",
    householdId: "hh_001",
    membershipId: "mem_003",
    renewalId: "renew_002",
    notes: "Retry after billing contact update.",
    createdAt: isoAtOffset(-5, 8, 0),
    updatedAt: isoAtOffset(-1, 9, 10)
  },
  {
    id: "inv_003",
    organizationId: "org_summit",
    billingAccountId: "billacct_cust_005",
    invoiceNumber: "INV-2026-021",
    issueDate: dateKeyAtOffset(0),
    dueDate: dateKeyAtOffset(7),
    status: "open",
    lineItems: [
      {
        id: "invitem_003",
        label: "Starter Membership renewal",
        category: "membership",
        quantity: 1,
        unitAmountCents: 8500,
        lineTotalCents: 8500,
        customerId: "cust_005",
        membershipId: "mem_004"
      }
    ],
    subtotalCents: 8500,
    taxCents: 0,
    discountCents: 0,
    totalCents: 8500,
    appliedCreditCents: 0,
    balanceCents: 8500,
    customerId: "cust_005",
    membershipId: "mem_004",
    renewalId: "renew_003",
    createdAt: isoAtOffset(0, 8, 0)
  }
];

export const billingStatements: BillingStatement[] = [
  {
    id: "stmt_001",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_001",
    statementNumber: "STMT-2026-001",
    statementDate: dateKeyAtOffset(0),
    periodStart: dateKeyAtOffset(-30),
    periodEnd: dateKeyAtOffset(-1),
    invoiceIds: ["inv_002"],
    chargesCents: 10000,
    creditsCents: 1500,
    paymentsCents: 0,
    refundsCents: 0,
    balanceCents: 8500,
    customerId: "cust_003",
    householdId: "hh_001",
    createdAt: isoAtOffset(0, 8, 30)
  },
  {
    id: "stmt_002",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_003",
    statementNumber: "STMT-2026-002",
    statementDate: dateKeyAtOffset(0),
    periodStart: dateKeyAtOffset(-30),
    periodEnd: dateKeyAtOffset(-1),
    invoiceIds: ["inv_001"],
    chargesCents: 10900,
    creditsCents: 5000,
    paymentsCents: 10900,
    refundsCents: 2000,
    balanceCents: 5000,
    customerId: "cust_001",
    householdId: "hh_003",
    createdAt: isoAtOffset(0, 9, 0)
  }
];

export const membershipRenewals: MembershipRenewalRecord[] = [
  {
    id: "renew_001",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_003",
    membershipId: "mem_001",
    customerId: "cust_001",
    householdId: "hh_003",
    billingFrequency: "monthly",
    renewalAmountCents: 10900,
    renewalDate: dateKeyAtOffset(12),
    status: "succeeded",
    invoiceId: "inv_001",
    transactionId: "txn_seed_003",
    createdAt: isoAtOffset(-25, 6, 55),
    processedAt: isoAtOffset(-25, 7, 5)
  },
  {
    id: "renew_002",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_001",
    membershipId: "mem_003",
    customerId: "cust_003",
    householdId: "hh_001",
    billingFrequency: "monthly",
    renewalAmountCents: 10000,
    renewalDate: dateKeyAtOffset(4),
    status: "failed",
    invoiceId: "inv_002",
    failureReason: "Card expired",
    nextRetryAt: isoAtOffset(1, 9, 0),
    grantTemporaryAccessUntil: dateKeyAtOffset(3),
    createdAt: isoAtOffset(-4, 8, 45),
    processedAt: isoAtOffset(-4, 9, 5)
  },
  {
    id: "renew_003",
    organizationId: "org_summit",
    billingAccountId: "billacct_cust_005",
    membershipId: "mem_004",
    customerId: "cust_005",
    billingFrequency: "monthly",
    renewalAmountCents: 8500,
    renewalDate: dateKeyAtOffset(2),
    status: "pending",
    invoiceId: "inv_003",
    createdAt: isoAtOffset(0, 8, 0)
  }
];

export const billingRefunds: BillingRefundRecord[] = [
  {
    id: "billrefund_001",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_003",
    amountCents: 2000,
    type: "store_credit",
    reason: "Class cancellation credit",
    relatedReceiptId: "txn_seed_003",
    createdAt: isoAtOffset(-2, 11, 20),
    createdByStaffId: "staff_002",
    createdByStaffName: "Maya Lopez"
  }
];
