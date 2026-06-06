import type { StaffPermission, StaffRole, StaffUser } from "@/types/domain";

export const ROLE_PERMISSION_PRESETS: Record<StaffRole, StaffPermission[]> = {
  owner: [
    "viewCustomers",
    "checkInCustomer",
    "checkOutCustomer",
    "overrideAccess",
    "compAccess",
    "editCustomer",
    "createCustomer",
    "mergeCustomer",
    "deactivateCustomer",
    "manageProducts",
    "manageWaivers",
    "deactivateProduct",
    "viewReports",
    "viewAttendanceReports",
    "viewFinancialReports",
    "viewMembershipReports",
    "usePOS",
    "refundTransaction",
    "discountTransaction",
    "editPrograms",
    "cancelPrograms",
    "rosterAccess",
    "manageSettings",
    "manageBillingSettings",
    "managePlatformSettings",
    "manageStaff",
    "manageRoles",
    "inviteStaff",
    "grantCompAccess",
    "manageCommunications",
    "sendTransactionalMessages",
    "messageAssignedParticipants"
  ],
  manager: [
    "viewCustomers",
    "checkInCustomer",
    "checkOutCustomer",
    "overrideAccess",
    "compAccess",
    "editCustomer",
    "createCustomer",
    "mergeCustomer",
    "manageProducts",
    "manageWaivers",
    "deactivateProduct",
    "viewReports",
    "viewAttendanceReports",
    "viewFinancialReports",
    "viewMembershipReports",
    "usePOS",
    "discountTransaction",
    "editPrograms",
    "cancelPrograms",
    "rosterAccess",
    "manageSettings",
    "manageBillingSettings",
    "manageStaff",
    "inviteStaff",
    "grantCompAccess",
    "manageCommunications",
    "sendTransactionalMessages",
    "messageAssignedParticipants"
  ],
  front_desk: [
    "viewCustomers",
    "viewReports",
    "viewAttendanceReports",
    "checkInCustomer",
    "checkOutCustomer",
    "editCustomer",
    "createCustomer",
    "usePOS",
    "discountTransaction",
    "editPrograms",
    "rosterAccess",
    "sendTransactionalMessages"
  ],
  instructor: ["editPrograms", "rosterAccess", "messageAssignedParticipants"],
  volunteer_limited: ["rosterAccess"]
};

export function getEffectivePermissions(staff: StaffUser): StaffPermission[] {
  const preset = ROLE_PERMISSION_PRESETS[staff.role] ?? [];
  return Array.from(new Set<StaffPermission>([...preset, ...staff.permissions]));
}

export function staffHasPermission(staff: StaffUser | null, permission: StaffPermission): boolean {
  if (!staff) return false;
  return getEffectivePermissions(staff).includes(permission);
}

export function staffHasAnyPermission(staff: StaffUser | null, permissions: StaffPermission[]): boolean {
  if (!staff) return false;
  const effective = getEffectivePermissions(staff);
  return permissions.some((permission) => effective.includes(permission));
}

export const PERMISSION_LABELS: Record<StaffPermission, string> = {
  viewCustomers: "View customers",
  editCustomer: "Edit customers",
  createCustomer: "Create customers",
  mergeCustomer: "Merge customers",
  deactivateCustomer: "Deactivate customers",
  checkInCustomer: "Check in customers",
  checkOutCustomer: "Check out customers",
  overrideAccess: "Override access rules",
  compAccess: "Grant comp access",
  manageProducts: "Manage products",
  manageWaivers: "Manage waivers",
  deactivateProduct: "Deactivate products",
  usePOS: "Use POS",
  refundTransaction: "Refund transactions",
  discountTransaction: "Apply discounts",
  editPrograms: "Manage programs",
  cancelPrograms: "Cancel programs",
  rosterAccess: "Access rosters and attendance",
  viewReports: "View reports",
  viewAttendanceReports: "View attendance reports",
  viewFinancialReports: "View financial reports",
  viewMembershipReports: "View membership reports",
  manageStaff: "Manage staff",
  inviteStaff: "Invite staff",
  manageRoles: "Manage roles",
  manageSettings: "Manage settings",
  manageBillingSettings: "Manage billing settings",
  managePlatformSettings: "Manage platform settings",
  grantCompAccess: "Grant comp access (customer actions)",
  manageCommunications: "Manage communications",
  sendTransactionalMessages: "Send transactional messages",
  messageAssignedParticipants: "Message assigned participants"
};

export const PERMISSION_DESCRIPTIONS: Record<StaffPermission, string> = {
  viewCustomers: "View customer records and profile details.",
  editCustomer: "Edit existing customer profile information.",
  createCustomer: "Create new customer records.",
  mergeCustomer: "Merge duplicate customer records.",
  deactivateCustomer: "Deactivate customer records.",
  checkInCustomer: "Check customers into the facility.",
  checkOutCustomer: "Check customers out of the facility.",
  overrideAccess: "Bypass standard access restrictions when needed.",
  compAccess: "Grant complimentary access products.",
  manageProducts: "Create and edit products and access items.",
  manageWaivers: "Create, version, assign, and validate waiver templates and signatures.",
  deactivateProduct: "Archive/deactivate products from active sale.",
  usePOS: "Use checkout and complete POS sales.",
  refundTransaction: "Issue transaction refunds.",
  discountTransaction: "Apply discounts during checkout.",
  editPrograms: "Create and edit programs/sessions.",
  cancelPrograms: "Cancel sessions and program instances.",
  rosterAccess: "View rosters and mark attendance.",
  viewReports: "Access operational report dashboards.",
  viewAttendanceReports: "Access attendance reporting details.",
  viewFinancialReports: "Access financial reporting details.",
  viewMembershipReports: "Access membership/access reporting details.",
  manageStaff: "Manage staff profiles and staff status.",
  inviteStaff: "Add or invite new staff.",
  manageRoles: "Create/edit role presets and permissions.",
  manageSettings: "Manage facility settings.",
  manageBillingSettings: "Manage payment and billing-related settings.",
  managePlatformSettings: "Manage advanced platform/system configuration.",
  grantCompAccess: "Use grant-comp actions in customer workflows.",
  manageCommunications: "Access the communications hub, templates, and message history.",
  sendTransactionalMessages: "Send customer-facing transactional messages and reminders.",
  messageAssignedParticipants: "Message participants, waitlists, and assigned program rosters."
};
