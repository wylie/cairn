import type { Waiver } from "@/types/domain";
import { dateKeyAtOffset } from "@/lib/demo/dates";

export const waivers: Waiver[] = [
  {
    id: "wav_001",
    customerId: "cust_001",
    status: "valid",
    templateId: "wtpl_general",
    templateName: "General Facility Waiver",
    templateVersion: "2.0",
    typedName: "Maya Patel",
    signedByName: "Maya Patel",
    signedAt: dateKeyAtOffset(-92),
    expiresAt: dateKeyAtOffset(90),
    updatedByStaffId: "staff_001",
    updatedByStaffName: "Taylor Nguyen"
  },
  {
    id: "wav_002",
    customerId: "cust_002",
    status: "valid",
    templateId: "wtpl_general",
    templateName: "General Facility Waiver",
    templateVersion: "2.0",
    typedName: "Jordan Kim",
    signedByName: "Jordan Kim",
    signedAt: dateKeyAtOffset(-65),
    expiresAt: dateKeyAtOffset(7),
    updatedByStaffId: "staff_001",
    updatedByStaffName: "Taylor Nguyen"
  },
  {
    id: "wav_003",
    customerId: "cust_003",
    status: "expired",
    templateId: "wtpl_general",
    templateName: "General Facility Waiver",
    templateVersion: "1.0",
    typedName: "Alex Rivera",
    signedByName: "Alex Rivera",
    signedAt: dateKeyAtOffset(-390),
    expiresAt: dateKeyAtOffset(-4),
    updatedByStaffId: "staff_002",
    updatedByStaffName: "Maya Lopez"
  },
  {
    id: "wav_005",
    customerId: "cust_005",
    status: "valid",
    templateId: "wtpl_general",
    templateName: "General Facility Waiver",
    templateVersion: "2.0",
    typedName: "Dana Daypass",
    signedByName: "Dana Daypass",
    signedAt: dateKeyAtOffset(-30),
    expiresAt: dateKeyAtOffset(180),
    updatedByStaffId: "staff_001",
    updatedByStaffName: "Taylor Nguyen"
  },
  {
    id: "wav_006",
    customerId: "cust_004",
    status: "valid",
    templateId: "wtpl_youth",
    templateName: "Youth Program Waiver",
    templateVersion: "1.0",
    typedName: "Alex Rivera",
    signedByName: "Alex Rivera",
    signedByRelationship: "guardian",
    signedAt: dateKeyAtOffset(-20),
    expiresAt: dateKeyAtOffset(14),
    updatedByStaffId: "staff_002",
    updatedByStaffName: "Maya Lopez"
  },
  {
    id: "wav_007",
    customerId: "cust_007",
    status: "missing",
    templateId: "wtpl_general",
    templateName: "General Facility Waiver",
    templateVersion: "2.0",
    updatedByStaffId: "staff_002",
    updatedByStaffName: "Maya Lopez"
  }
];
