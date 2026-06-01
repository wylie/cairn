import type { SignedWaiverRecord } from "@/types/domain";
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
    signedAt: "2026-03-02T10:14:00Z",
    expiresAt: "2027-03-02",
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
    createdAt: "2026-03-02T10:14:00Z"
  },
  {
    id: "swr_002",
    organizationId: "org_summit",
    customerId: "cust_002",
    waiverId: "wav_004",
    templateId: "wtpl_general",
    templateName: "General Facility Waiver",
    templateVersionId: "wver_general_v1",
    templateVersion: "1.0",
    status: "outdated_version",
    signedAt: "2025-03-02T10:14:00Z",
    expiresAt: "2026-03-02",
    signedByName: "Teresa Fisher",
    signedByCustomerId: "cust_003",
    signedByRelationship: "parent_guardian",
    typedName: "Teresa Fisher",
    typedSignature: "Teresa Fisher",
    acknowledgementChecks: [{ label: "I accept terms", required: true, accepted: true }],
    contentSnapshot: generalV1Blocks,
    signedByStaffId: "staff_002",
    updatedByStaffId: "staff_002",
    updatedByStaffName: "Maya Lopez",
    source: "staff",
    createdAt: "2025-03-02T10:14:00Z"
  },
  {
    id: "swr_003",
    organizationId: "org_summit",
    customerId: "cust_002",
    waiverId: "wav_006",
    templateId: "wtpl_bike",
    templateName: "Bike Park Waiver",
    templateVersionId: "wver_bike_v1",
    templateVersion: "1.0",
    status: "expired",
    signedAt: "2025-01-01T09:00:00Z",
    expiresAt: "2026-01-01",
    signedByName: "Teresa Fisher",
    signedByCustomerId: "cust_003",
    signedByRelationship: "parent_guardian",
    typedName: "Teresa Fisher",
    typedSignature: "Teresa Fisher",
    acknowledgementChecks: [{ label: "I acknowledge trail and terrain risk.", required: true, accepted: true }],
    contentSnapshot: bikeV1Blocks,
    signedByStaffId: "staff_002",
    updatedByStaffId: "staff_002",
    updatedByStaffName: "Maya Lopez",
    source: "staff",
    createdAt: "2025-01-01T09:00:00Z"
  }
];
