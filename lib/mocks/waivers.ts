import type { Waiver } from "@/types/domain";

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
    signedAt: "2026-01-10",
    expiresAt: "2027-01-10",
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
    signedAt: "2026-02-18",
    expiresAt: "2027-02-18",
    updatedByStaffId: "staff_001",
    updatedByStaffName: "Taylor Nguyen"
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
    signedAt: "2026-04-01",
    expiresAt: "2027-04-01",
    updatedByStaffId: "staff_001",
    updatedByStaffName: "Taylor Nguyen"
  }
];
