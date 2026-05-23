import type { CustomerAccessRecord } from "@/types/domain";

export const accessRecords: CustomerAccessRecord[] = [
  {
    id: "acc_001",
    customerId: "cust_001",
    productId: "prd_003",
    type: "membership",
    status: "active",
    startDate: "2026-05-01",
    expirationDate: "2026-06-12",
    unlimitedAccess: true,
    locationsAllowed: ["loc_001", "loc_002"],
    grantedByStaffId: "staff_001",
    grantedByStaffName: "Taylor Nguyen"
  },
  {
    id: "acc_002",
    customerId: "cust_002",
    productId: "prd_002",
    type: "punch-pass",
    status: "active",
    startDate: "2026-05-01",
    expirationDate: "2026-05-25",
    remainingPunches: 7,
    locationsAllowed: ["loc_001"],
    grantedByStaffId: "staff_001",
    grantedByStaffName: "Taylor Nguyen"
  },
  {
    id: "acc_003",
    customerId: "cust_003",
    productId: "prd_005",
    type: "membership",
    status: "active",
    startDate: "2026-05-10",
    expirationDate: "2026-06-02",
    unlimitedAccess: true,
    locationsAllowed: ["loc_002"],
    grantedByStaffId: "staff_001",
    grantedByStaffName: "Taylor Nguyen"
  },
  {
    id: "acc_004",
    customerId: "cust_004",
    productId: "prd_003",
    type: "membership",
    status: "expired",
    startDate: "2026-04-01",
    expirationDate: "2026-05-10",
    unlimitedAccess: true,
    locationsAllowed: ["loc_001"]
  },
  {
    id: "acc_005",
    customerId: "cust_005",
    productId: "prd_001",
    type: "day-pass",
    status: "active",
    startDate: "2026-05-20",
    expirationDate: "2026-05-20",
    locationsAllowed: ["loc_001"],
    grantedByStaffId: "staff_001",
    grantedByStaffName: "Taylor Nguyen"
  }
];
