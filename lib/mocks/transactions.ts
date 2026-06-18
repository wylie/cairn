import type { PosTransaction } from "@/types/domain";
import { isoAtOffset } from "@/lib/demo/dates";

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
    completedAt: isoAtOffset(-1, 14, 10),
    checkInTriggered: false,
    receiptNumber: "R-LEGACY",
    receiptStatus: "paid"
  },
  {
    id: "txn_seed_002",
    organizationId: "org_summit",
    locationId: "loc_001",
    customerId: "cust_005",
    customerName: "Dana Brooks",
    householdId: "hh_002",
    purchaserCustomerId: "cust_005",
    purchaserCustomerName: "Dana Brooks",
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
    completedAt: isoAtOffset(0, 10, 25),
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
    completedAt: isoAtOffset(0, 12, 45),
    checkInTriggered: false,
    receiptStatus: "pending",
    receiptNumber: "R-HH-003"
  },
  {
    id: "txn_seed_004",
    organizationId: "org_summit",
    locationId: "loc_002",
    customerId: "cust_007",
    customerName: "Riley Morgan",
    purchaserCustomerId: "cust_007",
    purchaserCustomerName: "Riley Morgan",
    transactionType: "sale",
    returnStatus: "none",
    items: [
      {
        productId: "prd_007",
        productName: "Weekend Workshop",
        category: "classes",
        type: "class",
        quantity: 1,
        unitPrice: 48,
        lineTotal: 48
      },
      {
        productId: "prd_010",
        productName: "Cairn T-Shirt",
        category: "retail",
        type: "retail",
        quantity: 1,
        unitPrice: 24,
        lineTotal: 24
      }
    ],
    subtotal: 72,
    total: 72,
    paymentType: "card",
    completedAt: isoAtOffset(0, 15, 5),
    checkInTriggered: false,
    receiptStatus: "paid",
    receiptNumber: "R-WKND-001"
  },
  {
    id: "txn_seed_005",
    organizationId: "org_summit",
    locationId: "loc_001",
    customerId: "cust_003",
    customerName: "Alex Rivera",
    householdId: "hh_001",
    purchaserCustomerId: "cust_003",
    purchaserCustomerName: "Alex Rivera",
    transactionType: "return",
    returnStatus: "partially_returned",
    items: [
      {
        productId: "prd_011",
        productName: "Camp Deposit Adjustment",
        category: "fees",
        type: "service",
        quantity: 1,
        unitPrice: -20,
        lineTotal: -20
      }
    ],
    subtotal: -20,
    total: -20,
    paymentType: "card",
    completedAt: isoAtOffset(-2, 11, 30),
    checkInTriggered: false,
    receiptStatus: "partially_refunded",
    receiptNumber: "R-REF-001"
  }
];
