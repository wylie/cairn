import type { WaiverTemplate, WaiverTemplateVersion } from "@/types/domain";

export const waiverTemplateVersions: WaiverTemplateVersion[] = [
  {
    id: "wver_general_v1",
    templateId: "wtpl_general",
    version: "1.0",
    effectiveDate: "2025-01-01",
    active: false,
    archived: true,
    blocks: [
      { id: "blk_h1_legacy", type: "heading", label: "General Facility Waiver", content: "General Facility Waiver" },
      { id: "blk_p1_legacy", type: "paragraph", label: "Assumption of risk", content: "I understand and accept the inherent risks of participation." },
      { id: "blk_t1_legacy", type: "typed_name", label: "Typed legal name", required: true },
      { id: "blk_s1_legacy", type: "signature_placeholder", label: "Signature", required: true }
    ],
    changeNotes: "Original release",
    createdAt: "2025-01-01T12:00:00Z",
    createdByStaffId: "staff_001"
  },
  {
    id: "wver_general_v2",
    templateId: "wtpl_general",
    version: "2.0",
    effectiveDate: "2026-05-01",
    active: true,
    blocks: [
      { id: "blk_h1", type: "heading", label: "General Facility Waiver", content: "General Facility Waiver" },
      { id: "blk_p1", type: "paragraph", label: "Assumption of risk", content: "I understand recreation activities include inherent risk." },
      { id: "blk_b1", type: "paragraph", label: "Participant responsibilities", content: "- Follow posted safety rules\n- Use equipment as instructed\n- Report concerns to staff" },
      { id: "blk_c1", type: "required_checkbox", label: "I accept terms", required: true },
      { id: "blk_t1", type: "typed_name", label: "Typed legal name", required: true },
      { id: "blk_s1", type: "signature_placeholder", label: "Signature", required: true }
    ],
    changeNotes: "Added participant responsibilities language",
    createdAt: "2026-05-01T12:00:00Z",
    createdByStaffId: "staff_001"
  },
  {
    id: "wver_youth_v1",
    templateId: "wtpl_youth",
    version: "1.0",
    effectiveDate: "2026-03-01",
    active: true,
    blocks: [
      { id: "blk_h2", type: "heading", label: "Youth Program Waiver", content: "Youth Program Waiver" },
      { id: "blk_gp", type: "guardian_agreement", label: "Guardian agreement", required: true },
      { id: "blk_ec", type: "emergency_contact_section", label: "Emergency contact", required: true },
      { id: "blk_t2", type: "typed_name", label: "Guardian typed name", required: true }
    ],
    changeNotes: "Initial youth waiver release",
    createdAt: "2026-03-01T12:00:00Z",
    createdByStaffId: "staff_002"
  },
  {
    id: "wver_bike_v1",
    templateId: "wtpl_bike",
    version: "1.0",
    effectiveDate: "2026-04-01",
    active: true,
    blocks: [
      { id: "blk_h3", type: "heading", label: "Bike Park Waiver", content: "Bike Park Waiver" },
      { id: "blk_p3", type: "paragraph", label: "Bike terrain risk", content: "I acknowledge trail and terrain risk." },
      { id: "blk_t3", type: "typed_name", label: "Typed legal name", required: true }
    ],
    changeNotes: "Initial bike park waiver release",
    createdAt: "2026-04-01T12:00:00Z",
    createdByStaffId: "staff_001"
  }
];

export const waiverTemplates: WaiverTemplate[] = [
  {
    id: "wtpl_general",
    organizationId: "org_summit",
    name: "General Facility Waiver",
    description: "Core waiver for general facility access.",
    active: true,
    effectiveDate: "2026-05-01",
    expirationRuleType: "days_after_signing",
    expirationDays: 365,
    facilityAssignment: ["loc_001", "loc_002"],
    productAssignment: ["prod_membership_monthly", "prod_daypass_climb", "prod_climb_day"],
    brandingAssignment: "default",
    versionIds: ["wver_general_v1", "wver_general_v2"],
    currentVersionId: "wver_general_v2",
    createdAt: "2026-05-01T12:00:00Z"
  },
  {
    id: "wtpl_youth",
    organizationId: "org_summit",
    name: "Youth Program Waiver",
    description: "Required for youth camps and youth programming.",
    active: true,
    effectiveDate: "2026-03-01",
    expirationRuleType: "annual",
    facilityAssignment: ["loc_001", "loc_002"],
    productAssignment: ["prod_youth_camp_reg", "prod_camp_summer"],
    brandingAssignment: "default",
    versionIds: ["wver_youth_v1"],
    currentVersionId: "wver_youth_v1",
    createdAt: "2026-03-01T12:00:00Z"
  },
  {
    id: "wtpl_bike",
    organizationId: "org_summit",
    name: "Bike Park Waiver",
    description: "Required for bike park activities and clinics.",
    active: true,
    effectiveDate: "2026-04-01",
    expirationRuleType: "days_after_signing",
    expirationDays: 365,
    facilityAssignment: ["loc_002"],
    productAssignment: ["prod_bike_day", "prod_5bike"],
    brandingAssignment: "default",
    versionIds: ["wver_bike_v1"],
    currentVersionId: "wver_bike_v1",
    createdAt: "2026-04-01T12:00:00Z"
  }
];
