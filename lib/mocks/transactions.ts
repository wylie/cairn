import type { PosTransaction } from "@/types/domain";

export const posTransactions: PosTransaction[] = [
  {
    id: "txn_seed_001",
    organizationId: "org_summit",
    locationId: "loc_001",
    customerId: "cust_003",
    customerName: "Alex Rivera",
    transactionType: "sale",
    returnStatus: "none",
    items: [
      {
        productId: "prd_004",
        productName: "Class Drop-In",
        category: "classes",
        type: "class",
        quantity: 1,
        unitPrice: 26,
        lineTotal: 26
      }
    ],
    subtotal: 26,
    total: 26,
    paymentType: "mock",
    completedAt: "2026-05-19T14:10:00Z",
    checkInTriggered: false,
    receiptNumber: "R-LEGACY"
  },
  {
    id: "txn_seed_002",
    organizationId: "org_summit",
    locationId: "loc_001",
    customerId: "cust_005",
    customerName: "Dana Daypass",
    householdId: "hh_002",
    purchaserCustomerId: "cust_005",
    purchaserCustomerName: "Dana Daypass",
    transactionType: "sale",
    returnStatus: "none",
    items: [
      {
        productId: "prd_001",
        productName: "Day Pass",
        category: "day_passes",
        type: "access",
        quantity: 1,
        unitPrice: 22,
        lineTotal: 22
      }
    ],
    subtotal: 22,
    total: 22,
    paymentType: "cash",
    completedAt: "2026-05-22T10:25:00Z",
    checkInTriggered: true,
    receiptStatus: "paid",
    receiptNumber: "R-HH-002"
  },
  {
    id: "txn_seed_003",
    organizationId: "org_summit",
    locationId: "loc_001",
    customerId: "cust_001",
    customerName: "Maya Patel",
    householdId: "hh_003",
    purchaserCustomerId: "cust_001",
    purchaserCustomerName: "Maya Patel",
    purchasedForCustomerIds: ["cust_001", "cust_006"],
    transactionType: "sale",
    returnStatus: "none",
    items: [
      {
        productId: "prd_003",
        productName: "Monthly Membership",
        category: "memberships",
        type: "membership",
        quantity: 1,
        unitPrice: 109,
        lineTotal: 109
      },
      {
        productId: "prd_004",
        productName: "Class Drop-In",
        category: "classes",
        type: "class",
        quantity: 1,
        unitPrice: 26,
        lineTotal: 26
      }
    ],
    subtotal: 135,
    total: 135,
    paymentType: "card",
    completedAt: "2026-05-28T12:45:00Z",
    checkInTriggered: false,
    receiptStatus: "pending",
    receiptNumber: "R-HH-003"
  }
];
