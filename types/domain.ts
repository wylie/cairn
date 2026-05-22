export type FacilityType = "climbing" | "yoga" | "fitness" | "camp" | "bike_park" | "hybrid";

export interface Organization {
  id: string;
  name: string;
  facilityType: FacilityType;
  timezone: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  city: string;
  state: string;
  capacity?: number;
}

export type StaffRole = "owner" | "manager" | "front_desk" | "instructor";

export type StaffPermission =
  | "checkInCustomer"
  | "checkOutCustomer"
  | "overrideAccess"
  | "editCustomer"
  | "createCustomer"
  | "manageProducts"
  | "viewReports"
  | "usePOS"
  | "refundTransaction"
  | "editPrograms"
  | "manageSettings";

export interface StaffUser {
  id: string;
  organizationId: string;
  locationIds: string[];
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  initials: string;
  pin: string;
  active: boolean;
  permissions: StaffPermission[];
}

export type MembershipState = "active" | "expiring" | "inactive" | "trial";

export interface Membership {
  id: string;
  customerId: string;
  planName: string;
  status: MembershipState;
  renewalDate?: string;
}

export interface PunchPass {
  id: string;
  customerId: string;
  title: string;
  originalUses: number;
  remainingUses: number;
  expiresAt?: string;
  type?: "multi_visit" | "day_pass";
}

export interface Waiver {
  id: string;
  customerId: string;
  status: "signed" | "expired" | "missing";
  signedAt?: string;
  expiresAt?: string;
}

export interface Customer {
  id: string;
  memberId: string;
  organizationId: string;
  locationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  checkInStatus: "in" | "out";
  membershipId?: string;
  punchPassId?: string;
  waiverId?: string;
  dayPassProductName?: string;
  notes?: string;
}

export type CheckInSource = "manual_search" | "barcode_scan" | "pos_sale" | "registration";
export type EntryMethod = "membership" | "multi_visit_pass" | "day_pass" | "class_registration" | "camp_registration" | "staff_comp";
export type CheckInStatus = "checked-in" | "checked-out";

export interface CheckInLogRecord {
  id: string;
  organizationId: string;
  locationId: string;
  customerId: string;
  customerName: string;
  membershipPassType: string;
  entryMethod: EntryMethod;
  passProductUsed?: string;
  punchesUsed?: number;
  punchesRemaining?: number;
  checkInTime: string;
  checkOutTime: string | null;
  checkInSource: CheckInSource;
  status: CheckInStatus;
  checkedInByStaffId: string;
  checkedInByStaffName?: string;
  // Backward-compat for pre-workstation records kept in hot state during dev.
  staffUserId?: string;
  checkedOutByStaffId?: string;
  checkedOutByStaffName?: string;
  overriddenByStaffId?: string;
  overrideReason?: string;
  notes?: string;
}

export interface Program {
  id: string;
  organizationId: string;
  title: string;
  category: "class" | "camp" | "clinic" | "course";
}

export interface ClassCampSession {
  id: string;
  programId: string;
  locationId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  enrolled: number;
}

export interface Registration {
  id: string;
  customerId: string;
  sessionId: string;
  status: "confirmed" | "waitlisted" | "cancelled";
}

export interface PosProduct {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: "day_passes" | "memberships" | "punch_passes" | "classes" | "camps" | "retail" | "comps" | "misc";
  priceCents: number;
  type?: "access" | "membership" | "punch-pass" | "class" | "camp" | "retail" | "comp";
  productCategory?:
    | "day_passes"
    | "memberships"
    | "punch_passes"
    | "classes"
    | "camps"
    | "comps"
    | "retail"
    | "misc";
  colorToken?: "blue" | "green" | "amber" | "purple" | "orange" | "slate" | "gray" | "red";
  colorLabel?: string;
  categoryColorToken?: "blue" | "green" | "amber" | "purple" | "orange" | "gray";
  showAsQuickButton?: boolean;
  accessScope?: "facility" | "class" | "camp";
  accessBehavior?: "single_entry" | "punch_decrement" | "recurring_membership" | "registration_access" | "manual_comp" | "retail_placeholder";
  expirationBehavior?: "end_of_day" | "fixed_date" | "rolling_30_days" | "monthly";
  validDays?: number;
  punchQuantity?: number;
  expirationDays?: number;
  waiverRequired?: boolean;
  active?: boolean;
}

export interface PosTransactionItem {
  productId: string;
  productName: string;
  category: PosProduct["category"];
  type: NonNullable<PosProduct["type"]>;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PosTransaction {
  id: string;
  organizationId: string;
  locationId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerMemberId?: string;
  transactionType: "sale" | "return";
  originalTransactionId?: string;
  returnStatus: "none" | "partially_returned" | "fully_returned";
  returnedItemIds?: string[];
  refundedTotal?: number;
  soldByStaffId?: string;
  soldByStaffName?: string;
  items: PosTransactionItem[];
  subtotal: number;
  total: number;
  completedAt: string;
  paymentType: "mock";
  checkInTriggered: boolean;
  receiptNumber: string;
}
