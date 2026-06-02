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
  legalBusinessName?: string;
  shortName?: string;
  businessType?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  currency?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  description?: string;
  emergencyContact?: string;
  timezone: string;
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "Month D, YYYY";
  timeFormat?: "12-hour" | "24-hour";
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
  | "manageWaivers"
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

export type OperationsAlertType =
  | "customer"
  | "membership"
  | "waiver"
  | "program"
  | "inventory"
  | "financial"
  | "staff";

export type OperationsAlertSeverity = "critical" | "warning" | "info";
export type OperationsAlertStatus = "open" | "resolved" | "archived";

export interface OperationsAlertRecord {
  id: string;
  organizationId: string;
  locationId?: string;
  source: "system" | "staff";
  type: OperationsAlertType;
  severity: OperationsAlertSeverity;
  status: OperationsAlertStatus;
  title: string;
  description?: string;
  customerId?: string;
  membershipId?: string;
  waiverTemplateId?: string;
  sessionId?: string;
  programId?: string;
  productId?: string;
  transactionId?: string;
  staffUserId?: string;
  createdAt: string;
  createdByStaffId?: string;
  createdByStaffName?: string;
  resolvedAt?: string;
  archivedAt?: string;
}

export type OperationsTaskStatus = "open" | "in_progress" | "completed" | "archived";

export interface OperationsTaskRecord {
  id: string;
  organizationId: string;
  locationId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status: OperationsTaskStatus;
  customerId?: string;
  membershipId?: string;
  waiverTemplateId?: string;
  sessionId?: string;
  productId?: string;
  createdAt: string;
  createdByStaffId?: string;
  createdByStaffName?: string;
  completedAt?: string;
}

export type MembershipState =
  | "active"
  | "pending"
  | "frozen"
  | "expired"
  | "cancelled"
  | "suspended"
  | "expiring"
  | "inactive"
  | "trial";

export interface Membership {
  id: string;
  customerId: string;
  planName: string;
  status: MembershipState;
  purchaseDate?: string;
  startDate?: string;
  expirationDate?: string;
  renewalDate?: string;
  freezeStartDate?: string;
  freezeEndDate?: string;
  freezeReason?: string;
  freezeStaffNotes?: string;
}

export interface PunchPass {
  id: string;
  customerId: string;
  title: string;
  originalUses: number;
  remainingUses: number;
  expiresAt?: string;
  type?: "multi_visit" | "day_pass";
  usageHistory?: Array<{
    id: string;
    usedAt: string;
    staffId?: string;
    staffName?: string;
    change: number;
    note?: string;
  }>;
}

export interface Waiver {
  id: string;
  customerId: string;
  status: "valid" | "expired" | "missing";
  templateId?: string;
  templateName?: string;
  templateVersion?: string;
  typedName?: string;
  signedAt?: string;
  expiresAt?: string;
  signedByStaffId?: string;
  signedByCustomerId?: string;
  signedByName?: string;
  signedByRelationship?: HouseholdRelationship | "self";
  updatedByStaffId?: string;
  updatedByStaffName?: string;
  notes?: string;
}

export type WaiverBlockType =
  | "heading"
  | "paragraph"
  | "checkbox"
  | "required_checkbox"
  | "initial_required"
  | "typed_name"
  | "signature_placeholder"
  | "emergency_contact_section"
  | "guardian_agreement"
  | "medical_information_placeholder"
  | "free_text"
  | "staff_notes";

export interface WaiverTemplateBlock {
  id: string;
  type: WaiverBlockType;
  label: string;
  content?: string;
  required?: boolean;
}

export type WaiverExpirationRuleType =
  | "never"
  | "fixed_date"
  | "days_after_signing"
  | "annual"
  | "program_completion"
  | "membership_expiration"
  | "per_transaction";

export interface WaiverTemplateVersion {
  id: string;
  templateId: string;
  version: string;
  effectiveDate: string;
  active: boolean;
  archived?: boolean;
  blocks: WaiverTemplateBlock[];
  changeNotes?: string;
  createdAt: string;
  createdByStaffId?: string;
}

export interface WaiverTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  active: boolean;
  archived?: boolean;
  facilityAssignment?: string[];
  productAssignment?: string[];
  brandingAssignment?: string;
  effectiveDate: string;
  expirationRuleType: WaiverExpirationRuleType;
  expirationDays?: number;
  fixedExpirationDate?: string;
  versionIds: string[];
  currentVersionId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SignedWaiverRecord {
  id: string;
  organizationId: string;
  customerId: string;
  waiverId: string;
  templateId: string;
  templateName: string;
  templateVersionId: string;
  templateVersion: string;
  status: "valid" | "expired" | "missing" | "expiring_soon" | "outdated_version";
  signedAt: string;
  expiresAt?: string;
  signedByName: string;
  signedByCustomerId?: string;
  signedByRelationship?: HouseholdRelationship | "self";
  typedName: string;
  typedSignature: string;
  acknowledgementChecks: Array<{ label: string; required: boolean; accepted: boolean }>;
  contentSnapshot: WaiverTemplateBlock[];
  signedByStaffId?: string;
  updatedByStaffId?: string;
  updatedByStaffName?: string;
  source?: "staff" | "kiosk" | "online" | "registration" | "guest";
  signingTokenId?: string;
  ipAddressPlaceholder?: string;
  pdfUrlPlaceholder?: string;
  createdAt: string;
}

export interface CustomerAccessRecord {
  id: string;
  customerId: string;
  productId?: string;
  type: "membership" | "day-pass" | "punch-pass" | "comp" | "time-pass" | "household-membership" | "staff-access" | "complimentary-access";
  status: "active" | "pending" | "frozen" | "expired" | "cancelled" | "suspended" | "paused";
  startDate: string;
  expirationDate?: string;
  purchaseDate?: string;
  remainingPunches?: number;
  unlimitedAccess?: boolean;
  locationsAllowed?: string[];
  minimumAge?: number;
  maximumAge?: number;
  requiredWaiverTemplateIds?: string[];
  memberRequired?: boolean;
  allowedProgramIds?: string[];
  householdId?: string;
  primaryMemberCustomerId?: string;
  coveredCustomerIds?: string[];
  freezeStartDate?: string;
  freezeEndDate?: string;
  freezeReason?: string;
  freezeStaffNotes?: string;
  notes?: string;
  grantedByStaffId?: string;
  grantedByStaffName?: string;
  updatedAt?: string;
  updatedByStaffId?: string;
  updatedByStaffName?: string;
  pausedAt?: string;
  cancelledAt?: string;
  suspendedAt?: string;
  archivedAt?: string;
}

export interface Customer {
  id: string;
  memberId: string;
  organizationId: string;
  locationId: string;
  createdAt?: string;
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
  profilePhotoUpdatedBy?: string;
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
  defaultAddress?: string;
  defaultEmergencyContactName?: string;
  defaultEmergencyContactPhone?: string;
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
  | "caregiver"
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

export type CheckInSource = "manual_search" | "barcode_scan" | "pos_sale" | "registration" | "automatic_closeout";
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
  requiredWaiverTemplateIds?: string[];
  guardianRequired?: boolean;
  dropInAllowed?: boolean;
  memberRequired?: boolean;
  skillLevel?: string;
  prerequisites?: string;
  locationId?: string;
  instructorIds?: string[];
  defaultInstructorId?: string;
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
  registeredByStaffId?: string;
  registeredByStaffName?: string;
  registrationSource?: "front_desk" | "online" | "import" | "admin";
  updatedAt?: string;
  updatedByStaffId?: string;
  notes?: string;
  paymentStatus?: "paid" | "unpaid" | "included" | "comped";
}

export type RegistrationActivityAction =
  | "registered"
  | "waitlisted"
  | "promoted"
  | "checked_in"
  | "attended"
  | "absent"
  | "excused"
  | "cancelled"
  | "transferred"
  | "duplicated"
  | "note_added";

export interface RegistrationActivityEvent {
  id: string;
  registrationId: string;
  sessionId: string;
  customerId: string;
  action: RegistrationActivityAction;
  statusAfter?: Registration["status"];
  source?: Registration["registrationSource"] | "staff";
  note?: string;
  createdAt: string;
  staffId?: string;
  staffName?: string;
}

export interface PosProduct {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: string;
  sku?: string;
  barcode?: string;
  status?: "draft" | "active" | "archived";
  priceCents: number;
  costCents?: number;
  marginPercent?: number;
  type?:
    | "access"
    | "membership"
    | "punch-pass"
    | "class"
    | "camp"
    | "registration"
    | "retail"
    | "comp"
    | "day-pass"
    | "program-registration"
    | "rental"
    | "gift-card"
    | "service"
    | "digital-product";
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
  memberPriceCents?: number;
  nonMemberPriceCents?: number;
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
  featured?: boolean;
  onlineVisible?: boolean;
  imageUrls?: string[];
  facilityAvailability?: string[];
  trackInventory?: boolean;
  lowStockThreshold?: number;
  inventoryByLocation?: Record<string, number>;
  variants?: ProductVariant[];
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  shippingRequired?: boolean;
  pickupAvailable?: boolean;
  fulfillmentLocationIds?: string[];
  stripeProductIdPlaceholder?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  option1?: string;
  option2?: string;
  option3?: string;
  sku?: string;
  barcode?: string;
  priceCents?: number;
  costCents?: number;
  inventoryByLocation?: Record<string, number>;
  active?: boolean;
}

export interface InventoryAuditEntry {
  id: string;
  organizationId: string;
  locationId: string;
  productId: string;
  variantId?: string;
  action: "receive" | "adjust" | "transfer_out" | "transfer_in" | "damaged";
  quantityDelta: number;
  note?: string;
  createdAt: string;
  createdByStaffId?: string;
  createdByStaffName?: string;
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
  purchaserCustomerId?: string;
  purchaserCustomerName?: string;
  purchasedForCustomerIds?: string[];
  householdId?: string;
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
  paymentType: "mock" | "card" | "cash" | "comp" | "gift_card" | "account_credit" | "split";
  receiptStatus?: "paid" | "pending" | "refunded" | "partially_refunded" | "voided" | "comped";
  paymentBreakdown?: Array<{ method: "card" | "cash" | "comp" | "gift_card" | "account_credit"; amountCents: number }>;
  discountCents?: number;
  taxCents?: number;
  compCents?: number;
  paymentProcessor?: string;
  paymentApprovalCode?: string;
  paymentCardLast4?: string;
  refundReason?: string;
  checkInTriggered: boolean;
  receiptNumber: string;
  checkInSlots?: PostSaleCheckInSlot[];
}
