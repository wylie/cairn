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
  }
];
