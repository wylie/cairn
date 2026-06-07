import type { CustomerAccessRecord } from "@/types/domain";
import { dateKeyAtOffset } from "@/lib/demo/dates";

export const accessRecords: CustomerAccessRecord[] = [
  {
    id: "acc_001",
    customerId: "cust_001",
    productId: "prd_003",
    type: "membership",
    status: "active",
    startDate: dateKeyAtOffset(-28),
    expirationDate: dateKeyAtOffset(12),
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
    startDate: dateKeyAtOffset(-35),
    expirationDate: dateKeyAtOffset(20),
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
    startDate: dateKeyAtOffset(-21),
    expirationDate: dateKeyAtOffset(4),
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
    startDate: dateKeyAtOffset(-40),
    expirationDate: dateKeyAtOffset(-2),
    locationsAllowed: ["loc_001"]
  },
  {
    id: "acc_005",
    customerId: "cust_005",
    productId: "prd_001",
    type: "day-pass",
    status: "active",
    startDate: dateKeyAtOffset(0),
    expirationDate: dateKeyAtOffset(0),
    locationsAllowed: ["loc_001"],
    grantedByStaffId: "staff_001",
    grantedByStaffName: "Taylor Nguyen"
  },
  {
    id: "acc_006",
    customerId: "cust_003",
    householdId: "hh_001",
    productId: "prd_005",
    type: "household-membership",
    status: "active",
    startDate: dateKeyAtOffset(-21),
    expirationDate: dateKeyAtOffset(14),
    unlimitedAccess: true,
    coveredCustomerIds: ["cust_003", "cust_004", "cust_002"],
    locationsAllowed: ["loc_001", "loc_002"],
    grantedByStaffId: "staff_001",
    grantedByStaffName: "Taylor Nguyen"
  },
  {
    id: "acc_007",
    customerId: "cust_001",
    householdId: "hh_003",
    productId: "prd_003",
    type: "household-membership",
    status: "active",
    startDate: dateKeyAtOffset(-17),
    expirationDate: dateKeyAtOffset(18),
    unlimitedAccess: true,
    coveredCustomerIds: ["cust_001", "cust_006"],
    locationsAllowed: ["loc_001"],
    grantedByStaffId: "staff_001",
    grantedByStaffName: "Taylor Nguyen"
  },
  {
    id: "acc_008",
    customerId: "cust_007",
    productId: "prd_004",
    type: "time-pass",
    status: "active",
    startDate: dateKeyAtOffset(-3),
    expirationDate: dateKeyAtOffset(25),
    locationsAllowed: ["loc_002"],
    grantedByStaffId: "staff_002",
    grantedByStaffName: "Maya Lopez"
  }
];
