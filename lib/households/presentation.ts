import type { HouseholdMemberRole, HouseholdRelationship } from "@/types/domain";

export type HouseholdHealthStatus = "healthy" | "needs_attention" | "critical";

export function formatHouseholdRole(role: HouseholdMemberRole | string) {
  switch (role) {
    case "primary-adult":
      return "Primary Adult";
    case "secondary-adult":
      return "Secondary Adult";
    case "adult":
      return "Adult";
    case "guardian":
      return "Guardian";
    case "dependent":
      return "Dependent";
    case "child":
      return "Child";
    case "emergency-contact-only":
      return "Emergency Contact";
    case "other":
      return "Other";
    default:
      return startCase(role);
  }
}

export function formatHouseholdRelationship(relationship: HouseholdRelationship | string) {
  switch (relationship) {
    case "parent_guardian":
      return "Parent / Guardian";
    case "spouse_partner":
      return "Spouse / Partner";
    case "emergency_contact_only":
      return "Emergency Contact";
    default:
      return startCase(relationship);
  }
}

export function getHouseholdInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "HH";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "HH";
}

export function getHouseholdHealthStatus(input: {
  missingWaivers: number;
  expiredMemberships: number;
  outstandingBalanceCents: number;
  incompleteProfiles: number;
  missingEmergencyContacts: number;
}) {
  const criticalSignals =
    input.expiredMemberships +
    input.missingWaivers +
    input.missingEmergencyContacts +
    (input.outstandingBalanceCents > 0 ? 1 : 0);

  if (criticalSignals >= 3) return "critical" satisfies HouseholdHealthStatus;
  if (criticalSignals >= 1 || input.incompleteProfiles > 0) return "needs_attention" satisfies HouseholdHealthStatus;
  return "healthy" satisfies HouseholdHealthStatus;
}

export function getHouseholdHealthLabel(status: HouseholdHealthStatus) {
  switch (status) {
    case "critical":
      return "Critical";
    case "needs_attention":
      return "Needs Attention";
    default:
      return "Healthy";
  }
}

function startCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
