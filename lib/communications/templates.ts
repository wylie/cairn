import type { CommunicationTemplate, CommunicationTemplateType } from "@/types/domain";

export const COMMUNICATION_TEMPLATE_VARIABLES = [
  "customerName",
  "householdName",
  "programName",
  "sessionDate",
  "facilityName",
  "membershipName",
  "expirationDate",
  "balanceDue",
  "waiverName"
] as const;

export type CommunicationTemplateVariable = (typeof COMMUNICATION_TEMPLATE_VARIABLES)[number];

export function getDefaultCommunicationTemplates(organizationId: string): CommunicationTemplate[] {
  const build = (
    id: CommunicationTemplateType,
    name: string,
    subject: string,
    body: string,
    availableVariables: CommunicationTemplateVariable[]
  ): CommunicationTemplate => ({
    id: `template_${id}`,
    organizationId,
    name,
    type: id,
    subject,
    body,
    active: true,
    availableVariables
  });

  return [
    build("membership_renewal", "Membership expiring soon", "Your membership expires on {{expirationDate}}", "Hello {{customerName}}, your {{membershipName}} membership expires on {{expirationDate}}. Review renewal options before your next visit.", ["customerName", "membershipName", "expirationDate", "facilityName"]),
    build("waiver_reminder", "Waiver expiring soon", "Waiver expires on {{expirationDate}}", "Hello {{customerName}}, your {{waiverName}} waiver expires on {{expirationDate}}. Please sign the current version before your next visit.", ["customerName", "waiverName", "expirationDate", "facilityName"]),
    build("waiver_missing", "Waiver missing", "Required waiver needed", "Hello {{customerName}}, {{waiverName}} is required before your next visit to {{facilityName}}.", ["customerName", "waiverName", "facilityName"]),
    build("registration_confirmation", "Registration confirmation", "Registration confirmed for {{programName}}", "Hello {{customerName}}, you are confirmed for {{programName}} on {{sessionDate}}.", ["customerName", "programName", "sessionDate", "facilityName"]),
    build("waitlist_confirmation", "Waitlist confirmation", "You joined the waitlist for {{programName}}", "Hello {{customerName}}, you have been added to the waitlist for {{programName}} on {{sessionDate}}.", ["customerName", "programName", "sessionDate"]),
    build("waitlist_promotion", "Waitlist promotion offer", "A spot opened in {{programName}}", "Hello {{customerName}}, a spot is available in {{programName}} on {{sessionDate}}. Confirm your registration as soon as possible.", ["customerName", "programName", "sessionDate"]),
    build("program_cancellation", "Program cancellation", "{{programName}} has been cancelled", "Hello {{customerName}}, {{programName}} on {{sessionDate}} has been cancelled. We will follow up with next steps.", ["customerName", "programName", "sessionDate"]),
    build("birthday_greeting", "Birthday greeting", "Happy Birthday from {{facilityName}}", "Happy Birthday, {{customerName}}. We look forward to seeing you at {{facilityName}} soon.", ["customerName", "facilityName"]),
    build("payment_reminder", "Payment reminder", "Balance due: {{balanceDue}}", "Hello {{customerName}}, your balance due is {{balanceDue}}. Please review your account at {{facilityName}}.", ["customerName", "balanceDue", "facilityName"]),
    build("general_announcement", "General announcement", "Facility update", "Hello {{customerName}}, we have an update from {{facilityName}}.", ["customerName", "facilityName"]),
    build("custom", "Custom", "", "", [...COMMUNICATION_TEMPLATE_VARIABLES])
  ];
}

export function renderTemplateVariables(template: string, values: Partial<Record<CommunicationTemplateVariable, string | number>>): string {
  return template.replace(/{{\s*([a-zA-Z0-9]+)\s*}}/g, (_match, key) => {
    const value = values[key as CommunicationTemplateVariable];
    return value === undefined || value === null ? "" : String(value);
  });
}
