import type { CheckInLogRecord } from "@/types/domain";

export const checkInRecords: CheckInLogRecord[] = [
  {
    id: "log_1001",
    organizationId: "org_summit",
    locationId: "loc_001",
    customerId: "cust_001",
    customerName: "Maya Patel",
    membershipPassType: "Unlimited Access",
    entryMethod: "membership",
    passProductUsed: "Unlimited Access",
    checkInTime: "2026-05-20T13:15:00Z",
    checkOutTime: null,
    checkInSource: "manual_search",
    status: "checked-in",
    checkedInByStaffId: "staff_001"
  },
  {
    id: "log_1002",
    organizationId: "org_summit",
    locationId: "loc_001",
    customerId: "cust_002",
    customerName: "Jordan Kim",
    membershipPassType: "10 Visit Pass",
    entryMethod: "multi_visit_pass",
    passProductUsed: "10 Visit Pass",
    punchesUsed: 1,
    punchesRemaining: 8,
    checkInTime: "2026-05-19T14:20:00Z",
    checkOutTime: "2026-05-19T15:40:00Z",
    checkInSource: "barcode_scan",
    status: "checked-out",
    checkedInByStaffId: "staff_001",
    notes: "Original pass quantity: 10"
  },
  {
    id: "log_1003",
    organizationId: "org_summit",
    locationId: "loc_001",
    customerId: "cust_002",
    customerName: "Jordan Kim",
    membershipPassType: "10 Visit Pass",
    entryMethod: "multi_visit_pass",
    passProductUsed: "10 Visit Pass",
    punchesUsed: 1,
    punchesRemaining: 7,
    checkInTime: "2026-05-18T13:00:00Z",
    checkOutTime: "2026-05-18T14:05:00Z",
    checkInSource: "manual_search",
    status: "checked-out",
    checkedInByStaffId: "staff_001"
  }
];
