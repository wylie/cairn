import type {
  BillingAccount,
  BillingCreditEntry,
  BillingInvoice,
  BillingRefundRecord,
  BillingStatement,
  MembershipRenewalRecord
} from "@/types/domain";

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
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-06-01T08:45:00Z"
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
    createdAt: "2026-03-10T13:15:00Z",
    updatedAt: "2026-05-30T11:20:00Z"
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
    createdAt: "2026-04-18T10:30:00Z",
    updatedAt: "2026-05-22T10:25:00Z"
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
    createdAt: "2026-05-30T11:20:00Z",
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
    createdAt: "2026-05-28T09:00:00Z",
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
    issueDate: "2026-05-12",
    dueDate: "2026-05-12",
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
    createdAt: "2026-05-12T07:00:00Z",
    updatedAt: "2026-05-12T07:05:00Z"
  },
  {
    id: "inv_002",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_001",
    invoiceNumber: "INV-2026-014",
    issueDate: "2026-05-20",
    dueDate: "2026-05-27",
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
    createdAt: "2026-05-20T08:00:00Z",
    updatedAt: "2026-06-02T09:10:00Z"
  },
  {
    id: "inv_003",
    organizationId: "org_summit",
    billingAccountId: "billacct_cust_005",
    invoiceNumber: "INV-2026-021",
    issueDate: "2026-06-05",
    dueDate: "2026-06-12",
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
    createdAt: "2026-06-05T08:00:00Z"
  }
];

export const billingStatements: BillingStatement[] = [
  {
    id: "stmt_001",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_001",
    statementNumber: "STMT-2026-001",
    statementDate: "2026-06-01",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    invoiceIds: ["inv_002"],
    chargesCents: 10000,
    creditsCents: 1500,
    paymentsCents: 0,
    refundsCents: 0,
    balanceCents: 8500,
    customerId: "cust_003",
    householdId: "hh_001",
    createdAt: "2026-06-01T08:30:00Z"
  },
  {
    id: "stmt_002",
    organizationId: "org_summit",
    billingAccountId: "billacct_hh_003",
    statementNumber: "STMT-2026-002",
    statementDate: "2026-06-01",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    invoiceIds: ["inv_001"],
    chargesCents: 10900,
    creditsCents: 5000,
    paymentsCents: 10900,
    refundsCents: 2000,
    balanceCents: 5000,
    customerId: "cust_001",
    householdId: "hh_003",
    createdAt: "2026-06-01T09:00:00Z"
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
    renewalDate: "2026-05-12",
    status: "succeeded",
    invoiceId: "inv_001",
    transactionId: "txn_seed_003",
    createdAt: "2026-05-12T06:55:00Z",
    processedAt: "2026-05-12T07:05:00Z"
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
    renewalDate: "2026-06-02",
    status: "failed",
    invoiceId: "inv_002",
    failureReason: "Card expired",
    nextRetryAt: "2026-06-06T09:00:00Z",
    grantTemporaryAccessUntil: "2026-06-09",
    createdAt: "2026-06-02T08:45:00Z",
    processedAt: "2026-06-02T09:05:00Z"
  },
  {
    id: "renew_003",
    organizationId: "org_summit",
    billingAccountId: "billacct_cust_005",
    membershipId: "mem_004",
    customerId: "cust_005",
    billingFrequency: "monthly",
    renewalAmountCents: 8500,
    renewalDate: "2026-06-12",
    status: "pending",
    invoiceId: "inv_003",
    createdAt: "2026-06-05T08:00:00Z"
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
    createdAt: "2026-05-30T11:20:00Z",
    createdByStaffId: "staff_002",
    createdByStaffName: "Maya Lopez"
  }
];
