import type { StaffPermission, StaffRole } from "@/types/domain";

export type CapabilityKey =
  | "customers.view"
  | "customers.edit"
  | "customers.delete"
  | "checkin.use"
  | "checkin.override"
  | "products.view"
  | "products.edit"
  | "products.pricing"
  | "pos.use"
  | "pos.discount"
  | "pos.refund"
  | "programs.view"
  | "programs.edit"
  | "reports.basic"
  | "reports.advanced"
  | "reports.export"
  | "staff.manage"
  | "settings.manage";

export const CAPABILITY_PERMISSION_MAP: Record<CapabilityKey, StaffPermission[]> = {
  "customers.view": ["viewCustomers"],
  "customers.edit": ["editCustomer", "createCustomer"],
  "customers.delete": ["deactivateCustomer", "mergeCustomer"],
  "checkin.use": ["checkInCustomer", "checkOutCustomer"],
  "checkin.override": ["overrideAccess"],
  "products.view": ["manageProducts"],
  "products.edit": ["manageProducts", "deactivateProduct"],
  "products.pricing": ["manageProducts"],
  "pos.use": ["usePOS"],
  "pos.discount": ["discountTransaction"],
  "pos.refund": ["refundTransaction"],
  "programs.view": ["rosterAccess", "editPrograms"],
  "programs.edit": ["editPrograms", "cancelPrograms"],
  "reports.basic": ["viewReports", "viewAttendanceReports"],
  "reports.advanced": ["viewMembershipReports", "viewFinancialReports"],
  "reports.export": ["viewFinancialReports"],
  "staff.manage": ["manageStaff", "manageRoles", "inviteStaff"],
  "settings.manage": ["manageSettings", "manageBillingSettings", "managePlatformSettings"]
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  front_desk: "Front Desk",
  instructor: "Instructor / Coach",
  volunteer_limited: "Volunteer / Limited"
};

