import type { SignedWaiverRecord } from "@/types/domain";
import { dateKeyAtOffset, isoAtOffset } from "@/lib/demo/dates";
import { waiverTemplateVersions } from "@/lib/mocks/waiver-templates";

const generalV2Blocks = waiverTemplateVersions.find((entry) => entry.id === "wver_general_v2")?.blocks ?? [];
const generalV1Blocks = waiverTemplateVersions.find((entry) => entry.id === "wver_general_v1")?.blocks ?? [];
const bikeV1Blocks = waiverTemplateVersions.find((entry) => entry.id === "wver_bike_v1")?.blocks ?? [];

export const signedWaiverRecords: SignedWaiverRecord[] = [
  {
    id: "swr_001",
    organizationId: "org_summit",
    customerId: "cust_001",
    waiverId: "wav_001",
    templateId: "wtpl_general",
    templateName: "General Facility Waiver",
    templateVersionId: "wver_general_v2",
    templateVersion: "2.0",
    status: "valid",
    signedAt: isoAtOffset(-92, 10, 14),
    expiresAt: dateKeyAtOffset(90),
    signedByName: "Maya Patel",
    signedByCustomerId: "cust_001",
    signedByRelationship: "self",
    typedName: "Maya Patel",
    typedSignature: "Maya Patel",
    acknowledgementChecks: [{ label: "I accept terms", required: true, accepted: true }],
    contentSnapshot: generalV2Blocks,
    signedByStaffId: "staff_001",
    updatedByStaffId: "staff_001",
    updatedByStaffName: "Taylor Nguyen",
    source: "staff",
    createdAt: isoAtOffset(-92, 10, 14)
  },
  {
    id: "swr_002",
    organizationId: "org_summit",
    customerId: "cust_004",
    waiverId: "wav_006",
    templateId: "wtpl_general",
    templateName: "General Facility Waiver",
    templateVersionId: "wver_general_v1",
    templateVersion: "1.0",
    status: "outdated_version",
    signedAt: isoAtOffset(-380, 10, 14),
    expiresAt: dateKeyAtOffset(-15),
    signedByName: "Alex Rivera",
    signedByCustomerId: "cust_003",
    signedByRelationship: "parent_guardian",
    typedName: "Alex Rivera",
    typedSignature: "Alex Rivera",
    acknowledgementChecks: [{ label: "I accept terms", required: true, accepted: true }],
    contentSnapshot: generalV1Blocks,
    signedByStaffId: "staff_002",
    updatedByStaffId: "staff_002",
    updatedByStaffName: "Maya Lopez",
    source: "staff",
    createdAt: isoAtOffset(-380, 10, 14)
  },
  {
    id: "swr_003",
    organizationId: "org_summit",
    customerId: "cust_003",
    waiverId: "wav_003",
    templateId: "wtpl_bike",
    templateName: "Bike Park Waiver",
    templateVersionId: "wver_bike_v1",
    templateVersion: "1.0",
    status: "expired",
    signedAt: isoAtOffset(-190, 9, 0),
    expiresAt: dateKeyAtOffset(-4),
    signedByName: "Alex Rivera",
    signedByCustomerId: "cust_003",
    signedByRelationship: "self",
    typedName: "Alex Rivera",
    typedSignature: "Alex Rivera",
    acknowledgementChecks: [{ label: "I acknowledge trail and terrain risk.", required: true, accepted: true }],
    contentSnapshot: bikeV1Blocks,
    signedByStaffId: "staff_002",
    updatedByStaffId: "staff_002",
    updatedByStaffName: "Maya Lopez",
    source: "staff",
    createdAt: isoAtOffset(-190, 9, 0)
  }
];
