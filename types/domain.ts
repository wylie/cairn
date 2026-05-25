export type FacilityType = "climbing" | "yoga" | "fitness" | "camp" | "bike_park" | "hybrid";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  facilityType: FacilityType;
  timezone: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  shortName?: string;
  addressLine1?: string;
  city: string;
  state: string;
  postalCode?: string;
  phone?: string;
  active?: boolean;
  isDefault?: boolean;
  capacity?: number;
}

export interface FacilityProfile {
  organizationId: string;
  facilityName: string;
  shortName?: string;
  businessType?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  timezone: string;
}

export interface StaffRoleDefinition {
  id: string;
  name: string;
  description?: string;
  color?: string;
  permissions: StaffPermission[];
  active: boolean;
  isSystem: boolean;
}

export type StaffRole = "owner" | "manager" | "front_desk" | "instructor" | "volunteer_limited";

export type StaffPermission =
  | "viewCustomers"
  | "checkInCustomer"
  | "checkOutCustomer"
  | "overrideAccess"
  | "compAccess"
  | "editCustomer"
  | "createCustomer"
  | "mergeCustomer"
  | "deactivateCustomer"
  | "manageProducts"
  | "deactivateProduct"
  | "viewReports"
  | "viewAttendanceReports"
  | "viewFinancialReports"
  | "viewMembershipReports"
  | "usePOS"
  | "refundTransaction"
  | "discountTransaction"
  | "editPrograms"
  | "cancelPrograms"
  | "rosterAccess"
  | "manageSettings"
  | "manageBillingSettings"
  | "managePlatformSettings"
  | "manageStaff"
  | "manageRoles"
  | "inviteStaff"
  | "grantCompAccess";

export interface StaffUser {
  id: string;
  organizationId: string;
  locationIds: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  pronouns?: string;
  dateOfBirth?: string;
  role: StaffRole;
  initials: string;
  pin: string;
  active: boolean;
  status?: "active" | "inactive" | "on_leave";
  startDate?: string;
  lastActiveAt?: string;
  assignedProgramIds?: string[];
  certifications?: string[];
  notes?: string;
  canTeach?: boolean;
  activeInstructor?: boolean;
  instructorBio?: string;
  permissions: StaffPermission[];
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  locationId: string;
  action: string;
  actorStaffId: string;
  actorStaffName?: string;
  targetType?: "customer" | "session" | "product" | "registration" | "waiver" | "transaction" | "household" | "system";
  targetId?: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
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
  status: "valid" | "expired" | "missing";
  signedAt?: string;
  expiresAt?: string;
  signedByStaffId?: string;
  signedByCustomerId?: string;
  signedByRelationship?: HouseholdRelationship | "self";
  updatedByStaffId?: string;
  updatedByStaffName?: string;
  notes?: string;
}

export interface CustomerAccessRecord {
  id: string;
  customerId: string;
  productId?: string;
  type: "membership" | "day-pass" | "punch-pass" | "comp";
  status: "active" | "expired" | "cancelled" | "paused";
  startDate: string;
  expirationDate?: string;
  remainingPunches?: number;
  unlimitedAccess?: boolean;
  locationsAllowed?: string[];
  notes?: string;
  grantedByStaffId?: string;
  grantedByStaffName?: string;
  updatedAt?: string;
  updatedByStaffId?: string;
  updatedByStaffName?: string;
  pausedAt?: string;
  cancelledAt?: string;
  archivedAt?: string;
}

export interface Customer {
  id: string;
  memberId: string;
  organizationId: string;
  locationId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  pronouns?: string;
  customPronouns?: string;
  email: string;
  phone: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  tags: string[];
  checkInStatus: "in" | "out";
  membershipId?: string;
  punchPassId?: string;
  waiverId?: string;
  dayPassProductName?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePhotoUrl?: string;
  profilePhotoUpdatedAt?: string;
  profilePhotoUpdatedByStaffId?: string;
  updatedByStaffId?: string;
  updatedByStaffName?: string;
  updatedAt?: string;
  notes?: string;
  relatedCustomers?: CustomerRelationship[];
  paymentMethods?: CustomerPaymentMethod[];
  staffProfile?: StaffProfile;
}

export interface StaffProfile {
  isStaff: boolean;
  staffId: string;
  role: StaffRole;
  status: "active" | "inactive" | "on_leave";
  staffPin: string;
  locations: string[];
  assignedPrograms: string[];
  permissions: StaffPermission[];
  startDate?: string;
  certifications?: string[];
  staffNotes?: string;
  lastActive?: string;
  activityTimeline?: Array<{
    id: string;
    action: string;
    occurredAt: string;
    detail?: string;
  }>;
}

export type CustomerRelationshipType =
  | "parent_guardian"
  | "child"
  | "spouse_partner"
  | "sibling"
  | "emergency_contact"
  | "other";

export interface CustomerRelationship {
  relatedCustomerId: string;
  relationshipType: CustomerRelationshipType;
  notes?: string;
}

export interface CustomerPaymentMethod {
  paymentMethodId: string;
  cardBrand: string;
  last4: string;
  expirationMonth: number;
  expirationYear: number;
  billingName: string;
  isDefault: boolean;
  addedAt: string;
}

export interface Household {
  id: string;
  householdName: string;
  primaryContactCustomerId: string;
  billingCustomerId: string;
  locationId: string;
  notes?: string;
  createdAt: string;
}

export type HouseholdMemberRole =
  | "primary-adult"
  | "adult"
  | "guardian"
  | "dependent"
  | "child"
  | "emergency-contact-only";

export type HouseholdRelationship =
  | "parent"
  | "parent_guardian"
  | "child"
  | "spouse"
  | "partner"
  | "spouse_partner"
  | "sibling"
  | "guardian"
  | "dependent"
  | "emergency_contact_only"
  | "other";

export interface HouseholdMember {
  householdId: string;
  customerId: string;
  memberType: "adult" | "child";
  role: HouseholdMemberRole;
  relationship: HouseholdRelationship;
  canCheckInOthers: boolean;
  canPurchaseForOthers: boolean;
  canSignWaivers: boolean;
  emergencyContactPriority?: number;
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
  transactionId?: string;
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

export type PostSaleCheckInSlotStatus = "available" | "checked-in" | "skipped";

export interface PostSaleCheckInSlot {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  accessType: NonNullable<PosProduct["type"]>;
  assignedCustomerId?: string;
  assignedCustomerName?: string;
  status: PostSaleCheckInSlotStatus;
  checkedInAt?: string;
  checkedInByStaffId?: string;
  checkedInByStaffName?: string;
  checkInRecordId?: string;
}

export interface Program {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  category: "class" | "camp" | "clinic" | "course";
  programType?: "recurring_class" | "one_time_event" | "camp" | "clinic" | "team_league" | "appointment_session";
  active?: boolean;
  colorToken?: "blue" | "green" | "amber" | "purple" | "orange" | "slate" | "gray" | "red";
  defaultCapacity?: number;
  requiresWaiver?: boolean;
  guardianRequired?: boolean;
  dropInAllowed?: boolean;
  memberRequired?: boolean;
  skillLevel?: string;
  prerequisites?: string;
  locationId?: string;
  instructorIds?: string[];
  pricingModel?: "free" | "included_membership" | "paid_registration" | "drop_in_fee";
  dropInFeeCents?: number;
  basePriceCents?: number;
  waitlistEnabled?: boolean;
  minimumAge?: number;
  maximumAge?: number;
  ageRange?: string;
  tags?: string[];
}

export interface ClassCampSession {
  id: string;
  programId: string;
  locationId: string;
  title?: string;
  instructorStaffId?: string;
  instructorName?: string;
  notes?: string;
  waitlistEnabled?: boolean;
  waitlistCount?: number;
  status?: "scheduled" | "cancelled" | "completed";
  createdByStaffId?: string;
  updatedByStaffId?: string;
  cancelledAt?: string;
  cancelledByStaffId?: string;
  seriesId?: string;
  recurrenceRule?: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  enrolled: number;
}

export interface Registration {
  id: string;
  customerId: string;
  sessionId: string;
  status: "confirmed" | "waitlisted" | "cancelled" | "attended" | "absent" | "late" | "excused" | "no_show" | "checked_in" | "completed";
  waitlistPosition?: number;
  registeredAt?: string;
  updatedAt?: string;
  updatedByStaffId?: string;
  notes?: string;
  paymentStatus?: "paid" | "unpaid" | "included" | "comped";
}

export interface PosProduct {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: string;
  priceCents: number;
  type?: "access" | "membership" | "punch-pass" | "class" | "camp" | "registration" | "retail" | "comp";
  displayType?: string;
  productCategory?: string;
  colorToken?: "blue" | "green" | "amber" | "purple" | "orange" | "slate" | "gray" | "red";
  colorLabel?: string;
  categoryColorToken?: "blue" | "green" | "amber" | "purple" | "orange" | "slate" | "gray" | "red";
  showAsQuickButton?: boolean;
  quickButtonRank?: number;
  accessScope?: "facility" | "class" | "camp";
  accessBehavior?: "single_entry" | "punch_decrement" | "recurring_membership" | "registration_access" | "manual_comp" | "retail_placeholder";
  expirationBehavior?: "end_of_day" | "fixed_date" | "rolling_30_days" | "monthly";
  validDays?: number;
  punchQuantity?: number;
  expirationDays?: number;
  waiverRequired?: boolean;
  taxable?: boolean;
  minimumAge?: number;
  maximumAge?: number;
  guardianRequired?: boolean;
  householdEligible?: boolean;
  simultaneousAccessAllowed?: boolean;
  eligibleLocationIds?: string[];
  internalNotes?: string;
  tags?: string[];
  archivedAt?: string;
  createdByStaffId?: string;
  createdByStaffName?: string;
  updatedByStaffId?: string;
  updatedByStaffName?: string;
  updatedAt?: string;
  active?: boolean;
}

export interface ProductCategoryRecord {
  id: string;
  organizationId: string;
  key: string;
  label: string;
  colorToken?: "blue" | "green" | "amber" | "purple" | "orange" | "slate" | "gray" | "red";
  displayOrder: number;
  isSystem: boolean;
  active: boolean;
  archivedAt?: string;
}

export interface PosTransactionItem {
  productId: string;
  productName: string;
  category: string;
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
  paymentType: "mock" | "card" | "cash" | "comp" | "gift_card" | "account_credit";
  paymentProcessor?: string;
  paymentApprovalCode?: string;
  paymentCardLast4?: string;
  refundReason?: string;
  checkInTriggered: boolean;
  receiptNumber: string;
  checkInSlots?: PostSaleCheckInSlot[];
}
