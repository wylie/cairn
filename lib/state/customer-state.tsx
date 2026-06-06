"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { checkInRecords as seedCheckInRecords } from "@/lib/mocks/checkins";
import { accessRecords as seedAccessRecords } from "@/lib/mocks/access-records";
import { customers as seedCustomers } from "@/lib/mocks/customers";
import { locations as seedLocations } from "@/lib/mocks/locations";
import { memberships as seedMemberships } from "@/lib/mocks/memberships";
import {
  billingAccounts as seedBillingAccounts,
  billingCreditEntries as seedBillingCreditEntries,
  billingInvoices as seedBillingInvoices,
  billingRefunds as seedBillingRefunds,
  billingStatements as seedBillingStatements,
  membershipRenewals as seedMembershipRenewals
} from "@/lib/mocks/billing";
import { punchPasses as seedPunchPasses } from "@/lib/mocks/passes";
import { posProducts as seedPosProducts } from "@/lib/mocks/products";
import { classCampSessions as seedSessions, programs as seedPrograms } from "@/lib/mocks/programs";
import { registrations as seedRegistrations } from "@/lib/mocks/registrations";
import { posTransactions as seedPosTransactions } from "@/lib/mocks/transactions";
import { waivers as seedWaivers } from "@/lib/mocks/waivers";
import { waiverTemplates as seedWaiverTemplates, waiverTemplateVersions as seedWaiverTemplateVersions } from "@/lib/mocks/waiver-templates";
import { signedWaiverRecords as seedSignedWaiverRecords } from "@/lib/mocks/waiver-signed-records";
import { households as seedHouseholds, householdMembers as seedHouseholdMembers } from "@/lib/mocks/households";
import {
  maintenanceBlocks as seedMaintenanceBlocks,
  rentableResources as seedRentableResources,
  reservations as seedReservations
} from "@/lib/mocks/rentals";
import { buildScopedMockKey, clearScopedMockState, loadMockState, saveMockState } from "@/lib/mock-storage";
import { buildSystemProductCategories, normalizeCategoryKey } from "@/lib/products/categories";
import { isValidUsState, normalizeCity, normalizeStateInput, normalizeStreetAddress } from "@/lib/customer-input-format";
import {
  calculateTransactionTotals,
  createTransactionItem,
  normalizeCartItem,
  normalizeProductPriceCents
} from "@/lib/pos-transactions";
import { mockPaymentProvider, type PaymentMethod } from "@/lib/payments/provider";
import { normalizeTransactions } from "@/lib/transactions";
import { evaluateCustomerAccess, getEligibleAccess, type AccessDecision } from "@/lib/access-rules";
import { getDefaultCommunicationTemplates, renderTemplateVariables } from "@/lib/communications/templates";
import { billingProvider, invoiceProvider, refundProvider } from "@/lib/billing/providers";
import {
  buildMembershipCardSearchTerms,
  getMembershipBarcodeValue,
  getMembershipNumber,
  getMembershipQrToken,
  selectPrimaryMembershipCardRecord
} from "@/lib/memberships/cards";
import type {
  AutomatedCommunicationTrigger,
  BillingAccount,
  BillingCreditEntry,
  BillingInvoice,
  BillingPaymentMethodType,
  BillingRefundRecord,
  BillingStatement,
  CheckInLogRecord,
  CheckInSource,
  CommunicationContactMethod,
  CommunicationPreferenceSettings,
  CommunicationRecord,
  CommunicationRecipient,
  CommunicationSource,
  CommunicationTemplate,
  Customer,
  CustomerRelationshipType,
  Household,
  HouseholdMember,
  HouseholdMemberRole,
  HouseholdRelationship,
  CustomerAccessRecord,
  EntryMethod,
  InventoryAuditEntry,
  Membership,
  MembershipRenewalRecord,
  MaintenanceBlock,
  MembershipCardEvent,
  PosProduct,
  PosTransaction,
  PosTransactionItem,
  PostSaleCheckInSlot,
  Program,
  ProductCategoryRecord,
  PunchPass,
  ClassCampSession,
  RentableResource,
  Registration,
  RegistrationActivityEvent,
  ReservationRecord,
  OperationsAlertRecord,
  OperationsAlertStatus,
  OperationsTaskRecord,
  StaffPermission,
  StaffRole,
  Waiver,
  SignedWaiverRecord,
  WaiverTemplate,
  WaiverTemplateVersion,
  WaiverExpirationRuleType,
  WaiverTemplateBlock
} from "@/types/domain";
import { resolveTenant } from "@/lib/tenant/resolve";
import { getCurrentOrgSlugClient } from "@/lib/tenant/client";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";
import { useSettingsState } from "@/lib/state/settings-state";

const BASE_DATE = "2026-05-20";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00Z`);
}

function addDays(key: string, days: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();
}

function diffDays(fromKey: string, toKey?: string) {
  if (!toKey) return null;
  const from = dateFromKey(fromKey);
  const to = dateFromKey(toKey);
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function isMinor(dateOfBirth?: string) {
  if (!dateOfBirth) return false;
  const birthYear = Number(dateOfBirth.slice(0, 4));
  return Number.isFinite(birthYear) ? 2026 - birthYear < 18 : false;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrencyAmount(cents: number) {
  return `$${Math.abs(cents / 100).toFixed(2)}`;
}

function getBillingAccountStatus(currentBalanceCents: number, availableCreditCents: number): BillingAccount["status"] {
  if (currentBalanceCents < 0) return "due";
  if (availableCreditCents > 0 || currentBalanceCents > 0) return "credit";
  return "current";
}

function getNextRenewalDate(dateKey: string, frequency: MembershipRenewalRecord["billingFrequency"]) {
  const date = dateFromKey(dateKey);
  if (frequency === "quarterly") date.setUTCMonth(date.getUTCMonth() + 3);
  else if (frequency === "annual") date.setUTCFullYear(date.getUTCFullYear() + 1);
  else if (frequency === "custom") date.setUTCDate(date.getUTCDate() + 45);
  else date.setUTCMonth(date.getUTCMonth() + 1);
  return toDateKey(date);
}

const DEFAULT_COMMUNICATION_PREFERENCES: CommunicationPreferenceSettings = {
  email: true,
  sms: true,
  marketing: false,
  transactional: true,
  preferredContactMethod: "email"
};

function isCommunicationTransactional(
  source?: CommunicationSource,
  automatedTrigger?: AutomatedCommunicationTrigger
) {
  if (source === "manual") return false;
  if (source === "system_alert") return true;
  if (!source && automatedTrigger === "birthday") return false;
  return true;
}

function inferCommunicationSource(
  source?: CommunicationSource,
  automatedTrigger?: AutomatedCommunicationTrigger,
  templateType?: CommunicationRecord["templateType"]
): CommunicationSource {
  if (source) return source;
  switch (automatedTrigger) {
    case "membership_expiring_30":
    case "membership_expiring_7":
      return "membership_reminder";
    case "waiver_expiring":
    case "waiver_missing":
      return "waiver_reminder";
    case "program_registration":
      return "registration_confirmation";
    case "waitlist_promotion":
      return "waitlist_promotion";
    case "program_cancellation":
      return "program_cancellation";
    case "payment_failure":
      return "payment_reminder";
    case "invoice_available":
      return "invoice_available";
    case "statement_ready":
      return "statement_ready";
    case "birthday":
      return "birthday";
    default:
      break;
  }
  switch (templateType) {
    case "membership_renewal":
      return "membership_reminder";
    case "waiver_reminder":
    case "waiver_missing":
      return "waiver_reminder";
    case "registration_confirmation":
      return "registration_confirmation";
    case "waitlist_confirmation":
      return "waitlist_confirmation";
    case "waitlist_promotion":
      return "waitlist_promotion";
    case "program_cancellation":
      return "program_cancellation";
    case "birthday_greeting":
      return "birthday";
    case "payment_reminder":
      return "payment_reminder";
    case "invoice_available":
      return "invoice_available";
    case "statement_ready":
      return "statement_ready";
    case "failed_payment_notice":
      return "failed_payment_notice";
    default:
      return "manual";
  }
}

function normalizeProductForState(product: PosProduct): PosProduct {
  const normalizedPriceCents = normalizeProductPriceCents(product);
  const defaultDisplayType =
    product.displayType?.trim() ||
    (product.type === "membership"
      ? "Memberships"
      : product.type === "punch-pass"
        ? "Punch Passes"
        : product.type === "class"
          ? "Classes"
          : product.type === "camp"
            ? "Camps"
            : product.type === "retail"
              ? "Retail"
              : product.type === "comp"
                ? "Comps"
                : "Day Passes");
  return {
    ...product,
    priceCents: normalizedPriceCents ?? 0,
    tags: Array.isArray(product.tags) ? product.tags.filter(Boolean) : [],
    displayType: defaultDisplayType
  };
}

function normalizeSessionForState(session: ClassCampSession, programs: Program[]): ClassCampSession {
  return {
    ...session,
    title: session.title?.trim() ? session.title.trim() : undefined,
    waitlistEnabled: session.waitlistEnabled ?? false,
    waitlistCount: session.waitlistCount ?? 0,
    status: session.status ?? "scheduled"
  };
}

function normalizeProgramForState(program: Program): Program {
  if (typeof program.minimumAge === "number" || typeof program.maximumAge === "number") {
    return program;
  }
  if (!program.ageRange) return program;
  const plusMatch = program.ageRange.match(/^(\d+)\+$/);
  if (plusMatch) {
    return { ...program, minimumAge: Number(plusMatch[1]), maximumAge: undefined };
  }
  const rangeMatch = program.ageRange.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    return {
      ...program,
      minimumAge: Number(rangeMatch[1]),
      maximumAge: Number(rangeMatch[2])
    };
  }
  return program;
}

function normalizeCustomersForState(customers: Customer[], seededCustomers: Customer[]): Customer[] {
  const seededById = new Map(seededCustomers.map((customer) => [customer.id, customer]));
  return customers.map((customer) => {
    const seeded = seededById.get(customer.id);
    if (!seeded) return customer;
    return {
      ...customer,
      preferredName: customer.preferredName?.trim() ? customer.preferredName : seeded.preferredName ?? customer.firstName,
      pronouns: customer.pronouns?.trim() ? customer.pronouns : seeded.pronouns ?? "Prefer not to say",
      customPronouns: customer.customPronouns?.trim() ? customer.customPronouns : seeded.customPronouns,
      dateOfBirth: customer.dateOfBirth?.trim() ? customer.dateOfBirth : seeded.dateOfBirth,
      phone: customer.phone?.trim() ? customer.phone : seeded.phone,
      addressLine1: customer.addressLine1?.trim() ? customer.addressLine1 : seeded.addressLine1,
      city: customer.city?.trim() ? customer.city : seeded.city,
      state: customer.state?.trim() ? customer.state : seeded.state,
      postalCode: customer.postalCode?.trim() ? customer.postalCode : seeded.postalCode,
      emergencyContactName: customer.emergencyContactName?.trim()
        ? customer.emergencyContactName
        : seeded.emergencyContactName,
      emergencyContactPhone: customer.emergencyContactPhone?.trim()
        ? customer.emergencyContactPhone
        : seeded.emergencyContactPhone,
      communicationPreferences: {
        ...DEFAULT_COMMUNICATION_PREFERENCES,
        ...(seeded.communicationPreferences ?? {}),
        ...(customer.communicationPreferences ?? {})
      }
    };
  });
}

function mergeSeedCustomers(stored: Customer[], seededCustomers: Customer[]) {
  const byId = new Map(stored.map((customer) => [customer.id, customer]));
  const merged: Customer[] = [...stored];
  for (const seeded of seededCustomers) {
    if (!byId.has(seeded.id)) {
      merged.push(seeded);
    }
  }
  return merged;
}

function normalizeHouseholdMemberForState(member: HouseholdMember): HouseholdMember {
  return {
    ...member,
    memberType:
      member.memberType ??
      (member.role === "child" || member.role === "dependent" ? "child" : "adult"),
    relationship:
      member.relationship === "guardian"
        ? "parent_guardian"
        : member.relationship === "partner" || member.relationship === "spouse"
          ? "spouse_partner"
          : member.relationship
  };
}

function canCreateSaleCheckInSlot(product: PosProduct) {
  return product.type !== "retail";
}

function expandSaleCheckInSlots(
  transactionId: string,
  products: PosProduct[],
  purchasingCustomer: Customer
): PostSaleCheckInSlot[] {
  const eligible = products.filter(canCreateSaleCheckInSlot);
  return eligible.map((product, index) => ({
    id: `slot_${Math.random().toString(36).slice(2, 9)}`,
    transactionId,
    productId: product.id,
    productName: product.name,
    accessType: product.type ?? "access",
    status: "available" as const,
    assignedCustomerId: index === 0 ? purchasingCustomer.id : undefined,
    assignedCustomerName: index === 0 ? `${purchasingCustomer.firstName} ${purchasingCustomer.lastName}` : undefined
  }));
}

interface CustomerStateContextValue {
  customers: Customer[];
  billingAccounts: BillingAccount[];
  billingCreditEntries: BillingCreditEntry[];
  billingInvoices: BillingInvoice[];
  billingStatements: BillingStatement[];
  membershipRenewals: MembershipRenewalRecord[];
  billingRefunds: BillingRefundRecord[];
  memberships: Membership[];
  punchPasses: PunchPass[];
  accessProducts: PosProduct[];
  inventoryAuditEntries: InventoryAuditEntry[];
  productCategories: ProductCategoryRecord[];
  transactions: PosTransaction[];
  programs: Program[];
  sessions: ClassCampSession[];
  registrations: Registration[];
  registrationActivity: RegistrationActivityEvent[];
  customerAccessRecords: CustomerAccessRecord[];
  waivers: Waiver[];
  signedWaiverRecords: SignedWaiverRecord[];
  waiverTemplates: WaiverTemplate[];
  waiverTemplateVersions: WaiverTemplateVersion[];
  households: Household[];
  householdMembers: HouseholdMember[];
  rentableResources: RentableResource[];
  reservations: ReservationRecord[];
  maintenanceBlocks: MaintenanceBlock[];
  communicationTemplates: CommunicationTemplate[];
  communications: CommunicationRecord[];
  membershipCardEvents: MembershipCardEvent[];
  operationsAlerts: OperationsAlertRecord[];
  operationsTasks: OperationsTaskRecord[];
  checkInRecords: CheckInLogRecord[];
  activeLocationId: string;
  activeDateKey: string;
  setToday: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  isActiveDateToday: boolean;
  todayLogRecords: CheckInLogRecord[];
  occupancyCount: number;
  totalCheckIns: number;
  checkedOutCount: number;
  evaluateCustomerEntry: (customerId: string) => AccessDecision;
  searchCustomers: (query: string) => Customer[];
  checkInCustomer: (
    customerId: string,
    options: {
      staffUserId: string;
      staffName?: string;
      source?: CheckInSource;
      overrideReason?: string;
      customerOverride?: Customer;
      transactionId?: string;
      slotId?: string;
    }
  ) => { ok: boolean; message: string; recordId?: string };
  checkOutRecord: (recordId: string, staffUserId: string, staffName?: string) => { ok: boolean; message: string };
  runCustomerCheckInAction: (
    customerId: string,
    options: { staffUserId: string; staffName?: string; source?: CheckInSource; overrideReason?: string }
  ) => { ok: boolean; message: string; action: "check-in" | "check-out" };
  sellAccessProducts: (options: {
    customerId: string;
    purchaseForCustomerIds?: string[];
    productIds: string[];
    soldByStaffId: string;
    soldByStaffName?: string;
    paymentType?: PaymentMethod;
    paymentProcessor?: string;
    paymentApprovalCode?: string;
    paymentCardLast4?: string;
    checkInAfterSale?: boolean;
    lineItemUnitPriceCents?: number[];
  }) => { ok: boolean; message: string; transactionId?: string; transaction?: PosTransaction };
  refundTransaction: (options: {
    transactionId: string;
    amount?: number;
    itemProductIds?: string[];
    reason: string;
    staffId: string;
    staffName?: string;
  }) => { ok: boolean; message: string; refundTransaction?: PosTransaction };
  assignSaleCheckInSlotCustomer: (
    transactionId: string,
    slotId: string,
    customerId: string
  ) => { ok: boolean; message: string };
  fulfillSaleCheckInSlot: (
    transactionId: string,
    slotId: string,
    options: { staffUserId: string; staffName?: string; overrideReason?: string }
  ) => { ok: boolean; message: string };
  addCustomer: (input: {
    firstName: string;
    lastName: string;
    preferredName?: string;
    pronouns?: string;
    customPronouns?: string;
    dateOfBirth?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    profilePhotoUrl?: string;
    waiverStatus?: "valid" | "missing" | "expired";
    waiverSignedToday?: boolean;
    relatedCustomerId?: string;
    relationshipType?: CustomerRelationshipType;
    relationshipNotes?: string;
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => { ok: boolean; message: string; customerId?: string };
  addStaffProfileToCustomer: (input: {
    customerId: string;
    staffId: string;
    role: StaffRole;
    status: "active" | "inactive" | "on_leave";
    staffPin: string;
    locations: string[];
    assignedPrograms?: string[];
    permissions?: StaffPermission[];
    startDate?: string;
    certifications?: string[];
    staffNotes?: string;
  }) => { ok: boolean; message: string };
  updateStaffProfileForCustomer: (input: {
    customerId: string;
    role: StaffRole;
    status: "active" | "inactive" | "on_leave";
    staffPin: string;
    locations: string[];
    assignedPrograms?: string[];
    permissions?: StaffPermission[];
    startDate?: string;
    certifications?: string[];
    staffNotes?: string;
  }) => { ok: boolean; message: string };
  clearStaffProfileForCustomer: (customerId: string) => { ok: boolean; message: string };
  updateCustomerProfile: (input: {
    customerId: string;
    firstName: string;
    lastName: string;
    preferredName: string;
    dateOfBirth: string;
    pronouns?: string;
    customPronouns?: string;
    memberId: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    profilePhotoUrl?: string;
    updatedByStaffId: string;
    updatedByStaffName?: string;
  }) => { ok: boolean; message: string };
  updateCustomerPhoto: (input: {
    customerId: string;
    profilePhotoUrl?: string;
    updatedByStaffId: string;
    updatedByStaffName?: string;
  }) => { ok: boolean; message: string };
  updateCustomerCommunicationPreferences: (
    customerId: string,
    updates: Partial<CommunicationPreferenceSettings>
  ) => { ok: boolean; message: string };
  adjustBillingCredit: (input: {
    billingAccountId: string;
    amountCents: number;
    action: BillingCreditEntry["action"];
    reason: string;
    transferBillingAccountId?: string;
    invoiceId?: string;
    customerId?: string;
    householdId?: string;
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => { ok: boolean; message: string; creditEntryId?: string };
  createBillingStatement: (input: {
    billingAccountId: string;
    periodStart: string;
    periodEnd: string;
    customerId?: string;
    householdId?: string;
  }) => { ok: boolean; message: string; statementId?: string };
  retryMembershipRenewal: (renewalId: string, options?: { createdByStaffId?: string; createdByStaffName?: string }) => { ok: boolean; message: string };
  markBillingInvoicePaid: (invoiceId: string, options?: { createdByStaffId?: string; createdByStaffName?: string; paymentMethodType?: BillingPaymentMethodType }) => { ok: boolean; message: string };
  grantTemporaryAccessForRenewal: (renewalId: string, untilDate: string, options?: { createdByStaffId?: string; createdByStaffName?: string }) => { ok: boolean; message: string };
  createBillingRefund: (input: {
    billingAccountId: string;
    amountCents: number;
    type: BillingRefundRecord["type"];
    reason: string;
    relatedReceiptId?: string;
    relatedInvoiceId?: string;
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => { ok: boolean; message: string; refundId?: string };
  addCustomerRelationship: (
    customerId: string,
    input: { relatedCustomerId: string; relationshipType: CustomerRelationshipType; notes?: string }
  ) => { ok: boolean; message: string };
  removeCustomerRelationship: (customerId: string, relatedCustomerId: string) => { ok: boolean; message: string };
  createSession: (input: {
    programId: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    title?: string;
    locationId?: string;
    instructorName?: string;
    instructorStaffId?: string;
    waitlistEnabled?: boolean;
    notes?: string;
    updatedByStaffId?: string;
    seriesId?: string;
    recurrenceRule?: string;
  }) => { ok: boolean; message: string; sessionId?: string };
  updateSession: (input: {
    sessionId: string;
    title?: string;
    programId: string;
    locationId: string;
    startsAt: string;
    endsAt: string;
    instructorName?: string;
    instructorStaffId?: string;
    capacity: number;
    waitlistEnabled: boolean;
    notes?: string;
    updatedByStaffId?: string;
  }) => { ok: boolean; message: string };
  cancelSession: (sessionId: string, cancelledByStaffId?: string) => { ok: boolean; message: string };
  registerCustomerForSession: (input: {
    customerId: string;
    sessionId: string;
    override?: boolean;
    registrationSource?: Registration["registrationSource"];
    registeredByStaffId?: string;
    registeredByStaffName?: string;
  }) => { ok: boolean; message: string; registrationId?: string };
  cancelRegistration: (registrationId: string) => { ok: boolean; message: string };
  promoteWaitlistedRegistration: (registrationId: string) => { ok: boolean; message: string };
  moveRegistrationToWaitlist: (registrationId: string) => { ok: boolean; message: string };
  markRegistrationAttendance: (
    registrationId: string,
    status: "attended" | "absent" | "late" | "excused" | "no_show" | "checked_in" | "completed",
    updatedByStaffId?: string
  ) => { ok: boolean; message: string };
  transferRegistration: (input: {
    registrationId: string;
    targetSessionId: string;
    override?: boolean;
    updatedByStaffId?: string;
    updatedByStaffName?: string;
  }) => { ok: boolean; message: string; newRegistrationId?: string };
  duplicateRegistration: (input: {
    registrationId: string;
    targetSessionId?: string;
    updatedByStaffId?: string;
    updatedByStaffName?: string;
  }) => { ok: boolean; message: string; newRegistrationId?: string };
  reorderWaitlistedRegistration: (registrationId: string, direction: "up" | "down") => { ok: boolean; message: string };
  addRegistrationNote: (registrationId: string, note: string, updatedByStaffId?: string) => { ok: boolean; message: string };
  createProgram: (input: {
    title: string;
    description?: string;
    category: Program["category"];
    programType?: Program["programType"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    guardianRequired?: boolean;
    memberRequired?: boolean;
    dropInAllowed?: boolean;
    defaultInstructorId?: string;
    pricingModel?: Program["pricingModel"];
    basePriceCents?: number;
    waitlistEnabled?: boolean;
    minimumAge?: number;
    maximumAge?: number;
    tags?: string[];
  }) => { ok: boolean; message: string; programId?: string };
  updateProgram: (input: {
    id: string;
    title: string;
    description?: string;
    category: Program["category"];
    programType?: Program["programType"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    guardianRequired?: boolean;
    memberRequired?: boolean;
    dropInAllowed?: boolean;
    defaultInstructorId?: string;
    pricingModel?: Program["pricingModel"];
    basePriceCents?: number;
    waitlistEnabled?: boolean;
    minimumAge?: number;
    maximumAge?: number;
    tags?: string[];
  }) => { ok: boolean; message: string };
  createProduct: (
    input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }
  ) => { ok: boolean; message: string; productId?: string };
  updateProduct: (
    productId: string,
    input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }
  ) => { ok: boolean; message: string };
  createProductCategory: (input: { label: string; colorToken?: ProductCategoryRecord["colorToken"] }) => { ok: boolean; message: string; categoryId?: string };
  updateProductCategory: (categoryId: string, updates: { label?: string; colorToken?: ProductCategoryRecord["colorToken"] }) => { ok: boolean; message: string };
  archiveProductCategory: (categoryId: string) => { ok: boolean; message: string };
  reorderProductCategory: (categoryId: string, direction: "up" | "down") => { ok: boolean; message: string };
  toggleProductActive: (productId: string) => { ok: boolean; message: string };
  reorderQuickButtonProduct: (productId: string, direction: "up" | "down") => { ok: boolean; message: string };
  adjustProductInventory: (input: {
    productId: string;
    variantId?: string;
    locationId: string;
    quantityDelta: number;
    action: InventoryAuditEntry["action"];
    note?: string;
    staffId?: string;
    staffName?: string;
  }) => { ok: boolean; message: string };
  transferProductInventory: (input: {
    productId: string;
    variantId?: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    note?: string;
    staffId?: string;
    staffName?: string;
  }) => { ok: boolean; message: string };
  updateCustomerAccessRecord: (accessId: string, updates: Partial<CustomerAccessRecord>) => { ok: boolean; message: string };
  addCustomerAccessRecord: (record: Omit<CustomerAccessRecord, "id">) => { ok: boolean; message: string; accessId?: string };
  updateCustomerWaiver: (
    customerId: string,
    updates: {
      status: Waiver["status"];
      signedAt?: string | null;
      expiresAt?: string | null;
      notes?: string | null;
      updatedByStaffId: string;
      updatedByStaffName?: string;
      signedByStaffId?: string | null;
      signedByCustomerId?: string | null;
      signedByRelationship?: Waiver["signedByRelationship"] | null;
    }
  ) => { ok: boolean; message: string };
  createWaiverTemplate: (input: {
    name: string;
    description?: string;
    expirationRuleType: WaiverExpirationRuleType;
    expirationDays?: number;
    effectiveDate: string;
    facilityAssignment?: string[];
    brandingAssignment?: string;
    blocks?: WaiverTemplateBlock[];
    createdByStaffId?: string;
  }) => { ok: boolean; message: string; templateId?: string; versionId?: string };
  createWaiverTemplateVersion: (input: {
    templateId: string;
    version: string;
    effectiveDate: string;
    blocks: WaiverTemplateBlock[];
    createdByStaffId?: string;
  }) => { ok: boolean; message: string; versionId?: string };
  updateWaiverTemplate: (templateId: string, updates: {
    name?: string;
    description?: string;
    effectiveDate?: string;
    expirationRuleType?: WaiverExpirationRuleType;
    expirationDays?: number;
    facilityAssignment?: string[];
    productAssignment?: string[];
    brandingAssignment?: string;
  }) => { ok: boolean; message: string };
  archiveWaiverTemplate: (templateId: string) => { ok: boolean; message: string };
  signWaiverForCustomer: (input: {
    customerId: string;
    templateId: string;
    typedName: string;
    signedByName?: string;
    signedByCustomerId?: string;
    signedByRelationship?: Waiver["signedByRelationship"];
    signedByStaffId?: string;
    updatedByStaffName?: string;
    notes?: string;
    source?: SignedWaiverRecord["source"];
    signingTokenId?: string;
    ipAddressPlaceholder?: string;
  }) => { ok: boolean; message: string; waiverId?: string };
  completePublicCheckout: (input: {
    purchaserCustomerId: string;
    billingCustomerId?: string;
    authorizedParticipantIds?: string[];
    items: Array<
      | { kind: "session"; sessionId: string; participantCustomerId: string }
      | { kind: "product"; productId: string; participantCustomerId: string; quantity?: number }
    >;
    paymentType: PaymentMethod;
    splitBreakdown?: Array<{ method: Exclude<PaymentMethod, "split">; amountCents: number }>;
    promoCode?: string;
    emailReceipt?: boolean;
  }) => {
    ok: boolean;
    message: string;
    transactionId?: string;
    receiptNumber?: string;
    confirmationNumber?: string;
    registrationIds?: string[];
    waitlistedIds?: string[];
  };
  createCommunication: (input: {
    channel: CommunicationRecord["channel"];
    status: CommunicationRecord["status"];
    recipientType: CommunicationRecord["recipientType"];
    recipientLabel: string;
    subject: string;
    message: string;
    customerId?: string;
    householdId?: string;
    sessionId?: string;
    programId?: string;
    membershipId?: string;
    waiverTemplateId?: string;
    staffUserId?: string;
    segmentKey?: string;
    templateType?: CommunicationRecord["templateType"];
    automatedTrigger?: CommunicationRecord["automatedTrigger"];
    source?: CommunicationSource;
    isTransactional?: boolean;
    recipients?: CommunicationRecipient[];
    relatedRecords?: CommunicationRecord["relatedRecords"];
    registrationId?: string;
    transactionId?: string;
    alertId?: string;
    scheduledFor?: string;
    deliveryStatus?: CommunicationRecord["deliveryStatus"];
    attachmentsPlaceholder?: string[];
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => { ok: boolean; message: string; communicationId?: string };
  updateCommunication: (
    communicationId: string,
    updates: Partial<Pick<CommunicationRecord, "status" | "scheduledFor" | "sentAt" | "failedAt" | "cancelledAt" | "archivedAt" | "deliveryStatus" | "readAt" | "subject" | "message" | "body">>
  ) => { ok: boolean; message: string };
  markCommunicationRead: (communicationId: string) => { ok: boolean; message: string };
  recordMembershipCardEvent: (input: {
    customerId: string;
    accessRecordId: string;
    action: MembershipCardEvent["action"];
    source: MembershipCardEvent["source"];
  }) => void;
  getWaiverStatusForCustomer: (customerId: string, templateId?: string) => "valid" | "missing" | "expired" | "expiring_soon" | "outdated_version";
  getSignedWaiverRecordsForCustomer: (customerId: string) => SignedWaiverRecord[];
  createOperationsAlert: (input: {
    title: string;
    description?: string;
    severity: OperationsAlertRecord["severity"];
    type: OperationsAlertRecord["type"];
    customerId?: string;
    membershipId?: string;
    waiverTemplateId?: string;
    sessionId?: string;
    programId?: string;
    productId?: string;
    transactionId?: string;
    staffUserId?: string;
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => { ok: boolean; message: string; alertId?: string };
  resolveOperationsAlert: (alertId: string) => { ok: boolean; message: string };
  archiveOperationsAlert: (alertId: string) => { ok: boolean; message: string };
  createOperationsTask: (input: {
    title: string;
    description?: string;
    dueDate?: string;
    assignedStaffId?: string;
    assignedStaffName?: string;
    status?: OperationsTaskRecord["status"];
    customerId?: string;
    membershipId?: string;
    waiverTemplateId?: string;
    sessionId?: string;
    productId?: string;
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => { ok: boolean; message: string; taskId?: string };
  updateOperationsTask: (
    taskId: string,
    updates: Partial<Pick<OperationsTaskRecord, "title" | "description" | "dueDate" | "assignedStaffId" | "assignedStaffName" | "status" | "completedAt">>
  ) => { ok: boolean; message: string };
  createRentableResource: (input: Omit<RentableResource, "id" | "createdAt" | "updatedAt">) => { ok: boolean; message: string; resourceId?: string };
  updateRentableResource: (resourceId: string, updates: Partial<Omit<RentableResource, "id" | "organizationId" | "createdAt">>) => { ok: boolean; message: string };
  createReservation: (input: Omit<ReservationRecord, "id" | "organizationId" | "createdAt" | "updatedAt" | "unavailableStartsAt" | "unavailableEndsAt">) => { ok: boolean; message: string; reservationId?: string };
  updateReservation: (reservationId: string, updates: Partial<Omit<ReservationRecord, "id" | "organizationId" | "createdAt">>) => { ok: boolean; message: string };
  checkInReservation: (reservationId: string, staffUserId: string, staffName?: string) => { ok: boolean; message: string };
  checkOutReservation: (reservationId: string, staffUserId: string, staffName?: string) => { ok: boolean; message: string };
  cancelReservation: (reservationId: string, staffUserId?: string, staffName?: string) => { ok: boolean; message: string };
  createMaintenanceBlock: (input: Omit<MaintenanceBlock, "id" | "organizationId" | "createdAt">) => { ok: boolean; message: string; blockId?: string };
  createHousehold: (input: {
    householdName: string;
    primaryContactCustomerId: string;
    billingCustomerId?: string;
    locationId: string;
    secondaryContactCustomerId?: string;
    householdStatus?: Household["householdStatus"];
    preferredCommunicationMethod?: Household["preferredCommunicationMethod"];
    email?: string;
    phone?: string;
    defaultAddress?: string;
    defaultEmergencyContactName?: string;
    defaultEmergencyContactPhone?: string;
    notes?: string;
  }) => { ok: boolean; message: string; householdId?: string };
  updateHousehold: (
    householdId: string,
    updates: Partial<
      Pick<
        Household,
        | "householdName"
        | "primaryContactCustomerId"
        | "secondaryContactCustomerId"
        | "billingCustomerId"
        | "householdStatus"
        | "preferredCommunicationMethod"
        | "email"
        | "phone"
        | "defaultAddress"
        | "defaultEmergencyContactName"
        | "defaultEmergencyContactPhone"
        | "notes"
      >
    >
  ) => { ok: boolean; message: string };
  updateHouseholdPhoto: (
    householdId: string,
    input: {
      profilePhotoUrl?: string;
      updatedByStaffId: string;
      updatedByStaffName?: string;
    }
  ) => { ok: boolean; message: string };
  addHouseholdMember: (input: {
    householdId: string;
    customerId: string;
    memberType: "adult" | "child";
    role: HouseholdMemberRole;
    relationship: HouseholdRelationship;
    canCheckInOthers: boolean;
    canPurchaseForOthers: boolean;
    canSignWaivers: boolean;
    emergencyContactPriority?: number;
  }) => { ok: boolean; message: string };
  removeHouseholdMember: (householdId: string, customerId: string) => { ok: boolean; message: string };
  updateHouseholdMember: (
    householdId: string,
    customerId: string,
    updates: Partial<Pick<HouseholdMember, "memberType" | "role" | "relationship" | "canCheckInOthers" | "canPurchaseForOthers" | "canSignWaivers" | "emergencyContactPriority">>
  ) => { ok: boolean; message: string };
  familyCheckIn: (input: {
    actingCustomerId: string;
    memberIds: string[];
    staffUserId: string;
    staffName?: string;
  }) => { ok: boolean; message: string; successes: string[]; failures: string[] };
  toggleCheckIn: (customerId: string, staffUserId: string) => void;
  resetMockState: () => void;
}

const CustomerStateContext = createContext<CustomerStateContextValue | null>(null);

export function CustomerStateProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsState();
  const pathname = usePathname() ?? "";
  const fallbackSlug = parseOrgSlugFromPathname(pathname) ?? "summit";
  const [orgSlug, setOrgSlug] = useState(fallbackSlug);
  useEffect(() => {
    const cookieSlug = getCurrentOrgSlugClient(fallbackSlug);
    if (cookieSlug !== orgSlug) setOrgSlug(cookieSlug);
  }, [fallbackSlug, orgSlug]);
  const tenant = useMemo(() => resolveTenant(orgSlug), [orgSlug]);
  const activeOrgId = tenant?.organizationId ?? "org_summit";
  const activeLocationId = tenant?.currentLocationId ?? "loc_001";
  const seededCustomersForOrg = useMemo(
    () => seedCustomers.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededProductsForOrg = useMemo(
    () => seedPosProducts.filter((entry) => entry.organizationId === activeOrgId).map(normalizeProductForState),
    [activeOrgId]
  );
  const seededProductCategoriesForOrg = useMemo(
    () => buildSystemProductCategories(activeOrgId),
    [activeOrgId]
  );
  const seededProgramsForOrg = useMemo(
    () => seedPrograms.filter((entry) => entry.organizationId === activeOrgId).map(normalizeProgramForState),
    [activeOrgId]
  );
  const seededSessionsForOrg = useMemo(
    () => seedSessions.filter((entry) => seededProgramsForOrg.some((program) => program.id === entry.programId)),
    [seededProgramsForOrg]
  );
  const seededRegistrationsForOrg = useMemo(
    () => seedRegistrations.filter((entry) => seededSessionsForOrg.some((session) => session.id === entry.sessionId)),
    [seededSessionsForOrg]
  );
  const seededMembershipsForOrg = useMemo(
    () => seedMemberships.filter((entry) => seededCustomersForOrg.some((customer) => customer.id === entry.customerId)),
    [seededCustomersForOrg]
  );
  const seededBillingAccountsForOrg = useMemo(
    () => seedBillingAccounts.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededBillingCreditEntriesForOrg = useMemo(
    () => seedBillingCreditEntries.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededBillingInvoicesForOrg = useMemo(
    () => seedBillingInvoices.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededBillingStatementsForOrg = useMemo(
    () => seedBillingStatements.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededMembershipRenewalsForOrg = useMemo(
    () => seedMembershipRenewals.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededBillingRefundsForOrg = useMemo(
    () => seedBillingRefunds.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededPunchPassesForOrg = useMemo(
    () => seedPunchPasses.filter((entry) => seededCustomersForOrg.some((customer) => customer.id === entry.customerId)),
    [seededCustomersForOrg]
  );
  const seededTransactionsForOrg = useMemo(
    () => seedPosTransactions.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededAccessRecordsForOrg = useMemo(
    () => seedAccessRecords.filter((entry) => seededCustomersForOrg.some((customer) => customer.id === entry.customerId)),
    [seededCustomersForOrg]
  );
  const seededWaiversForOrg = useMemo(
    () => seedWaivers.filter((entry) => seededCustomersForOrg.some((customer) => customer.id === entry.customerId)),
    [seededCustomersForOrg]
  );
  const seededWaiverTemplatesForOrg = useMemo(
    () => seedWaiverTemplates.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededWaiverTemplateVersionsForOrg = useMemo(
    () =>
      seedWaiverTemplateVersions.filter((entry) =>
        seededWaiverTemplatesForOrg.some((template) => template.id === entry.templateId)
      ),
    [seededWaiverTemplatesForOrg]
  );
  const seededSignedWaiverRecordsForOrg = useMemo(
    () => seedSignedWaiverRecords.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const orgLocationIds = useMemo(
    () => seedLocations.filter((entry) => entry.organizationId === activeOrgId).map((entry) => entry.id),
    [activeOrgId]
  );
  const seededHouseholdsForOrg = useMemo(
    () => seedHouseholds.filter((entry) => orgLocationIds.includes(entry.locationId)),
    [orgLocationIds]
  );
  const seededHouseholdMembersForOrg = useMemo(
    () => seedHouseholdMembers.filter((entry) => seededHouseholdsForOrg.some((household) => household.id === entry.householdId)),
    [seededHouseholdsForOrg]
  );
  const seededRentableResourcesForOrg = useMemo(
    () => seedRentableResources.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededReservationsForOrg = useMemo(
    () => seedReservations.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const seededMaintenanceBlocksForOrg = useMemo(
    () => seedMaintenanceBlocks.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );
  const communicationTemplates = useMemo(
    () => getDefaultCommunicationTemplates(activeOrgId),
    [activeOrgId]
  );
  const seededOperationsTasksForOrg = useMemo<OperationsTaskRecord[]>(
    () => [
      {
        id: `task_${activeOrgId}_renewal`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        title: "Call customer about renewal",
        description: "Follow up with expiring memberships before the end of the week.",
        dueDate: BASE_DATE,
        assignedStaffId: "staff_002",
        assignedStaffName: "Maya Lopez",
        status: "open",
        customerId: seededCustomersForOrg[0]?.id,
        createdAt: `${BASE_DATE}T08:00:00Z`,
        createdByStaffId: "staff_001",
        createdByStaffName: "Taylor Nguyen"
      },
      {
        id: `task_${activeOrgId}_restock`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        title: "Restock retail shelf",
        description: "Move replacement stock to the front-desk retail display.",
        dueDate: BASE_DATE,
        assignedStaffId: "staff_003",
        assignedStaffName: "Sam Carter",
        status: "in_progress",
        productId: seededProductsForOrg.find((product) => product.trackInventory)?.id,
        createdAt: `${BASE_DATE}T09:00:00Z`,
        createdByStaffId: "staff_002",
        createdByStaffName: "Maya Lopez"
      },
      {
        id: `task_${activeOrgId}_instructor`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        title: "Assign instructor",
        description: "Review upcoming sessions missing staff coverage.",
        dueDate: addDays(BASE_DATE, 1),
        assignedStaffId: "staff_002",
        assignedStaffName: "Maya Lopez",
        status: "open",
        sessionId: seededSessionsForOrg.find((session) => !session.instructorName)?.id,
        createdAt: `${BASE_DATE}T10:30:00Z`,
        createdByStaffId: "staff_001",
        createdByStaffName: "Taylor Nguyen"
      }
    ],
    [activeLocationId, activeOrgId, seededCustomersForOrg, seededProductsForOrg, seededSessionsForOrg]
  );

  const seededManualCommunicationsForOrg = useMemo<CommunicationRecord[]>(
    () => [
      {
        id: `comm_${activeOrgId}_registration`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        channel: "system_notification",
        status: "sent",
        recipientType: "customer",
        recipientLabel: seededCustomersForOrg[0] ? `${seededCustomersForOrg[0].firstName} ${seededCustomersForOrg[0].lastName}` : "Maya Patel",
        customerId: seededCustomersForOrg[0]?.id,
        subject: "Registration confirmation",
        message: "Your registration has been confirmed.",
        templateType: "registration_confirmation",
        automatedTrigger: "program_registration",
        sentAt: "2026-05-21T10:00:00Z",
        createdAt: "2026-05-21T10:00:00Z",
        createdByStaffName: "System",
        deliveryStatus: "unread"
      },
      {
        id: `comm_${activeOrgId}_draft`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        channel: "email",
        status: "draft",
        recipientType: "saved_segment",
        recipientLabel: "New Members This Month",
        subject: "Welcome to Cairn",
        message: "Draft onboarding message for newly activated members.",
        segmentKey: "new_members_this_month",
        templateType: "general_announcement",
        createdAt: `${BASE_DATE}T07:30:00Z`,
        createdByStaffId: "staff_001",
        createdByStaffName: "Taylor Nguyen"
      },
      {
        id: `comm_${activeOrgId}_scheduled`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        channel: "sms",
        status: "scheduled",
        recipientType: "household",
        recipientLabel: seededHouseholdsForOrg[0]?.householdName ?? "Rivera Household",
        householdId: seededHouseholdsForOrg[0]?.id,
        subject: "Waiver reminder",
        message: "Please review and sign the updated waiver before your next visit.",
        templateType: "waiver_reminder",
        automatedTrigger: "waiver_expiring",
        scheduledFor: `${addDays(BASE_DATE, 1)}T14:00:00Z`,
        createdAt: `${BASE_DATE}T09:15:00Z`,
        createdByStaffId: "staff_002",
        createdByStaffName: "Maya Lopez"
      },
      {
        id: `comm_${activeOrgId}_failed`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        channel: "email",
        status: "failed",
        recipientType: "customer",
        recipientLabel: seededCustomersForOrg[0] ? `${seededCustomersForOrg[0].firstName} ${seededCustomersForOrg[0].lastName}` : "Maya Patel",
        customerId: seededCustomersForOrg[0]?.id,
        subject: "Payment failure follow-up",
        message: "We could not process your renewal. Please update your payment method.",
        templateType: "membership_renewal",
        automatedTrigger: "payment_failure",
        sentAt: `${BASE_DATE}T08:45:00Z`,
        createdAt: `${BASE_DATE}T08:40:00Z`,
        createdByStaffId: "staff_001",
        createdByStaffName: "Taylor Nguyen",
        deliveryStatus: "failed"
      }
    ],
    [activeLocationId, activeOrgId, seededCustomersForOrg, seededHouseholdsForOrg]
  );

  const storageKeys = useMemo(() => ({
    customers: buildScopedMockKey(activeOrgId, activeLocationId, "customers"),
    billingAccounts: buildScopedMockKey(activeOrgId, activeLocationId, "billingAccounts"),
    billingCredits: buildScopedMockKey(activeOrgId, activeLocationId, "billingCredits"),
    billingInvoices: buildScopedMockKey(activeOrgId, activeLocationId, "billingInvoices"),
    billingStatements: buildScopedMockKey(activeOrgId, activeLocationId, "billingStatements"),
    membershipRenewals: buildScopedMockKey(activeOrgId, activeLocationId, "membershipRenewals"),
    billingRefunds: buildScopedMockKey(activeOrgId, activeLocationId, "billingRefunds"),
    passes: buildScopedMockKey(activeOrgId, activeLocationId, "punchPasses"),
    checkins: buildScopedMockKey(activeOrgId, activeLocationId, "checkIns"),
    memberships: buildScopedMockKey(activeOrgId, activeLocationId, "memberships"),
    transactions: buildScopedMockKey(activeOrgId, activeLocationId, "transactions"),
    products: buildScopedMockKey(activeOrgId, activeLocationId, "products"),
    inventoryAudit: buildScopedMockKey(activeOrgId, activeLocationId, "inventoryAudit"),
    productCategories: buildScopedMockKey(activeOrgId, activeLocationId, "productCategories"),
    programs: buildScopedMockKey(activeOrgId, activeLocationId, "programs"),
    sessions: buildScopedMockKey(activeOrgId, activeLocationId, "sessions"),
    registrations: buildScopedMockKey(activeOrgId, activeLocationId, "registrations"),
    registrationActivity: buildScopedMockKey(activeOrgId, activeLocationId, "registrationActivity"),
    accessRecords: buildScopedMockKey(activeOrgId, activeLocationId, "accessRecords"),
    waivers: buildScopedMockKey(activeOrgId, activeLocationId, "waivers"),
    signedWaiverRecords: buildScopedMockKey(activeOrgId, activeLocationId, "signedWaiverRecords"),
    waiverTemplates: buildScopedMockKey(activeOrgId, activeLocationId, "waiverTemplates"),
    waiverTemplateVersions: buildScopedMockKey(activeOrgId, activeLocationId, "waiverTemplateVersions"),
    households: buildScopedMockKey(activeOrgId, activeLocationId, "households"),
    householdMembers: buildScopedMockKey(activeOrgId, activeLocationId, "householdMembers"),
    rentableResources: buildScopedMockKey(activeOrgId, activeLocationId, "rentableResources"),
    reservations: buildScopedMockKey(activeOrgId, activeLocationId, "reservations"),
    maintenanceBlocks: buildScopedMockKey(activeOrgId, activeLocationId, "maintenanceBlocks"),
    communications: buildScopedMockKey(activeOrgId, activeLocationId, "communications"),
    membershipCardEvents: buildScopedMockKey(activeOrgId, activeLocationId, "membershipCardEvents"),
    operationsAlertOverrides: buildScopedMockKey(activeOrgId, activeLocationId, "operationsAlertOverrides"),
    operationsManualAlerts: buildScopedMockKey(activeOrgId, activeLocationId, "operationsManualAlerts"),
    operationsTasks: buildScopedMockKey(activeOrgId, activeLocationId, "operationsTasks")
  }), [activeOrgId, activeLocationId]);

  const seededCheckIns = useMemo(
    () =>
      seedCheckInRecords
        .filter((entry) => entry.organizationId === activeOrgId)
        .map((record) => ({
          ...record,
          checkedInByStaffId: record.checkedInByStaffId ?? record.staffUserId ?? "",
          checkedInByStaffName: record.checkedInByStaffName
        })),
    [activeOrgId]
  );

  const [customers, setCustomers] = useState<Customer[]>(normalizeCustomersForState(seededCustomersForOrg, seededCustomersForOrg));
  const [billingAccounts, setBillingAccounts] = useState<BillingAccount[]>(seededBillingAccountsForOrg);
  const [billingCreditEntries, setBillingCreditEntries] = useState<BillingCreditEntry[]>(seededBillingCreditEntriesForOrg);
  const [billingInvoices, setBillingInvoices] = useState<BillingInvoice[]>(seededBillingInvoicesForOrg);
  const [billingStatements, setBillingStatements] = useState<BillingStatement[]>(seededBillingStatementsForOrg);
  const [membershipRenewals, setMembershipRenewals] = useState<MembershipRenewalRecord[]>(seededMembershipRenewalsForOrg);
  const [billingRefunds, setBillingRefunds] = useState<BillingRefundRecord[]>(seededBillingRefundsForOrg);
  const [memberships, setMemberships] = useState<Membership[]>(seededMembershipsForOrg);
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>(seededPunchPassesForOrg);
  const [transactions, setTransactions] = useState<PosTransaction[]>(
    normalizeTransactions(seededTransactionsForOrg as Partial<PosTransaction>[], seededProductsForOrg)
  );
  const [accessProducts, setAccessProducts] = useState<PosProduct[]>(seededProductsForOrg);
  const [inventoryAuditEntries, setInventoryAuditEntries] = useState<InventoryAuditEntry[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategoryRecord[]>(seededProductCategoriesForOrg);
  const [programs, setPrograms] = useState<Program[]>(seededProgramsForOrg);
  const [sessions, setSessions] = useState<ClassCampSession[]>(
    seededSessionsForOrg.map((session) => normalizeSessionForState(session, seededProgramsForOrg))
  );
  const [registrations, setRegistrations] = useState<Registration[]>(seededRegistrationsForOrg);
  const [registrationActivity, setRegistrationActivity] = useState<RegistrationActivityEvent[]>([]);
  const [customerAccessRecords, setCustomerAccessRecords] = useState<CustomerAccessRecord[]>(seededAccessRecordsForOrg);
  const [waivers, setWaivers] = useState<Waiver[]>(seededWaiversForOrg);
  const [signedWaiverRecords, setSignedWaiverRecords] = useState<SignedWaiverRecord[]>(seededSignedWaiverRecordsForOrg);
  const [waiverTemplates, setWaiverTemplates] = useState<WaiverTemplate[]>(seededWaiverTemplatesForOrg);
  const [waiverTemplateVersions, setWaiverTemplateVersions] = useState<WaiverTemplateVersion[]>(seededWaiverTemplateVersionsForOrg);
  const [households, setHouseholds] = useState<Household[]>(seededHouseholdsForOrg);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>(
    seededHouseholdMembersForOrg.map(normalizeHouseholdMemberForState)
  );
  const [rentableResources, setRentableResources] = useState<RentableResource[]>(seededRentableResourcesForOrg);
  const [reservations, setReservations] = useState<ReservationRecord[]>(seededReservationsForOrg);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>(seededMaintenanceBlocksForOrg);
  const [manualCommunications, setManualCommunications] = useState<CommunicationRecord[]>(seededManualCommunicationsForOrg);
  const [membershipCardEvents, setMembershipCardEvents] = useState<MembershipCardEvent[]>([]);
  const [operationsAlertOverrides, setOperationsAlertOverrides] = useState<
    Array<{ id: string; status: OperationsAlertStatus; resolvedAt?: string; archivedAt?: string }>
  >([]);
  const [operationsManualAlerts, setOperationsManualAlerts] = useState<OperationsAlertRecord[]>([]);
  const [operationsTasks, setOperationsTasks] = useState<OperationsTaskRecord[]>(seededOperationsTasksForOrg);
  const [checkInLogRecords, setCheckInLogRecords] = useState<CheckInLogRecord[]>(seededCheckIns);
  const [hydrated, setHydrated] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState<string>(BASE_DATE);

  const todayLogRecords = useMemo(
    () =>
      checkInLogRecords
        .filter((record) => record.locationId === activeLocationId && record.checkInTime.startsWith(activeDateKey))
        .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime)),
    [checkInLogRecords, activeDateKey]
  );

  const occupancyCount = useMemo(
    () => todayLogRecords.filter((record) => record.status === "checked-in" && !record.checkOutTime).length,
    [todayLogRecords]
  );

  const totalCheckIns = todayLogRecords.length;
  const checkedOutCount = todayLogRecords.filter((record) => record.status === "checked-out").length;
  const isActiveDateToday = activeDateKey === BASE_DATE;

  const evaluateCustomerEntry = (customerId: string) => {
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) {
      return {
        outcome: "denied",
        allowed: false,
        headline: "Access Denied",
        reasons: ["Customer not found."],
        warnings: [],
        accessSummary: []
      } as AccessDecision;
    }
    const waiver = customer.waiverId ? waivers.find((entry) => entry.id === customer.waiverId) : undefined;
    const generalWaiverStatus = getWaiverStatusForCustomer(customer.id, "wtpl_general");
    const effectiveWaiver =
      waiver && (generalWaiverStatus === "outdated_version" || generalWaiverStatus === "expired" || generalWaiverStatus === "missing")
        ? { ...waiver, status: "expired" as const }
        : waiver;
    return evaluateCustomerAccess({
      customer,
      waiver: effectiveWaiver,
      locationId: activeLocationId,
      dayKey: activeDateKey,
      accessRecords: customerAccessRecords,
      registrations,
      sessions,
      programs,
      allowSessionRegistrationAccess: true
    });
  };

  useEffect(() => {
    const products = (loadMockState(storageKeys.products, seededProductsForOrg) as PosProduct[]).map(normalizeProductForState);
    const categories = loadMockState(storageKeys.productCategories, seededProductCategoriesForOrg) as ProductCategoryRecord[];
    const inventoryAudit = loadMockState(storageKeys.inventoryAudit, []) as InventoryAuditEntry[];
    const storedPrograms = (loadMockState(storageKeys.programs, seededProgramsForOrg) as Program[]).map(normalizeProgramForState);
    const storedCheckIns = loadMockState(storageKeys.checkins, seededCheckIns).map((record) => ({
      ...record,
      checkedInByStaffId: record.checkedInByStaffId ?? record.staffUserId ?? "",
      checkedInByStaffName: record.checkedInByStaffName
    }));

    const loadedCustomers = loadMockState(storageKeys.customers, seededCustomersForOrg) as Customer[];
    setCustomers(normalizeCustomersForState(mergeSeedCustomers(loadedCustomers, seededCustomersForOrg), seededCustomersForOrg));
    setBillingAccounts(loadMockState(storageKeys.billingAccounts, seededBillingAccountsForOrg) as BillingAccount[]);
    setBillingCreditEntries(loadMockState(storageKeys.billingCredits, seededBillingCreditEntriesForOrg) as BillingCreditEntry[]);
    setBillingInvoices(loadMockState(storageKeys.billingInvoices, seededBillingInvoicesForOrg) as BillingInvoice[]);
    setBillingStatements(loadMockState(storageKeys.billingStatements, seededBillingStatementsForOrg) as BillingStatement[]);
    setMembershipRenewals(loadMockState(storageKeys.membershipRenewals, seededMembershipRenewalsForOrg) as MembershipRenewalRecord[]);
    setBillingRefunds(loadMockState(storageKeys.billingRefunds, seededBillingRefundsForOrg) as BillingRefundRecord[]);
    setMemberships(loadMockState(storageKeys.memberships, seededMembershipsForOrg));
    setPunchPasses(loadMockState(storageKeys.passes, seededPunchPassesForOrg));
    setAccessProducts(products);
    setInventoryAuditEntries(inventoryAudit);
    setProductCategories(
      [...categories]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((entry, index) => ({ ...entry, displayOrder: index + 1 }))
    );
    setPrograms(storedPrograms);
    setSessions(
      (loadMockState(storageKeys.sessions, seededSessionsForOrg) as ClassCampSession[]).map((session) =>
        normalizeSessionForState(session, storedPrograms)
      )
    );
    setRegistrations(loadMockState(storageKeys.registrations, seededRegistrationsForOrg));
    setRegistrationActivity(loadMockState(storageKeys.registrationActivity, []) as RegistrationActivityEvent[]);
    setCustomerAccessRecords(loadMockState(storageKeys.accessRecords, seededAccessRecordsForOrg) as CustomerAccessRecord[]);
    setWaivers(loadMockState(storageKeys.waivers, seededWaiversForOrg) as Waiver[]);
    setSignedWaiverRecords(
      loadMockState(storageKeys.signedWaiverRecords, seededSignedWaiverRecordsForOrg) as SignedWaiverRecord[]
    );
    setWaiverTemplates(loadMockState(storageKeys.waiverTemplates, seededWaiverTemplatesForOrg) as WaiverTemplate[]);
    setWaiverTemplateVersions(
      loadMockState(storageKeys.waiverTemplateVersions, seededWaiverTemplateVersionsForOrg) as WaiverTemplateVersion[]
    );
    setHouseholds(loadMockState(storageKeys.households, seededHouseholdsForOrg) as Household[]);
    setHouseholdMembers(
      (loadMockState(storageKeys.householdMembers, seededHouseholdMembersForOrg) as HouseholdMember[]).map(
        normalizeHouseholdMemberForState
      )
    );
    setRentableResources(loadMockState(storageKeys.rentableResources, seededRentableResourcesForOrg) as RentableResource[]);
    setReservations(loadMockState(storageKeys.reservations, seededReservationsForOrg) as ReservationRecord[]);
    setMaintenanceBlocks(loadMockState(storageKeys.maintenanceBlocks, seededMaintenanceBlocksForOrg) as MaintenanceBlock[]);
    setManualCommunications(loadMockState(storageKeys.communications, seededManualCommunicationsForOrg) as CommunicationRecord[]);
    setMembershipCardEvents(loadMockState(storageKeys.membershipCardEvents, []) as MembershipCardEvent[]);
    setOperationsAlertOverrides(
      loadMockState(storageKeys.operationsAlertOverrides, []) as Array<{
        id: string;
        status: OperationsAlertStatus;
        resolvedAt?: string;
        archivedAt?: string;
      }>
    );
    setOperationsManualAlerts(
      loadMockState(storageKeys.operationsManualAlerts, []) as OperationsAlertRecord[]
    );
    setOperationsTasks(loadMockState(storageKeys.operationsTasks, seededOperationsTasksForOrg) as OperationsTaskRecord[]);
    setTransactions(
      normalizeTransactions(loadMockState(storageKeys.transactions, seededTransactionsForOrg) as Partial<PosTransaction>[], products)
    );
    setCheckInLogRecords(storedCheckIns);
    setHydrated(true);
  }, [
    activeOrgId,
    activeLocationId,
    seededBillingAccountsForOrg,
    seededBillingCreditEntriesForOrg,
    seededBillingInvoicesForOrg,
    seededBillingRefundsForOrg,
    seededBillingStatementsForOrg,
    seededManualCommunicationsForOrg,
    seededMaintenanceBlocksForOrg,
    seededMembershipRenewalsForOrg,
    seededOperationsTasksForOrg
    ,
    seededRentableResourcesForOrg,
    seededReservationsForOrg
  ]);

  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.customers, customers);
  }, [customers, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.billingAccounts, billingAccounts);
  }, [billingAccounts, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.billingCredits, billingCreditEntries);
  }, [billingCreditEntries, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.billingInvoices, billingInvoices);
  }, [billingInvoices, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.billingStatements, billingStatements);
  }, [billingStatements, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.membershipRenewals, membershipRenewals);
  }, [membershipRenewals, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.billingRefunds, billingRefunds);
  }, [billingRefunds, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.passes, punchPasses);
  }, [punchPasses, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.memberships, memberships);
  }, [memberships, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.transactions, transactions);
  }, [transactions, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.products, accessProducts);
  }, [accessProducts, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.inventoryAudit, inventoryAuditEntries);
  }, [inventoryAuditEntries, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.productCategories, productCategories);
  }, [productCategories, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.programs, programs);
  }, [programs, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.sessions, sessions);
  }, [sessions, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.registrations, registrations);
  }, [registrations, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.registrationActivity, registrationActivity);
  }, [registrationActivity, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.accessRecords, customerAccessRecords);
  }, [customerAccessRecords, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.waivers, waivers);
  }, [waivers, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.signedWaiverRecords, signedWaiverRecords);
  }, [signedWaiverRecords, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.waiverTemplates, waiverTemplates);
  }, [waiverTemplates, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.waiverTemplateVersions, waiverTemplateVersions);
  }, [waiverTemplateVersions, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.households, households);
  }, [households, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.householdMembers, householdMembers);
  }, [householdMembers, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.rentableResources, rentableResources);
  }, [rentableResources, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.reservations, reservations);
  }, [reservations, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.maintenanceBlocks, maintenanceBlocks);
  }, [maintenanceBlocks, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.communications, manualCommunications);
  }, [manualCommunications, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.membershipCardEvents, membershipCardEvents);
  }, [membershipCardEvents, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.operationsAlertOverrides, operationsAlertOverrides);
  }, [operationsAlertOverrides, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.operationsManualAlerts, operationsManualAlerts);
  }, [operationsManualAlerts, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.operationsTasks, operationsTasks);
  }, [operationsTasks, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.checkins, checkInLogRecords);
  }, [checkInLogRecords, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (settings.operations.open24x7 || !settings.operations.autoCheckoutAtCloseout) return;
    if (!settings.operations.defaultCloseoutTime) return;

    const closeoutIso = `${activeDateKey}T${settings.operations.defaultCloseoutTime}:00Z`;
    if (new Date().toISOString() < closeoutIso) return;

    let didUpdate = false;
    setCheckInLogRecords((prev) =>
      prev.map((record) => {
        if (
          record.locationId !== activeLocationId ||
          !record.checkInTime.startsWith(activeDateKey) ||
          record.status !== "checked-in" ||
          record.checkOutTime
        ) {
          return record;
        }
        didUpdate = true;
        return {
          ...record,
          status: "checked-out",
          checkOutTime: closeoutIso,
          checkInSource: "automatic_closeout",
          checkedOutByStaffId: "system_closeout",
          checkedOutByStaffName: "Automatic closeout"
        };
      })
    );
    if (!didUpdate) return;
    setCustomers((prev) =>
      prev.map((entry) => (entry.checkInStatus === "in" ? { ...entry, checkInStatus: "out" } : entry))
    );
  }, [
    activeDateKey,
    activeLocationId,
    hydrated,
    settings.operations.autoCheckoutAtCloseout,
    settings.operations.defaultCloseoutTime,
    settings.operations.open24x7
  ]);

  const communications = useMemo<CommunicationRecord[]>(() => {
    const generated: CommunicationRecord[] = [];
    const todayMonthDay = activeDateKey.slice(5);

    memberships.forEach((membership) => {
      const customer = customers.find((entry) => entry.id === membership.customerId);
      if (!customer || !membership.expirationDate) return;
      const daysUntil = diffDays(activeDateKey, membership.expirationDate);
      if (daysUntil === 30 || daysUntil === 7) {
        generated.push({
          id: `comm_membership_expiring_${daysUntil}_${membership.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          channel: "email",
          status: "scheduled",
          recipientType: "customer",
          recipientLabel: `${customer.firstName} ${customer.lastName}`,
          subject: daysUntil === 7 ? "Membership renewal due soon" : "Membership renewal reminder",
          message: `${membership.planName} renews on ${membership.expirationDate}.`,
          body: `${membership.planName} renews on ${membership.expirationDate}.`,
          customerId: customer.id,
          membershipId: membership.id,
          templateType: "membership_renewal",
          automatedTrigger: daysUntil === 7 ? "membership_expiring_7" : "membership_expiring_30",
          source: "membership_reminder",
          isTransactional: true,
          recipients: [{
            id: customer.id,
            type: "customer",
            label: `${customer.firstName} ${customer.lastName}`,
            customerId: customer.id,
            email: customer.email,
            phone: customer.phone
          }],
          sender: { kind: "system", name: "System" },
          relatedRecords: [
            { kind: "customer", id: customer.id, label: `${customer.firstName} ${customer.lastName}` },
            { kind: "membership", id: membership.id, label: membership.planName }
          ],
          scheduledFor: `${activeDateKey}T12:00:00Z`,
          createdAt: `${activeDateKey}T07:00:00Z`,
          createdByStaffName: "System"
        });
      }
    });

    waivers.forEach((waiver) => {
      const customer = customers.find((entry) => entry.id === waiver.customerId);
      if (!customer) return;
      const daysUntil = diffDays(activeDateKey, waiver.expiresAt?.slice(0, 10));
      if (daysUntil !== null && daysUntil >= 0 && daysUntil <= 14) {
        const templateName =
          waiverTemplates.find((entry) => entry.id === waiver.templateId)?.name ??
          "Your waiver";
        generated.push({
          id: `comm_waiver_expiring_${waiver.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          channel: "sms",
          status: "scheduled",
          recipientType: "customer",
          recipientLabel: `${customer.firstName} ${customer.lastName}`,
          subject: "Waiver expiring soon",
          message: `${templateName} expires soon. Please review and sign the latest version.`,
          body: `${templateName} expires soon. Please review and sign the latest version.`,
          customerId: customer.id,
          waiverTemplateId: waiver.templateId,
          templateType: "waiver_reminder",
          automatedTrigger: "waiver_expiring",
          source: "waiver_reminder",
          isTransactional: true,
          recipients: [{
            id: customer.id,
            type: "customer",
            label: `${customer.firstName} ${customer.lastName}`,
            customerId: customer.id,
            email: customer.email,
            phone: customer.phone
          }],
          sender: { kind: "system", name: "System" },
          relatedRecords: [
            { kind: "customer", id: customer.id, label: `${customer.firstName} ${customer.lastName}` },
            { kind: "waiver", id: waiver.templateId ?? waiver.id, label: templateName }
          ],
          scheduledFor: `${activeDateKey}T15:00:00Z`,
          createdAt: `${activeDateKey}T07:05:00Z`,
          createdByStaffName: "System"
        });
      }
    });

    customers.forEach((customer) => {
      const waiverStatus = getWaiverStatusForCustomer(customer.id);
      if (waiverStatus !== "missing" && waiverStatus !== "outdated_version") return;
      generated.push({
        id: `comm_waiver_missing_${customer.id}`,
        organizationId: activeOrgId,
        locationId: customer.locationId,
        channel: "email",
        status: "scheduled",
        recipientType: "customer",
        recipientLabel: `${customer.firstName} ${customer.lastName}`,
        subject: "Required waiver needed",
        message: "A required waiver is still missing before your next visit.",
        body: "A required waiver is still missing before your next visit.",
        customerId: customer.id,
        templateType: "waiver_missing",
        automatedTrigger: "waiver_missing",
        source: "waiver_reminder",
        isTransactional: true,
        recipients: [{
          id: customer.id,
          type: "customer",
          label: `${customer.firstName} ${customer.lastName}`,
          customerId: customer.id,
          email: customer.email,
          phone: customer.phone
        }],
        sender: { kind: "system", name: "System" },
        relatedRecords: [{ kind: "customer", id: customer.id, label: `${customer.firstName} ${customer.lastName}` }],
        scheduledFor: `${activeDateKey}T16:00:00Z`,
        createdAt: `${activeDateKey}T07:10:00Z`,
        createdByStaffName: "System"
      });
    });

    registrations.forEach((registration) => {
      const customer = customers.find((entry) => entry.id === registration.customerId);
      const session = sessions.find((entry) => entry.id === registration.sessionId);
      const program = programs.find((entry) => entry.id === session?.programId);
      if (!customer || !session || !program) return;
      generated.push({
        id: `comm_registration_${registration.id}`,
        organizationId: activeOrgId,
        locationId: session.locationId,
        channel: "email",
        status: "sent",
        recipientType: "customer",
        recipientLabel: `${customer.firstName} ${customer.lastName}`,
        subject: registration.status === "waitlisted" ? "Waitlist confirmation" : "Registration confirmation",
        message:
          registration.status === "waitlisted"
            ? `You joined the waitlist for ${program.title}.`
            : `Your registration for ${program.title} is confirmed.`,
        body:
          registration.status === "waitlisted"
            ? `You joined the waitlist for ${program.title}.`
            : `Your registration for ${program.title} is confirmed.`,
        customerId: customer.id,
        sessionId: session.id,
        programId: program.id,
        registrationId: registration.id,
        templateType: registration.status === "waitlisted" ? "waitlist_confirmation" : "registration_confirmation",
        automatedTrigger: "program_registration",
        source: registration.status === "waitlisted" ? "waitlist_confirmation" : "registration_confirmation",
        isTransactional: true,
        recipients: [{
          id: customer.id,
          type: "customer",
          label: `${customer.firstName} ${customer.lastName}`,
          customerId: customer.id,
          email: customer.email,
          phone: customer.phone
        }],
        sender: {
          kind: registration.registeredByStaffName ? "staff" : "system",
          name: registration.registeredByStaffName ?? "System",
          staffUserId: registration.registeredByStaffId
        },
        relatedRecords: [
          { kind: "customer", id: customer.id, label: `${customer.firstName} ${customer.lastName}` },
          { kind: "program", id: program.id, label: program.title },
          { kind: "session", id: session.id, label: session.title?.trim() || program.title },
          { kind: "registration", id: registration.id, label: registration.status }
        ],
        sentAt: registration.registeredAt ?? `${BASE_DATE}T09:00:00Z`,
        createdAt: registration.registeredAt ?? `${BASE_DATE}T09:00:00Z`,
        createdByStaffName: registration.registeredByStaffName ?? "System",
        deliveryStatus: "delivered"
      });
    });

    customers.forEach((customer) => {
      if (customer.dateOfBirth?.slice(5) !== todayMonthDay) return;
      generated.push({
        id: `comm_birthday_${customer.id}`,
        organizationId: activeOrgId,
        locationId: customer.locationId,
        channel: "email",
        status: "scheduled",
        recipientType: "customer",
        recipientLabel: `${customer.firstName} ${customer.lastName}`,
        subject: "Happy Birthday from Cairn",
        message: "Birthday greeting scheduled for this morning.",
        body: "Birthday greeting scheduled for this morning.",
        customerId: customer.id,
        templateType: "birthday_greeting",
        automatedTrigger: "birthday",
        source: "birthday",
        isTransactional: false,
        recipients: [{
          id: customer.id,
          type: "customer",
          label: `${customer.firstName} ${customer.lastName}`,
          customerId: customer.id,
          email: customer.email,
          phone: customer.phone
        }],
        sender: { kind: "system", name: "System" },
        relatedRecords: [{ kind: "customer", id: customer.id, label: `${customer.firstName} ${customer.lastName}` }],
        scheduledFor: `${activeDateKey}T11:00:00Z`,
        createdAt: `${activeDateKey}T06:30:00Z`,
        createdByStaffName: "System"
      });
    });

    sessions
      .filter((session) => session.status === "cancelled")
      .forEach((session) => {
        const sessionRegistrations = registrations.filter((entry) => entry.sessionId === session.id);
        const program = programs.find((entry) => entry.id === session.programId);
        sessionRegistrations.forEach((registration) => {
          const customer = customers.find((entry) => entry.id === registration.customerId);
          if (!customer) return;
          generated.push({
            id: `comm_cancelled_${registration.id}`,
            organizationId: activeOrgId,
            locationId: session.locationId,
            channel: "system_notification",
            status: "sent",
            recipientType: "customer",
            recipientLabel: `${customer.firstName} ${customer.lastName}`,
            subject: "Program cancelled",
            message: `${program?.title ?? session.title ?? "Session"} has been cancelled.`,
            body: `${program?.title ?? session.title ?? "Session"} has been cancelled.`,
            customerId: customer.id,
            sessionId: session.id,
            programId: program?.id,
            registrationId: registration.id,
            templateType: "program_cancellation",
            automatedTrigger: "program_cancellation",
            source: "program_cancellation",
            isTransactional: true,
            recipients: [{
              id: customer.id,
              type: "customer",
              label: `${customer.firstName} ${customer.lastName}`,
              customerId: customer.id,
              email: customer.email,
              phone: customer.phone
            }],
            sender: { kind: "system", name: "System" },
            relatedRecords: [
              { kind: "customer", id: customer.id, label: `${customer.firstName} ${customer.lastName}` },
              { kind: "program", id: program?.id ?? session.id, label: program?.title ?? session.title ?? "Session" },
              { kind: "session", id: session.id, label: session.title?.trim() || program?.title || "Session" }
            ],
            sentAt: session.cancelledAt ?? `${activeDateKey}T10:00:00Z`,
            createdAt: session.cancelledAt ?? `${activeDateKey}T10:00:00Z`,
            createdByStaffName: "System",
            deliveryStatus: "unread"
          });
        });
      });

    reservations.forEach((reservation) => {
      const resource = rentableResources.find((entry) => entry.id === reservation.resourceId);
      const primaryParticipant = reservation.participants[0];
      const customer = reservation.customerId
        ? customers.find((entry) => entry.id === reservation.customerId)
        : primaryParticipant
          ? customers.find((entry) => entry.id === primaryParticipant.customerId)
          : undefined;
      if (!resource || !customer) return;
      const label = `${customer.firstName} ${customer.lastName}`;
      const reservationTitle = reservation.title || resource.name;
      generated.push({
        id: `comm_reservation_confirmation_${reservation.id}`,
        organizationId: activeOrgId,
        locationId: reservation.locationId,
        channel: "email",
        status: "sent",
        recipientType: reservation.householdId ? "household" : "customer",
        recipientLabel: label,
        subject: "Reservation confirmation",
        message: `${reservationTitle} is confirmed for ${reservation.startsAt}.`,
        body: `${reservationTitle} is confirmed for ${reservation.startsAt}.`,
        customerId: customer.id,
        householdId: reservation.householdId,
        templateType: "registration_confirmation",
        source: "registration_confirmation",
        isTransactional: true,
        recipients: [{ id: customer.id, type: "customer", label, customerId: customer.id, householdId: reservation.householdId, email: customer.email, phone: customer.phone }],
        sender: { kind: "system", name: "System" },
        relatedRecords: [
          { kind: "customer", id: customer.id, label },
          { kind: "alert", id: reservation.id, label: reservationTitle }
        ],
        sentAt: reservation.createdAt,
        createdAt: reservation.createdAt,
        createdByStaffName: reservation.createdByStaffName ?? "System",
        deliveryStatus: "delivered"
      });

      const startsAt = new Date(reservation.startsAt).getTime();
      const activeTs = new Date(`${activeDateKey}T00:00:00Z`).getTime();
      const hoursUntil = Math.round((startsAt - activeTs) / (1000 * 60 * 60));
      if (hoursUntil >= 0 && hoursUntil <= 24) {
        generated.push({
          id: `comm_reservation_reminder_24_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          channel: "sms",
          status: "scheduled",
          recipientType: reservation.householdId ? "household" : "customer",
          recipientLabel: label,
          subject: "Reservation reminder",
          message: `${reservationTitle} starts within 24 hours.`,
          body: `${reservationTitle} starts within 24 hours.`,
          customerId: customer.id,
          householdId: reservation.householdId,
          source: "system_alert",
          isTransactional: true,
          recipients: [{ id: customer.id, type: "customer", label, customerId: customer.id, householdId: reservation.householdId, email: customer.email, phone: customer.phone }],
          sender: { kind: "system", name: "System" },
          relatedRecords: [{ kind: "customer", id: customer.id, label }],
          scheduledFor: reservation.startsAt,
          createdAt: `${activeDateKey}T09:00:00Z`,
          createdByStaffName: "System"
        });
      }
      if (hoursUntil >= 0 && hoursUntil <= 1) {
        generated.push({
          id: `comm_reservation_reminder_1_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          channel: "system_notification",
          status: "scheduled",
          recipientType: reservation.householdId ? "household" : "customer",
          recipientLabel: label,
          subject: "Reservation starts soon",
          message: `${reservationTitle} starts within the hour.`,
          body: `${reservationTitle} starts within the hour.`,
          customerId: customer.id,
          householdId: reservation.householdId,
          source: "system_alert",
          isTransactional: true,
          recipients: [{ id: customer.id, type: "customer", label, customerId: customer.id, householdId: reservation.householdId, email: customer.email, phone: customer.phone }],
          sender: { kind: "system", name: "System" },
          relatedRecords: [{ kind: "customer", id: customer.id, label }],
          scheduledFor: reservation.startsAt,
          createdAt: `${activeDateKey}T09:30:00Z`,
          createdByStaffName: "System"
        });
      }
      if (reservation.status === "cancelled") {
        generated.push({
          id: `comm_reservation_cancelled_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          channel: "email",
          status: "sent",
          recipientType: reservation.householdId ? "household" : "customer",
          recipientLabel: label,
          subject: "Reservation cancelled",
          message: `${reservationTitle} has been cancelled.`,
          body: `${reservationTitle} has been cancelled.`,
          customerId: customer.id,
          householdId: reservation.householdId,
          source: "system_alert",
          isTransactional: true,
          recipients: [{ id: customer.id, type: "customer", label, customerId: customer.id, householdId: reservation.householdId, email: customer.email, phone: customer.phone }],
          sender: { kind: "system", name: "System" },
          relatedRecords: [{ kind: "customer", id: customer.id, label }],
          sentAt: reservation.updatedAt ?? reservation.createdAt,
          createdAt: reservation.updatedAt ?? reservation.createdAt,
          createdByStaffName: "System",
          deliveryStatus: "delivered"
        });
      }
      if (reservation.status === "checked_in" && reservation.reservationType === "equipment_checkout") {
        generated.push({
          id: `comm_equipment_return_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          channel: "sms",
          status: "scheduled",
          recipientType: reservation.householdId ? "household" : "customer",
          recipientLabel: label,
          subject: "Equipment return reminder",
          message: `${reservationTitle} should be returned by ${reservation.endsAt}.`,
          body: `${reservationTitle} should be returned by ${reservation.endsAt}.`,
          customerId: customer.id,
          householdId: reservation.householdId,
          source: "system_alert",
          isTransactional: true,
          recipients: [{ id: customer.id, type: "customer", label, customerId: customer.id, householdId: reservation.householdId, email: customer.email, phone: customer.phone }],
          sender: { kind: "system", name: "System" },
          relatedRecords: [{ kind: "customer", id: customer.id, label }],
          scheduledFor: reservation.endsAt,
          createdAt: `${activeDateKey}T10:00:00Z`,
          createdByStaffName: "System"
        });
      }
    });

    transactions
      .filter((transaction) => transaction.receiptStatus === "pending")
      .forEach((transaction) => {
        const customer = customers.find((entry) => entry.id === transaction.customerId);
        if (!customer) return;
        generated.push({
          id: `comm_payment_reminder_${transaction.id}`,
          organizationId: activeOrgId,
          locationId: transaction.locationId,
          channel: "email",
          status: "scheduled",
          recipientType: "customer",
          recipientLabel: `${customer.firstName} ${customer.lastName}`,
          subject: "Payment reminder",
          message: `A balance remains due for receipt ${transaction.receiptNumber}.`,
          body: `A balance remains due for receipt ${transaction.receiptNumber}.`,
          customerId: customer.id,
          transactionId: transaction.id,
          templateType: "payment_reminder",
          automatedTrigger: "payment_failure",
          source: "payment_reminder",
          isTransactional: true,
          recipients: [{
            id: customer.id,
            type: "customer",
            label: `${customer.firstName} ${customer.lastName}`,
            customerId: customer.id,
            email: customer.email,
            phone: customer.phone
          }],
          sender: { kind: "system", name: "System" },
          relatedRecords: [
            { kind: "customer", id: customer.id, label: `${customer.firstName} ${customer.lastName}` },
            { kind: "receipt", id: transaction.id, label: transaction.receiptNumber }
          ],
          scheduledFor: `${activeDateKey}T17:00:00Z`,
          createdAt: `${activeDateKey}T08:00:00Z`,
          createdByStaffName: "System"
        });
      });

    billingInvoices.forEach((invoice) => {
      const customer = invoice.customerId ? customers.find((entry) => entry.id === invoice.customerId) : undefined;
      const household = invoice.householdId ? households.find((entry) => entry.id === invoice.householdId) : undefined;
      const billingCustomer =
        customer ??
        customers.find(
          (entry) =>
            entry.id === household?.billingCustomerId ||
            entry.id === household?.primaryContactCustomerId ||
            entry.id === billingAccounts.find((account) => account.id === invoice.billingAccountId)?.primaryBillingCustomerId
        );
      if (!billingCustomer) return;
      generated.push({
        id: `comm_invoice_available_${invoice.id}`,
        organizationId: activeOrgId,
        locationId: billingCustomer.locationId,
        channel: "email",
        status: invoice.status === "draft" ? "draft" : "sent",
        recipientType: household ? "household" : "customer",
        recipientLabel: household?.householdName ?? `${billingCustomer.firstName} ${billingCustomer.lastName}`,
        subject: `Invoice ${invoice.invoiceNumber} available`,
        message: `Invoice ${invoice.invoiceNumber} for ${formatCurrencyAmount(invoice.totalCents)} is now available.`,
        body: `Invoice ${invoice.invoiceNumber} for ${formatCurrencyAmount(invoice.totalCents)} is now available.`,
        customerId: billingCustomer.id,
        householdId: household?.id,
        membershipId: invoice.membershipId,
        templateType: "invoice_available",
        automatedTrigger: "invoice_available",
        source: "invoice_available",
        isTransactional: true,
        recipients: [
          {
            id: billingCustomer.id,
            type: "customer",
            label: `${billingCustomer.firstName} ${billingCustomer.lastName}`,
            customerId: billingCustomer.id,
            householdId: household?.id,
            email: billingCustomer.email,
            phone: billingCustomer.phone
          }
        ],
        sender: { kind: "system", name: "System" },
        relatedRecords: [
          { kind: "customer", id: billingCustomer.id, label: `${billingCustomer.firstName} ${billingCustomer.lastName}` },
          ...(household ? [{ kind: "household" as const, id: household.id, label: household.householdName }] : []),
          { kind: "receipt", id: invoice.id, label: invoice.invoiceNumber }
        ],
        sentAt: invoice.createdAt,
        createdAt: invoice.createdAt,
        createdByStaffName: "System",
        deliveryStatus: "delivered"
      });

      if (invoice.status === "open" || invoice.status === "overdue") {
        generated.push({
          id: `comm_invoice_reminder_${invoice.id}`,
          organizationId: activeOrgId,
          locationId: billingCustomer.locationId,
          channel: "email",
          status: "scheduled",
          recipientType: household ? "household" : "customer",
          recipientLabel: household?.householdName ?? `${billingCustomer.firstName} ${billingCustomer.lastName}`,
          subject: invoice.status === "overdue" ? "Past due balance reminder" : "Payment reminder",
          message: `${invoice.invoiceNumber} has ${formatCurrencyAmount(invoice.balanceCents)} remaining.`,
          body: `${invoice.invoiceNumber} has ${formatCurrencyAmount(invoice.balanceCents)} remaining.`,
          customerId: billingCustomer.id,
          householdId: household?.id,
          membershipId: invoice.membershipId,
          templateType: "payment_reminder",
          automatedTrigger: "payment_failure",
          source: "payment_reminder",
          isTransactional: true,
          recipients: [
            {
              id: billingCustomer.id,
              type: "customer",
              label: `${billingCustomer.firstName} ${billingCustomer.lastName}`,
              customerId: billingCustomer.id,
              householdId: household?.id,
              email: billingCustomer.email,
              phone: billingCustomer.phone
            }
          ],
          sender: { kind: "system", name: "System" },
          relatedRecords: [
            { kind: "customer", id: billingCustomer.id, label: `${billingCustomer.firstName} ${billingCustomer.lastName}` },
            ...(household ? [{ kind: "household" as const, id: household.id, label: household.householdName }] : []),
            { kind: "receipt", id: invoice.id, label: invoice.invoiceNumber }
          ],
          scheduledFor: `${activeDateKey}T17:30:00Z`,
          createdAt: `${activeDateKey}T08:10:00Z`,
          createdByStaffName: "System"
        });
      }
    });

    billingStatements.forEach((statement) => {
      const customer = statement.customerId ? customers.find((entry) => entry.id === statement.customerId) : undefined;
      const household = statement.householdId ? households.find((entry) => entry.id === statement.householdId) : undefined;
      const billingCustomer =
        customer ??
        customers.find(
          (entry) =>
            entry.id === household?.billingCustomerId ||
            entry.id === household?.primaryContactCustomerId ||
            entry.id === billingAccounts.find((account) => account.id === statement.billingAccountId)?.primaryBillingCustomerId
        );
      if (!billingCustomer) return;
      generated.push({
        id: `comm_statement_ready_${statement.id}`,
        organizationId: activeOrgId,
        locationId: billingCustomer.locationId,
        channel: "email",
        status: "sent",
        recipientType: household ? "household" : "customer",
        recipientLabel: household?.householdName ?? `${billingCustomer.firstName} ${billingCustomer.lastName}`,
        subject: `Statement ${statement.statementNumber} ready`,
        message: `Your billing statement for ${statement.periodStart} to ${statement.periodEnd} is ready.`,
        body: `Your billing statement for ${statement.periodStart} to ${statement.periodEnd} is ready.`,
        customerId: billingCustomer.id,
        householdId: household?.id,
        templateType: "statement_ready",
        automatedTrigger: "statement_ready",
        source: "statement_ready",
        isTransactional: true,
        recipients: [
          {
            id: billingCustomer.id,
            type: "customer",
            label: `${billingCustomer.firstName} ${billingCustomer.lastName}`,
            customerId: billingCustomer.id,
            householdId: household?.id,
            email: billingCustomer.email,
            phone: billingCustomer.phone
          }
        ],
        sender: { kind: "system", name: "System" },
        relatedRecords: [
          { kind: "customer", id: billingCustomer.id, label: `${billingCustomer.firstName} ${billingCustomer.lastName}` },
          ...(household ? [{ kind: "household" as const, id: household.id, label: household.householdName }] : []),
          { kind: "alert", id: statement.id, label: statement.statementNumber }
        ],
        sentAt: statement.createdAt,
        createdAt: statement.createdAt,
        createdByStaffName: "System",
        deliveryStatus: "delivered"
      });
    });

    membershipRenewals.forEach((renewal) => {
      if (renewal.status !== "failed") return;
      const customer = customers.find((entry) => entry.id === renewal.customerId);
      const household = renewal.householdId ? households.find((entry) => entry.id === renewal.householdId) : undefined;
      if (!customer) return;
      generated.push({
        id: `comm_failed_payment_${renewal.id}`,
        organizationId: activeOrgId,
        locationId: customer.locationId,
        channel: "email",
        status: "sent",
        recipientType: household ? "household" : "customer",
        recipientLabel: household?.householdName ?? `${customer.firstName} ${customer.lastName}`,
        subject: "Failed payment notice",
        message: renewal.failureReason
          ? `We could not process your renewal: ${renewal.failureReason}.`
          : "We could not process your renewal.",
        body: renewal.failureReason
          ? `We could not process your renewal: ${renewal.failureReason}.`
          : "We could not process your renewal.",
        customerId: customer.id,
        householdId: household?.id,
        membershipId: renewal.membershipId,
        templateType: "failed_payment_notice",
        automatedTrigger: "payment_failure",
        source: "failed_payment_notice",
        isTransactional: true,
        recipients: [
          {
            id: customer.id,
            type: "customer",
            label: `${customer.firstName} ${customer.lastName}`,
            customerId: customer.id,
            householdId: household?.id,
            email: customer.email,
            phone: customer.phone
          }
        ],
        sender: { kind: "system", name: "System" },
        relatedRecords: [
          { kind: "customer", id: customer.id, label: `${customer.firstName} ${customer.lastName}` },
          ...(household ? [{ kind: "household" as const, id: household.id, label: household.householdName }] : []),
          { kind: "alert", id: renewal.id, label: renewal.status }
        ],
        sentAt: renewal.processedAt ?? renewal.createdAt,
        createdAt: renewal.createdAt,
        createdByStaffName: "System",
        deliveryStatus: "delivered"
      });
    });

    return [...generated, ...manualCommunications].sort((a, b) => {
      const aDate = a.sentAt ?? a.scheduledFor ?? a.createdAt;
      const bDate = b.sentAt ?? b.scheduledFor ?? b.createdAt;
      return bDate.localeCompare(aDate);
    });
  }, [
    activeDateKey,
    activeOrgId,
    billingAccounts,
    billingInvoices,
    billingStatements,
    customers,
    households,
    manualCommunications,
    memberships,
    membershipRenewals,
    programs,
    registrations,
    sessions,
    rentableResources,
    reservations,
    transactions,
    waiverTemplates,
    waivers
  ]);

  const operationsAlerts = useMemo<OperationsAlertRecord[]>(() => {
    const alerts: OperationsAlertRecord[] = [];
    const registrationCounts = new Map<
      string,
      { registered: number; waitlisted: number }
    >();
    const householdsByCustomerId = new Map(householdMembers.map((entry) => [entry.customerId, entry]));
    const todayMonthDay = activeDateKey.slice(5);

    registrations.forEach((registration) => {
      const existing = registrationCounts.get(registration.sessionId) ?? { registered: 0, waitlisted: 0 };
      if (registration.status === "confirmed" || registration.status === "checked_in" || registration.status === "attended") {
        existing.registered += 1;
      }
      if (registration.status === "waitlisted") existing.waitlisted += 1;
      registrationCounts.set(registration.sessionId, existing);
    });

    customers.forEach((customer) => {
      const membershipRow = householdsByCustomerId.get(customer.id);
      const generalWaiverStatus = getWaiverStatusForCustomer(customer.id, "wtpl_general");
      const customerLabel = `${customer.firstName} ${customer.lastName}`;

      if (customer.dateOfBirth?.slice(5) === todayMonthDay) {
        alerts.push({
          id: `alert_customer_birthday_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "customer",
          severity: "info",
          status: "open",
          title: "Birthday today",
          description: `${customerLabel} has a birthday today.`,
          customerId: customer.id,
          createdAt: `${activeDateKey}T06:00:00Z`
        });
      }

      if (!customer.emergencyContactName || !customer.emergencyContactPhone) {
        alerts.push({
          id: `alert_customer_emergency_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "customer",
          severity: "warning",
          status: "open",
          title: "Missing emergency contact",
          description: `${customerLabel} does not have a complete emergency contact on file.`,
          customerId: customer.id,
          createdAt: `${activeDateKey}T06:30:00Z`
        });
      }

      if (!customer.phone || !customer.email || !customer.dateOfBirth) {
        alerts.push({
          id: `alert_customer_profile_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "customer",
          severity: "info",
          status: "open",
          title: "Incomplete profile",
          description: `${customerLabel} is missing key profile fields.`,
          customerId: customer.id,
          createdAt: `${activeDateKey}T06:45:00Z`
        });
      }

      if (isMinor(customer.dateOfBirth) && (!membershipRow || !membershipRow.canCheckInOthers)) {
        alerts.push({
          id: `alert_customer_guardian_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "customer",
          severity: "warning",
          status: "open",
          title: "Minor without guardian",
          description: `${customerLabel} does not have a guardian relationship configured for check-in.`,
          customerId: customer.id,
          createdAt: `${activeDateKey}T07:00:00Z`
        });
      }

      if (generalWaiverStatus === "missing") {
        alerts.push({
          id: `alert_waiver_missing_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "waiver",
          severity: "critical",
          status: "open",
          title: "Missing waiver",
          description: `${customerLabel} needs a valid facility waiver before participation.`,
          customerId: customer.id,
          waiverTemplateId: "wtpl_general",
          createdAt: `${activeDateKey}T07:15:00Z`
        });
      }
      if (generalWaiverStatus === "expired") {
        alerts.push({
          id: `alert_waiver_expired_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "waiver",
          severity: "critical",
          status: "open",
          title: "Expired waiver",
          description: `${customerLabel}'s waiver has expired.`,
          customerId: customer.id,
          waiverTemplateId: "wtpl_general",
          createdAt: `${activeDateKey}T07:20:00Z`
        });
      }
      if (generalWaiverStatus === "expiring_soon") {
        alerts.push({
          id: `alert_waiver_expiring_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "waiver",
          severity: "warning",
          status: "open",
          title: "Expiring waiver",
          description: `${customerLabel}'s waiver expires soon.`,
          customerId: customer.id,
          waiverTemplateId: "wtpl_general",
          createdAt: `${activeDateKey}T07:25:00Z`
        });
      }
      if (isMinor(customer.dateOfBirth) && (generalWaiverStatus === "missing" || generalWaiverStatus === "expired")) {
        alerts.push({
          id: `alert_waiver_guardian_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "waiver",
          severity: "critical",
          status: "open",
          title: "Guardian signature required",
          description: `${customerLabel} requires a guardian-signed waiver.`,
          customerId: customer.id,
          waiverTemplateId: "wtpl_general",
          createdAt: `${activeDateKey}T07:30:00Z`
        });
      }
    });

    customerAccessRecords.forEach((record) => {
      const customer = customers.find((entry) => entry.id === record.customerId);
      if (!customer) return;
      const customerLabel = `${customer.firstName} ${customer.lastName}`;
      const membershipName =
        accessProducts.find((product) => product.id === record.productId)?.name ??
        record.notes ??
        "Membership";
      const daysToExpiration = diffDays(activeDateKey, record.expirationDate);

      if (record.type === "membership" || record.type === "household-membership" || record.type === "staff-access") {
        if (record.status === "expired") {
          alerts.push({
            id: `alert_membership_expired_${record.id}`,
            organizationId: activeOrgId,
            locationId: customer.locationId,
            source: "system",
            type: "membership",
            severity: "critical",
            status: "open",
            title: "Expired membership",
            description: `${customerLabel}'s ${membershipName} has expired.`,
            customerId: customer.id,
            membershipId: record.id,
            createdAt: `${activeDateKey}T07:40:00Z`
          });
        } else if (typeof daysToExpiration === "number" && daysToExpiration >= 0 && daysToExpiration <= 30) {
          alerts.push({
            id: `alert_membership_expiring_${record.id}`,
            organizationId: activeOrgId,
            locationId: customer.locationId,
            source: "system",
            type: "membership",
            severity: daysToExpiration <= 7 ? "critical" : "warning",
            status: "open",
            title: "Expiring within 30 days",
            description: `${customerLabel}'s ${membershipName} expires in ${daysToExpiration} day${daysToExpiration === 1 ? "" : "s"}.`,
            customerId: customer.id,
            membershipId: record.id,
            createdAt: `${activeDateKey}T07:45:00Z`
          });
        }
      }

      if (record.status === "pending" || (record.notes ?? "").toLowerCase().includes("failed renewal")) {
        alerts.push({
          id: `alert_membership_failed_${record.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "membership",
          severity: "critical",
          status: "open",
          title: "Failed renewal",
          description: `${customerLabel}'s ${membershipName} renewal needs review.`,
          customerId: customer.id,
          membershipId: record.id,
          createdAt: `${activeDateKey}T07:50:00Z`
        });
      }

      if (record.status === "frozen" && typeof diffDays(activeDateKey, record.freezeEndDate) === "number" && (diffDays(activeDateKey, record.freezeEndDate) ?? 99) <= 7) {
        const daysRemaining = diffDays(activeDateKey, record.freezeEndDate) ?? 0;
        alerts.push({
          id: `alert_membership_frozen_${record.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "membership",
          severity: "warning",
          status: "open",
          title: "Frozen membership ending soon",
          description: `${customerLabel}'s freeze ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
          customerId: customer.id,
          membershipId: record.id,
          createdAt: `${activeDateKey}T07:55:00Z`
        });
      }

      if ((record.notes ?? "").toLowerCase().includes("balance due") || (record.notes ?? "").toLowerCase().includes("outstanding")) {
        alerts.push({
          id: `alert_membership_balance_${record.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "financial",
          severity: "warning",
          status: "open",
          title: "Outstanding balance",
          description: `${customerLabel} has an outstanding balance tied to access.`,
          customerId: customer.id,
          membershipId: record.id,
          createdAt: `${activeDateKey}T08:00:00Z`
        });
      }
    });

    sessions.forEach((session) => {
      const counts = registrationCounts.get(session.id) ?? { registered: 0, waitlisted: 0 };
      const program = programs.find((entry) => entry.id === session.programId);
      const sessionLabel = session.title?.trim() || program?.title || "Session";

      if (counts.waitlisted > 0) {
        alerts.push({
          id: `alert_program_waitlist_${session.id}`,
          organizationId: activeOrgId,
          locationId: session.locationId,
          source: "system",
          type: "program",
          severity: "warning",
          status: "open",
          title: "Waitlist exists",
          description: `${sessionLabel} has ${counts.waitlisted} participant${counts.waitlisted === 1 ? "" : "s"} waiting.`,
          sessionId: session.id,
          programId: session.programId,
          createdAt: session.startsAt
        });
      }
      if (counts.registered >= session.capacity) {
        alerts.push({
          id: `alert_program_capacity_${session.id}`,
          organizationId: activeOrgId,
          locationId: session.locationId,
          source: "system",
          type: "program",
          severity: "warning",
          status: "open",
          title: "Program at capacity",
          description: `${sessionLabel} is full at ${counts.registered}/${session.capacity}.`,
          sessionId: session.id,
          programId: session.programId,
          createdAt: session.startsAt
        });
      }
      if (!session.instructorName) {
        alerts.push({
          id: `alert_program_unassigned_${session.id}`,
          organizationId: activeOrgId,
          locationId: session.locationId,
          source: "system",
          type: "program",
          severity: "critical",
          status: "open",
          title: "Instructor unassigned",
          description: `${sessionLabel} does not have an assigned instructor.`,
          sessionId: session.id,
          programId: session.programId,
          createdAt: session.startsAt
        });
      }
      if (session.status === "cancelled") {
        alerts.push({
          id: `alert_program_cancelled_${session.id}`,
          organizationId: activeOrgId,
          locationId: session.locationId,
          source: "system",
          type: "program",
          severity: "info",
          status: "open",
          title: "Cancelled session",
          description: `${sessionLabel} was cancelled.`,
          sessionId: session.id,
          programId: session.programId,
          createdAt: session.startsAt
        });
      }
      if ((counts.registered <= Math.max(2, Math.ceil(session.capacity * 0.25))) && session.status !== "cancelled" && session.startsAt >= `${activeDateKey}T00:00:00Z`) {
        alerts.push({
          id: `alert_program_low_${session.id}`,
          organizationId: activeOrgId,
          locationId: session.locationId,
          source: "system",
          type: "program",
          severity: "info",
          status: "open",
          title: "Low enrollment",
          description: `${sessionLabel} has ${counts.registered}/${session.capacity} registrations.`,
          sessionId: session.id,
          programId: session.programId,
          createdAt: session.startsAt
        });
      }
    });

    accessProducts.forEach((product) => {
      const productLabel = product.name;
      const locationStock = product.inventoryByLocation?.[activeLocationId];
      if (product.trackInventory) {
        if (typeof locationStock === "number" && locationStock <= 0) {
          alerts.push({
            id: `alert_inventory_out_${product.id}`,
            organizationId: activeOrgId,
            locationId: activeLocationId,
            source: "system",
            type: "inventory",
            severity: "critical",
            status: "open",
            title: "Out of stock",
            description: `${productLabel} is out of stock at this location.`,
            productId: product.id,
            createdAt: `${activeDateKey}T08:10:00Z`
          });
        } else if (typeof locationStock === "number" && typeof product.lowStockThreshold === "number" && locationStock <= product.lowStockThreshold) {
          alerts.push({
            id: `alert_inventory_low_${product.id}`,
            organizationId: activeOrgId,
            locationId: activeLocationId,
            source: "system",
            type: "inventory",
            severity: "warning",
            status: "open",
            title: "Low stock",
            description: `${productLabel} is down to ${locationStock} unit${locationStock === 1 ? "" : "s"}.`,
            productId: product.id,
            createdAt: `${activeDateKey}T08:15:00Z`
          });
        }
      }
      if (!product.imageUrls?.length) {
        alerts.push({
          id: `alert_inventory_image_${product.id}`,
          organizationId: activeOrgId,
          locationId: activeLocationId,
          source: "system",
          type: "inventory",
          severity: "info",
          status: "open",
          title: "Product missing image",
          description: `${productLabel} does not have a product image yet.`,
          productId: product.id,
          createdAt: `${activeDateKey}T08:20:00Z`
        });
      }
      if (!product.category && !product.productCategory) {
        alerts.push({
          id: `alert_inventory_category_${product.id}`,
          organizationId: activeOrgId,
          locationId: activeLocationId,
          source: "system",
          type: "inventory",
          severity: "warning",
          status: "open",
          title: "Product missing category",
          description: `${productLabel} needs a reporting category.`,
          productId: product.id,
          createdAt: `${activeDateKey}T08:25:00Z`
        });
      }
    });

    transactions.forEach((transaction) => {
      if (transaction.receiptStatus === "refunded" || transaction.receiptStatus === "partially_refunded" || transaction.refundedTotal) {
        alerts.push({
          id: `alert_financial_refund_${transaction.id}`,
          organizationId: activeOrgId,
          locationId: transaction.locationId,
          source: "system",
          type: "financial",
          severity: "info",
          status: "open",
          title: "Refund issued",
          description: `Receipt ${transaction.receiptNumber} includes a refund.`,
          transactionId: transaction.id,
          customerId: transaction.customerId,
          createdAt: transaction.completedAt
        });
      }
      if (transaction.receiptStatus === "pending") {
        alerts.push({
          id: `alert_financial_pending_${transaction.id}`,
          organizationId: activeOrgId,
          locationId: transaction.locationId,
          source: "system",
          type: "financial",
          severity: "warning",
          status: "open",
          title: "Outstanding balance",
          description: `Receipt ${transaction.receiptNumber} is still pending.`,
          transactionId: transaction.id,
          customerId: transaction.customerId,
          createdAt: transaction.completedAt
        });
      }
    });

    billingAccounts.forEach((account) => {
      const household = account.ownerType === "household" ? households.find((entry) => entry.id === account.ownerId) : undefined;
      const customer =
        (account.ownerType === "customer" ? customers.find((entry) => entry.id === account.ownerId) : undefined) ??
        customers.find(
          (entry) =>
            entry.id === account.primaryBillingCustomerId ||
            entry.id === household?.billingCustomerId ||
            entry.id === household?.primaryContactCustomerId
        );
      const label = household?.householdName ?? (customer ? `${customer.firstName} ${customer.lastName}` : "Billing account");
      const locationId = account.locationId ?? customer?.locationId ?? activeLocationId;

      if (account.currentBalanceCents < 0) {
        alerts.push({
          id: `alert_billing_due_${account.id}`,
          organizationId: activeOrgId,
          locationId,
          source: "system",
          type: "financial",
          severity: Math.abs(account.currentBalanceCents) >= 10000 ? "critical" : "warning",
          status: "open",
          title: "Past due balance",
          description: `${label} has ${formatCurrencyAmount(Math.abs(account.currentBalanceCents))} due.`,
          customerId: customer?.id,
          createdAt: `${activeDateKey}T08:40:00Z`
        });
      }

      if (account.availableCreditCents >= 5000) {
        alerts.push({
          id: `alert_billing_credit_${account.id}`,
          organizationId: activeOrgId,
          locationId,
          source: "system",
          type: "financial",
          severity: "info",
          status: "open",
          title: "Large credit balance",
          description: `${label} has ${formatCurrencyAmount(account.availableCreditCents)} in available credit.`,
          customerId: customer?.id,
          createdAt: `${activeDateKey}T08:45:00Z`
        });
      }
    });

    billingInvoices.forEach((invoice) => {
      if (invoice.status !== "overdue" && !(invoice.status === "open" && invoice.balanceCents > 0)) return;
      const customer = invoice.customerId ? customers.find((entry) => entry.id === invoice.customerId) : undefined;
      const household = invoice.householdId ? households.find((entry) => entry.id === invoice.householdId) : undefined;
      const locationId =
        customer?.locationId ??
        households.find((entry) => entry.id === invoice.householdId)?.locationId ??
        activeLocationId;
      alerts.push({
        id: `alert_billing_invoice_${invoice.id}`,
        organizationId: activeOrgId,
        locationId,
        source: "system",
        type: "financial",
        severity: invoice.status === "overdue" ? "critical" : "warning",
        status: "open",
        title: invoice.status === "overdue" ? "Invoice overdue" : "Outstanding balance",
        description: `${invoice.invoiceNumber} has ${formatCurrencyAmount(invoice.balanceCents)} remaining for ${household?.householdName ?? (customer ? `${customer.firstName} ${customer.lastName}` : "this account")}.`,
        customerId: customer?.id,
        transactionId: invoice.transactionId,
        membershipId: invoice.membershipId,
        createdAt: invoice.updatedAt ?? invoice.createdAt
      });
    });

    membershipRenewals.forEach((renewal) => {
      if (renewal.status !== "failed") return;
      const customer = customers.find((entry) => entry.id === renewal.customerId);
      alerts.push({
        id: `alert_billing_renewal_${renewal.id}`,
        organizationId: activeOrgId,
        locationId: customer?.locationId ?? activeLocationId,
        source: "system",
        type: "financial",
        severity: "critical",
        status: "open",
        title: "Renewal failure",
        description: renewal.failureReason
          ? `${customer ? `${customer.firstName} ${customer.lastName}` : "Member"} renewal failed: ${renewal.failureReason}.`
          : `${customer ? `${customer.firstName} ${customer.lastName}` : "Member"} renewal failed.`,
        customerId: customer?.id,
        membershipId: renewal.membershipId,
        createdAt: renewal.processedAt ?? renewal.createdAt
      });
    });

    customers.forEach((customer) => {
      const staffProfile = customer.staffProfile;
      if (!staffProfile?.isStaff) return;
      const staffLabel = `${customer.firstName} ${customer.lastName}`;

      if (!staffProfile.startDate || staffProfile.locations.length === 0) {
        alerts.push({
          id: `alert_staff_profile_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "staff",
          severity: "warning",
          status: "open",
          title: "Incomplete profile",
          description: `${staffLabel}'s staff profile is missing setup details.`,
          customerId: customer.id,
          staffUserId: staffProfile.staffId,
          createdAt: `${activeDateKey}T08:30:00Z`
        });
      }
      if (!staffProfile.certifications?.length) {
        alerts.push({
          id: `alert_staff_cert_${customer.id}`,
          organizationId: activeOrgId,
          locationId: customer.locationId,
          source: "system",
          type: "staff",
          severity: "info",
          status: "open",
          title: "Missing certification",
          description: `${staffLabel} does not have certifications recorded.`,
          customerId: customer.id,
          staffUserId: staffProfile.staffId,
          createdAt: `${activeDateKey}T08:35:00Z`
        });
      }
    });

    reservations.forEach((reservation) => {
      const resource = rentableResources.find((entry) => entry.id === reservation.resourceId);
      const customer = reservation.customerId ? customers.find((entry) => entry.id === reservation.customerId) : undefined;
      const label = customer ? `${customer.firstName} ${customer.lastName}` : reservation.title;
      const overlapsMaintenance = maintenanceBlocks.find(
        (entry) => entry.resourceId === reservation.resourceId && overlaps(
          reservation.unavailableStartsAt ?? reservation.startsAt,
          reservation.unavailableEndsAt ?? reservation.endsAt,
          entry.startsAt,
          entry.endsAt
        )
      );
      if (overlapsMaintenance && reservation.status !== "cancelled") {
        alerts.push({
          id: `alert_reservation_maintenance_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          source: "system",
          type: "program",
          severity: "warning",
          status: "open",
          title: "Maintenance blocking reservation",
          description: `${resource?.name ?? "Resource"} is blocked during ${label}'s reservation window.`,
          customerId: customer?.id,
          createdAt: `${activeDateKey}T08:45:00Z`
        });
      }
      const conflictingReservation = reservations.find(
        (entry) =>
          entry.id !== reservation.id &&
          entry.resourceId === reservation.resourceId &&
          entry.status !== "cancelled" &&
          reservation.status !== "cancelled" &&
          overlaps(
            reservation.unavailableStartsAt ?? reservation.startsAt,
            reservation.unavailableEndsAt ?? reservation.endsAt,
            entry.unavailableStartsAt ?? entry.startsAt,
            entry.unavailableEndsAt ?? entry.endsAt
          )
      );
      if (conflictingReservation) {
        alerts.push({
          id: `alert_reservation_conflict_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          source: "system",
          type: "program",
          severity: "critical",
          status: "open",
          title: "Reservation conflict",
          description: `${resource?.name ?? "Resource"} has overlapping reservations.`,
          customerId: customer?.id,
          createdAt: `${activeDateKey}T08:50:00Z`
        });
      }
      if (
        reservation.reservationType === "equipment_checkout" &&
        reservation.status === "checked_in" &&
        new Date(reservation.endsAt).getTime() < new Date(`${activeDateKey}T23:59:59Z`).getTime()
      ) {
        alerts.push({
          id: `alert_equipment_overdue_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          source: "system",
          type: "inventory",
          severity: "warning",
          status: "open",
          title: "Overdue equipment",
          description: `${resource?.name ?? "Equipment"} has not been returned by ${label}.`,
          customerId: customer?.id,
          createdAt: `${activeDateKey}T09:00:00Z`
        });
      }
      const hoursUntil = (new Date(reservation.startsAt).getTime() - new Date(`${activeDateKey}T00:00:00Z`).getTime()) / (1000 * 60 * 60);
      if (hoursUntil >= 0 && hoursUntil <= 24 && reservation.status === "confirmed") {
        alerts.push({
          id: `alert_upcoming_reservation_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          source: "system",
          type: "program",
          severity: "info",
          status: "open",
          title: "Upcoming reservation",
          description: `${label} has an upcoming reservation for ${resource?.name ?? "resource"}.`,
          customerId: customer?.id,
          createdAt: `${activeDateKey}T09:05:00Z`
        });
      }
      if (resource?.status === "maintenance" || resource?.status === "inactive") {
        alerts.push({
          id: `alert_resource_unavailable_${reservation.id}`,
          organizationId: activeOrgId,
          locationId: reservation.locationId,
          source: "system",
          type: "inventory",
          severity: "warning",
          status: "open",
          title: "Resource unavailable",
          description: `${resource.name} is not currently bookable.`,
          customerId: customer?.id,
          createdAt: `${activeDateKey}T09:10:00Z`
        });
      }
    });

    const overridesById = new Map(operationsAlertOverrides.map((entry) => [entry.id, entry]));
    return [...alerts, ...operationsManualAlerts]
      .map((alert) => {
        const override = overridesById.get(alert.id);
        return override ? { ...alert, status: override.status, resolvedAt: override.resolvedAt, archivedAt: override.archivedAt } : alert;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [
    accessProducts,
    activeDateKey,
    activeLocationId,
    activeOrgId,
    billingAccounts,
    billingInvoices,
    billingRefunds,
    billingStatements,
    customerAccessRecords,
    customers,
    getWaiverStatusForCustomer,
    householdMembers,
    households,
    membershipRenewals,
    operationsAlertOverrides,
    operationsManualAlerts,
    maintenanceBlocks,
    programs,
    rentableResources,
    registrations,
    reservations,
    sessions,
    transactions
  ]);

  const createOperationsAlert = (input: {
    title: string;
    description?: string;
    severity: OperationsAlertRecord["severity"];
    type: OperationsAlertRecord["type"];
    customerId?: string;
    membershipId?: string;
    waiverTemplateId?: string;
    sessionId?: string;
    programId?: string;
    productId?: string;
    transactionId?: string;
    staffUserId?: string;
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => {
    const alertId = `alert_manual_${Math.random().toString(36).slice(2, 9)}`;
    setOperationsManualAlerts((prev) => [
      {
        id: alertId,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        source: "staff",
        type: input.type,
        severity: input.severity,
        status: "open",
        title: input.title,
        description: input.description,
        customerId: input.customerId,
        membershipId: input.membershipId,
        waiverTemplateId: input.waiverTemplateId,
        sessionId: input.sessionId,
        programId: input.programId,
        productId: input.productId,
        transactionId: input.transactionId,
        staffUserId: input.staffUserId,
        createdAt: new Date().toISOString(),
        createdByStaffId: input.createdByStaffId,
        createdByStaffName: input.createdByStaffName
      },
      ...prev
    ]);
    return { ok: true as const, message: `Alert created: ${input.title}.`, alertId };
  };

  const updateDerivedAlertStatus = (alertId: string, status: OperationsAlertStatus) => {
    const timestamp = new Date().toISOString();
    setOperationsAlertOverrides((prev) => {
      const existing = prev.find((entry) => entry.id === alertId);
      const nextEntry = {
        id: alertId,
        status,
        resolvedAt: status === "resolved" ? timestamp : undefined,
        archivedAt: status === "archived" ? timestamp : undefined
      };
      if (existing) {
        return prev.map((entry) => (entry.id === alertId ? nextEntry : entry));
      }
      return [nextEntry, ...prev];
    });
  };

  const resolveOperationsAlert = (alertId: string) => {
    if (operationsManualAlerts.some((entry) => entry.id === alertId)) {
      setOperationsManualAlerts((prev) =>
        prev.map((entry) =>
          entry.id === alertId ? { ...entry, status: "resolved", resolvedAt: new Date().toISOString() } : entry
        )
      );
      return { ok: true as const, message: "Alert resolved." };
    }
    updateDerivedAlertStatus(alertId, "resolved");
    return { ok: true as const, message: "Alert resolved." };
  };

  const archiveOperationsAlert = (alertId: string) => {
    if (operationsManualAlerts.some((entry) => entry.id === alertId)) {
      setOperationsManualAlerts((prev) =>
        prev.map((entry) =>
          entry.id === alertId ? { ...entry, status: "archived", archivedAt: new Date().toISOString() } : entry
        )
      );
      return { ok: true as const, message: "Alert archived." };
    }
    updateDerivedAlertStatus(alertId, "archived");
    return { ok: true as const, message: "Alert archived." };
  };

  const createOperationsTask = (input: {
    title: string;
    description?: string;
    dueDate?: string;
    assignedStaffId?: string;
    assignedStaffName?: string;
    status?: OperationsTaskRecord["status"];
    customerId?: string;
    membershipId?: string;
    waiverTemplateId?: string;
    sessionId?: string;
    productId?: string;
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => {
    const taskId = `task_${Math.random().toString(36).slice(2, 9)}`;
    setOperationsTasks((prev) => [
      {
        id: taskId,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        assignedStaffId: input.assignedStaffId,
        assignedStaffName: input.assignedStaffName,
        status: input.status ?? "open",
        customerId: input.customerId,
        membershipId: input.membershipId,
        waiverTemplateId: input.waiverTemplateId,
        sessionId: input.sessionId,
        productId: input.productId,
        createdAt: new Date().toISOString(),
        createdByStaffId: input.createdByStaffId,
        createdByStaffName: input.createdByStaffName
      },
      ...prev
    ]);
    return { ok: true as const, message: `Task created: ${input.title}.`, taskId };
  };

  const updateOperationsTask = (
    taskId: string,
    updates: Partial<Pick<OperationsTaskRecord, "title" | "description" | "dueDate" | "assignedStaffId" | "assignedStaffName" | "status" | "completedAt">>
  ) => {
    setOperationsTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...updates,
              completedAt: updates.status === "completed" ? updates.completedAt ?? new Date().toISOString() : task.completedAt
            }
          : task
      )
    );
    return { ok: true as const, message: "Task updated." };
  };

  const createRentableResource: CustomerStateContextValue["createRentableResource"] = (input) => {
    const id = `resource_${Math.random().toString(36).slice(2, 9)}`;
    setRentableResources((prev) => [
      {
        ...input,
        id,
        organizationId: activeOrgId,
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
    return { ok: true as const, message: `Resource created: ${input.name}.`, resourceId: id };
  };

  const updateRentableResource: CustomerStateContextValue["updateRentableResource"] = (resourceId, updates) => {
    const existing = rentableResources.find((entry) => entry.id === resourceId);
    if (!existing) return { ok: false as const, message: "Resource not found." };
    setRentableResources((prev) =>
      prev.map((entry) =>
        entry.id === resourceId ? { ...entry, ...updates, updatedAt: new Date().toISOString() } : entry
      )
    );
    return { ok: true as const, message: "Resource updated." };
  };

  const createMaintenanceBlock: CustomerStateContextValue["createMaintenanceBlock"] = (input) => {
    const resource = rentableResources.find((entry) => entry.id === input.resourceId);
    if (!resource) return { ok: false as const, message: "Resource not found." };
    const blockId = `maint_${Math.random().toString(36).slice(2, 9)}`;
    setMaintenanceBlocks((prev) => [
      {
        ...input,
        id: blockId,
        organizationId: activeOrgId,
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
    return { ok: true as const, message: `Maintenance block created for ${resource.name}.`, blockId };
  };

  const createReservation: CustomerStateContextValue["createReservation"] = (input) => {
    const resource = rentableResources.find((entry) => entry.id === input.resourceId);
    if (!resource) return { ok: false as const, message: "Resource not found." };
    const startsAt = input.startsAt;
    const endsAt = input.endsAt;
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return { ok: false as const, message: "Reservation end must be after start." };
    }
    const setupBufferMinutes = input.setupBufferMinutes ?? resource.setupBufferMinutes ?? 0;
    const cleanupBufferMinutes = input.cleanupBufferMinutes ?? resource.cleanupBufferMinutes ?? 0;
    const unavailableStartsAt = new Date(new Date(startsAt).getTime() - setupBufferMinutes * 60000).toISOString();
    const unavailableEndsAt = new Date(new Date(endsAt).getTime() + cleanupBufferMinutes * 60000).toISOString();

    const conflictingReservation = reservations.find(
      (entry) =>
        entry.resourceId === input.resourceId &&
        !["cancelled", "completed", "checked_out"].includes(entry.status) &&
        overlaps(
          unavailableStartsAt,
          unavailableEndsAt,
          entry.unavailableStartsAt ?? entry.startsAt,
          entry.unavailableEndsAt ?? entry.endsAt
        )
    );
    if (conflictingReservation) {
      return { ok: false as const, message: `Conflict: ${resource.name} is already reserved for that time.` };
    }
    const blockingMaintenance = maintenanceBlocks.find(
      (entry) => entry.resourceId === input.resourceId && overlaps(unavailableStartsAt, unavailableEndsAt, entry.startsAt, entry.endsAt)
    );
    if (blockingMaintenance) {
      return { ok: false as const, message: `Unavailable: ${resource.name} is blocked for maintenance.` };
    }

    const reservationId = `rsv_${Math.random().toString(36).slice(2, 9)}`;
    setReservations((prev) => [
      {
        ...input,
        id: reservationId,
        organizationId: activeOrgId,
        setupBufferMinutes,
        cleanupBufferMinutes,
        unavailableStartsAt,
        unavailableEndsAt,
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
    return { ok: true as const, message: `Reservation created for ${resource.name}.`, reservationId };
  };

  const updateReservation: CustomerStateContextValue["updateReservation"] = (reservationId, updates) => {
    const existing = reservations.find((entry) => entry.id === reservationId);
    if (!existing) return { ok: false as const, message: "Reservation not found." };
    const resource = rentableResources.find((entry) => entry.id === (updates.resourceId ?? existing.resourceId));
    if (!resource) return { ok: false as const, message: "Resource not found." };
    const startsAt = updates.startsAt ?? existing.startsAt;
    const endsAt = updates.endsAt ?? existing.endsAt;
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return { ok: false as const, message: "Reservation end must be after start." };
    }
    const setupBufferMinutes = updates.setupBufferMinutes ?? existing.setupBufferMinutes ?? resource.setupBufferMinutes ?? 0;
    const cleanupBufferMinutes = updates.cleanupBufferMinutes ?? existing.cleanupBufferMinutes ?? resource.cleanupBufferMinutes ?? 0;
    const unavailableStartsAt = new Date(new Date(startsAt).getTime() - setupBufferMinutes * 60000).toISOString();
    const unavailableEndsAt = new Date(new Date(endsAt).getTime() + cleanupBufferMinutes * 60000).toISOString();

    const conflictingReservation = reservations.find(
      (entry) =>
        entry.id !== reservationId &&
        entry.resourceId === (updates.resourceId ?? existing.resourceId) &&
        !["cancelled", "completed", "checked_out"].includes(entry.status) &&
        overlaps(
          unavailableStartsAt,
          unavailableEndsAt,
          entry.unavailableStartsAt ?? entry.startsAt,
          entry.unavailableEndsAt ?? entry.endsAt
        )
    );
    if (conflictingReservation) {
      return { ok: false as const, message: `Conflict: ${resource.name} is already reserved for that time.` };
    }

    setReservations((prev) =>
      prev.map((entry) =>
        entry.id === reservationId
          ? {
              ...entry,
              ...updates,
              setupBufferMinutes,
              cleanupBufferMinutes,
              unavailableStartsAt,
              unavailableEndsAt,
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    );
    return { ok: true as const, message: "Reservation updated." };
  };

  const checkInReservation: CustomerStateContextValue["checkInReservation"] = (reservationId, staffUserId, staffName) => {
    const existing = reservations.find((entry) => entry.id === reservationId);
    if (!existing) return { ok: false as const, message: "Reservation not found." };
    setReservations((prev) =>
      prev.map((entry) =>
        entry.id === reservationId
          ? {
              ...entry,
              status: "checked_in",
              checkedInAt: new Date().toISOString(),
              checkedInByStaffId: staffUserId,
              checkedInByStaffName: staffName,
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    );
    return { ok: true as const, message: "Reservation checked in." };
  };

  const checkOutReservation: CustomerStateContextValue["checkOutReservation"] = (reservationId, staffUserId, staffName) => {
    const existing = reservations.find((entry) => entry.id === reservationId);
    if (!existing) return { ok: false as const, message: "Reservation not found." };
    setReservations((prev) =>
      prev.map((entry) =>
        entry.id === reservationId
          ? {
              ...entry,
              status: entry.reservationType === "equipment_checkout" ? "checked_out" : "completed",
              checkedOutAt: new Date().toISOString(),
              checkedOutByStaffId: staffUserId,
              checkedOutByStaffName: staffName,
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    );
    return { ok: true as const, message: "Reservation checked out." };
  };

  const cancelReservation: CustomerStateContextValue["cancelReservation"] = (reservationId) => {
    const existing = reservations.find((entry) => entry.id === reservationId);
    if (!existing) return { ok: false as const, message: "Reservation not found." };
    setReservations((prev) =>
      prev.map((entry) =>
        entry.id === reservationId ? { ...entry, status: "cancelled", updatedAt: new Date().toISOString() } : entry
      )
    );
    return { ok: true as const, message: "Reservation cancelled." };
  };

  const checkOutRecord = (recordId: string, staffUserId: string, staffName?: string) => {
    if (!isActiveDateToday) return { ok: false, message: "Historical check-in logs are read-only." };

    const target = checkInLogRecords.find((entry) => entry.id === recordId);
    if (!target) return { ok: false, message: "Record not found." };

    setCheckInLogRecords((prev) =>
      prev.map((entry) =>
        entry.id === recordId
          ? {
              ...entry,
              status: "checked-out",
              checkOutTime: `${activeDateKey}T18:00:00Z`,
              checkedOutByStaffId: staffUserId,
              checkedOutByStaffName: staffName
            }
          : entry
      )
    );
    setCustomers((prev) => prev.map((entry) => (entry.id === target.customerId ? { ...entry, checkInStatus: "out" } : entry)));
    return { ok: true, message: `Check-in updated for ${target.customerName}.` };
  };

  const checkInCustomer = (
    customerId: string,
    options: {
      staffUserId: string;
      staffName?: string;
      source?: CheckInSource;
      overrideReason?: string;
      customerOverride?: Customer;
      transactionId?: string;
      slotId?: string;
    }
  ) => {
    if (!isActiveDateToday) return { ok: false, message: "Historical check-in logs are read-only." };

    const source = options.source ?? "manual_search";
    if (!options.staffUserId) return { ok: false, message: "Select staff PIN to continue." };
    const customer = options.customerOverride ?? customers.find((entry) => entry.id === customerId);
    if (!customer) return { ok: false, message: "Customer not found." };

    const householdMembership = householdMembers.find((entry) => entry.customerId === customer.id);
    const isDependent = Boolean(
      householdMembership &&
        (householdMembership.memberType === "child" ||
          householdMembership.role === "child" ||
          householdMembership.role === "dependent")
    );
    if (isDependent && !options.overrideReason) {
      const guardianApproved = householdMembers
        .filter((entry) => entry.householdId === householdMembership!.householdId)
        .some((entry) => {
          if (entry.customerId === customer.id) return false;
          if (!entry.canCheckInOthers) return false;
          if (entry.memberType !== "adult" && entry.role !== "guardian" && entry.role !== "primary-adult" && entry.role !== "adult") return false;
          return checkInLogRecords.some(
            (record) =>
              record.customerId === entry.customerId &&
              record.locationId === activeLocationId &&
              record.checkInTime.startsWith(activeDateKey) &&
              record.status === "checked-in"
          );
        });
      if (!guardianApproved) {
        return { ok: false, message: "Guardian approval required before check-in." };
      }
    }

    const existing = checkInLogRecords.find(
      (record) =>
        record.customerId === customerId &&
        record.locationId === activeLocationId &&
        record.checkInTime.startsWith(activeDateKey) &&
        record.status === "checked-in"
    );

    if (existing) {
      return { ok: false, message: `${customer.firstName} ${customer.lastName} is already checked in.` };
    }

    const decision = evaluateCustomerEntry(customer.id);
    const eligibleAccess = getEligibleAccess({
      customer,
      waiver: customer.waiverId ? waivers.find((entry) => entry.id === customer.waiverId) : undefined,
      locationId: activeLocationId,
      dayKey: activeDateKey,
      accessRecords: customerAccessRecords,
      registrations,
      sessions,
      programs,
      allowSessionRegistrationAccess: true
    });
    const slotProduct = options.transactionId && options.slotId
      ? transactions
          .find((entry) => entry.id === options.transactionId)
          ?.checkInSlots?.find((slot) => slot.id === options.slotId)
      : undefined;
    const slotCanGrantAccess = Boolean(
      slotProduct &&
        (slotProduct.accessType === "access" ||
          slotProduct.accessType === "membership" ||
          slotProduct.accessType === "punch-pass" ||
          slotProduct.accessType === "class" ||
          slotProduct.accessType === "camp" ||
          slotProduct.accessType === "comp")
    );
    if (!eligibleAccess.eligible && !options.overrideReason && !slotCanGrantAccess) {
      const detail = [...decision.reasons, ...decision.warnings].filter(Boolean).join(" ");
      const fallback = `${customer.firstName} ${customer.lastName} has no valid access method.`;
      const normalizedDetail = detail.toLowerCase().includes("no valid access") ? `${detail} ${fallback}` : detail || fallback;
      return { ok: false, message: `${decision.headline}. ${normalizedDetail}`.trim() };
    }

    let entryMethod: EntryMethod = "staff_comp";
    let membershipPassType = "Staff/Manual Comp";
    let passProductUsed: string | undefined = "Manual Access Override";
    let punchesUsed: number | undefined;
    let punchesRemaining: number | undefined;

    if (decision.sessionAccess && !slotCanGrantAccess) {
      entryMethod = decision.sessionAccess.programCategory === "camp" ? "camp_registration" : "class_registration";
      membershipPassType = `Registered: ${decision.sessionAccess.sessionTitle}`;
      passProductUsed = "Session Registration";
    } else if (decision.chosenAccess) {
      if (decision.chosenAccess.type === "membership") {
        entryMethod = "membership";
      } else if (decision.chosenAccess.type === "day-pass") {
        entryMethod = "day_pass";
      } else if (decision.chosenAccess.type === "punch-pass") {
        entryMethod = "multi_visit_pass";
      } else {
        entryMethod = "staff_comp";
      }
      const linkedProduct = decision.chosenAccess.productId
        ? accessProducts.find((entry) => entry.id === decision.chosenAccess!.productId)
        : undefined;
      membershipPassType = linkedProduct?.name ?? decision.chosenAccess.notes ?? decision.chosenAccess.type.replace("-", " ");
      passProductUsed = linkedProduct?.name ?? decision.chosenAccess.notes ?? decision.chosenAccess.type.replace("-", " ");
      if (decision.chosenAccess.type === "punch-pass") {
        const current = decision.chosenAccess.remainingPunches ?? 0;
        punchesUsed = 1;
        punchesRemaining = Math.max(current - 1, 0);
        setCustomerAccessRecords((prev) =>
          prev.map((entry) =>
            entry.id === decision.chosenAccess!.id
              ? {
                  ...entry,
                  remainingPunches: punchesRemaining,
                  status: (punchesRemaining ?? 0) <= 0 ? "expired" : entry.status
                }
              : entry
          )
        );
        if (customer.punchPassId) {
          setPunchPasses((prev) =>
            prev.map((entry) =>
              entry.id === customer.punchPassId
                ? { ...entry, remainingUses: punchesRemaining ?? entry.remainingUses }
                : entry
            )
          );
        }
      }
      if (decision.chosenAccess.type === "day-pass") {
        setCustomerAccessRecords((prev) =>
          prev.map((entry) =>
            entry.id === decision.chosenAccess!.id
              ? {
                  ...entry,
                  status: "expired",
                  notes: entry.notes ?? "Day Pass"
                }
              : entry
          )
        );
      }
    } else if (slotCanGrantAccess) {
      const slotLabel = slotProduct?.productName ?? "Sale Access";
      if (slotProduct?.accessType === "membership") entryMethod = "membership";
      else if (slotProduct?.accessType === "punch-pass") entryMethod = "multi_visit_pass";
      else if (slotProduct?.accessType === "class") entryMethod = "class_registration";
      else if (slotProduct?.accessType === "camp") entryMethod = "camp_registration";
      else if (slotProduct?.accessType === "comp") entryMethod = "staff_comp";
      else entryMethod = "day_pass";
      membershipPassType = slotLabel;
      passProductUsed = slotLabel;
    }

    const timestamp = `${activeDateKey}T16:00:00Z`;

    const newRecord: CheckInLogRecord = {
      id: `log_${Math.random().toString(36).slice(2, 9)}`,
      organizationId: customer.organizationId,
      locationId: activeLocationId,
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      membershipPassType,
      entryMethod,
      passProductUsed,
      punchesUsed,
      punchesRemaining,
      checkInTime: timestamp,
      checkOutTime: null,
      checkInSource: source,
      status: "checked-in",
      transactionId: options.transactionId,
      checkedInByStaffId: options.staffUserId,
      checkedInByStaffName: options.staffName,
      overriddenByStaffId: options.overrideReason ? options.staffUserId : undefined,
      overrideReason: options.overrideReason
    };

    setCheckInLogRecords((prev) => [newRecord, ...prev]);
    setCustomers((prev) => prev.map((entry) => (entry.id === customerId ? { ...entry, checkInStatus: "in" } : entry)));
    if (decision.sessionAccess) {
      const matchingRegistration = registrations.find(
        (entry) =>
          entry.customerId === customerId &&
          entry.sessionId === decision.sessionAccess?.sessionId &&
          entry.status !== "cancelled" &&
          entry.status !== "waitlisted"
      );
      if (matchingRegistration) {
        setRegistrations((prev) =>
          prev.map((entry) =>
            entry.id === matchingRegistration.id
              ? {
                  ...entry,
                  status: "checked_in",
                  updatedAt: new Date().toISOString(),
                  updatedByStaffId: options.staffUserId
                }
              : entry
          )
        );
      }
    }

    const accessUsedMessage =
      entryMethod === "membership"
        ? `Checked in using ${membershipPassType}.`
        : entryMethod === "day_pass"
          ? `Checked in using Day Pass${punchesUsed ? " (1 consumed)." : "."}`
          : entryMethod === "multi_visit_pass"
            ? `Checked in using Punch Pass (${(punchesRemaining ?? 0) + 1} \u2192 ${punchesRemaining ?? 0} remaining).`
            : entryMethod === "class_registration" || entryMethod === "camp_registration"
              ? `Checked in using Session Registration.`
              : `Checked in using ${membershipPassType}.`;
    const warningSuffix = decision.warnings.length > 0 ? ` ${decision.warnings.join(" ")}` : "";
    return {
      ok: true,
      message: `Check-in recorded for ${customer.firstName} ${customer.lastName}. ${accessUsedMessage}${warningSuffix}`.trim(),
      recordId: newRecord.id
    };
  };

  const toggleCheckIn = (customerId: string, staffUserId: string) => {
    const existing = checkInLogRecords.find(
      (record) =>
        record.customerId === customerId &&
        record.locationId === activeLocationId &&
        record.checkInTime.startsWith(activeDateKey) &&
        record.status === "checked-in"
    );

    if (existing) checkOutRecord(existing.id, staffUserId);
    else checkInCustomer(customerId, { source: "manual_search", staffUserId });
  };

  const runCustomerCheckInAction = (
    customerId: string,
    options: { staffUserId: string; staffName?: string; source?: CheckInSource; overrideReason?: string }
  ) => {
    const existing = checkInLogRecords.find(
      (record) =>
        record.customerId === customerId &&
        record.locationId === activeLocationId &&
        record.checkInTime.startsWith(activeDateKey) &&
        record.status === "checked-in"
    );

    if (existing) {
      const result = checkOutRecord(existing.id, options.staffUserId, options.staffName);
      return { ...result, action: "check-out" as const };
    }

    const result = checkInCustomer(customerId, options);
    return { ...result, action: "check-in" as const };
  };

  const sellAccessProducts = (options: {
    customerId: string;
    purchaseForCustomerIds?: string[];
    productIds: string[];
    soldByStaffId: string;
    soldByStaffName?: string;
    paymentType?: PaymentMethod;
    paymentProcessor?: string;
    paymentApprovalCode?: string;
    paymentCardLast4?: string;
    checkInAfterSale?: boolean;
    lineItemUnitPriceCents?: number[];
  }) => {
    const customer = customers.find((entry) => entry.id === options.customerId);
    if (!customer) return { ok: false, message: "Customer not found." };
    if (!options.customerId) return { ok: false, message: "Select a customer to complete sale." };
    if (!options.soldByStaffId) return { ok: false, message: "Select staff PIN to continue." };
    if (!options.soldByStaffName) return { ok: false, message: "Staff attribution is required to complete sale." };

    const selectedProducts = options.productIds
      .map((productId) => accessProducts.find((product) => product.id === productId))
      .filter((product): product is PosProduct => Boolean(product));
    if (selectedProducts.length === 0) return { ok: false, message: "Select at least one access product." };

    const targetCustomerIds = Array.from(
      new Set([options.customerId, ...(options.purchaseForCustomerIds ?? [])].filter(Boolean))
    );
    const targetCustomers = customers.filter((entry) => targetCustomerIds.includes(entry.id));
    if (targetCustomers.length === 0) return { ok: false, message: "Select a customer to complete sale." };
    const purchaserHouseholdMembership = householdMembers.find((entry) => entry.customerId === options.customerId);

    let nextCustomer = customer;
    const newAccessRecords: CustomerAccessRecord[] = [];
    let createdPass: PunchPass | null = null;
    let createdMembership: Membership | null = null;

    targetCustomers.forEach((targetCustomer) => {
      selectedProducts.forEach((product) => {
      if (product.category === "day_passes" || product.category === "classes" || product.category === "camps" || product.category === "comps") {
        if (targetCustomer.id === customer.id) {
          nextCustomer = { ...nextCustomer, dayPassProductName: product.name };
        }
        newAccessRecords.push({
          id: `acc_${Math.random().toString(36).slice(2, 9)}`,
          customerId: targetCustomer.id,
          productId: product.id,
          type: product.category === "comps" ? "comp" : "day-pass",
          status: "active",
          startDate: activeDateKey,
          expirationDate: activeDateKey,
          locationsAllowed: [activeLocationId],
          notes: product.name,
          grantedByStaffId: options.soldByStaffId,
          grantedByStaffName: options.soldByStaffName
        });
      }

      if (product.category === "punch_passes" || product.accessBehavior === "punch_decrement") {
        const passId = `pass_${Math.random().toString(36).slice(2, 8)}`;
        createdPass = {
          id: passId,
          customerId: targetCustomer.id,
          title: product.name,
          originalUses: product.punchQuantity ?? 10,
          remainingUses: product.punchQuantity ?? 10,
          expiresAt: "2026-06-30",
          type: "multi_visit",
          usageHistory: []
        };
        if (targetCustomer.id === customer.id) {
          nextCustomer = { ...nextCustomer, punchPassId: passId, dayPassProductName: undefined };
        }
        newAccessRecords.push({
          id: `acc_${Math.random().toString(36).slice(2, 9)}`,
          customerId: targetCustomer.id,
          productId: product.id,
          type: "punch-pass",
          status: "active",
          startDate: activeDateKey,
          expirationDate: "2026-06-30",
          remainingPunches: product.punchQuantity ?? 10,
          locationsAllowed: [activeLocationId],
          notes: product.name,
          grantedByStaffId: options.soldByStaffId,
          grantedByStaffName: options.soldByStaffName
        });
      }

      if (product.category === "memberships" || product.type === "membership") {
        const membershipId = `mem_${Math.random().toString(36).slice(2, 8)}`;
        createdMembership = {
          id: membershipId,
          customerId: targetCustomer.id,
          planName: product.name,
          status: "active",
          purchaseDate: activeDateKey,
          startDate: activeDateKey,
          expirationDate: "2026-06-20",
          renewalDate: "2026-06-20"
        };
        if (targetCustomer.id === customer.id) {
          nextCustomer = { ...nextCustomer, membershipId, dayPassProductName: undefined };
        }
        newAccessRecords.push({
          id: `acc_${Math.random().toString(36).slice(2, 9)}`,
          customerId: targetCustomer.id,
          productId: product.id,
          type: "membership",
          status: "active",
          purchaseDate: activeDateKey,
          startDate: activeDateKey,
          expirationDate: "2026-06-20",
          unlimitedAccess: true,
          locationsAllowed: [activeLocationId],
          notes: product.name,
          grantedByStaffId: options.soldByStaffId,
          grantedByStaffName: options.soldByStaffName
        });
      }
      });
    });

    if (createdPass) setPunchPasses((prev) => [createdPass as PunchPass, ...prev]);
    if (createdMembership) setMemberships((prev) => [createdMembership as Membership, ...prev]);
    if (newAccessRecords.length > 0) setCustomerAccessRecords((prev) => [...newAccessRecords, ...prev]);
    setCustomers((prev) =>
      prev.map((entry) => (entry.id === customer.id ? nextCustomer : entry))
    );

    const cartItems = selectedProducts.map((product, index) => {
      const overrideCents = options.lineItemUnitPriceCents?.[index];
      return normalizeCartItem({
        ...product,
        priceCents: typeof overrideCents === "number" && Number.isFinite(overrideCents) ? overrideCents : product.priceCents
      });
    });
    const invalidCart = cartItems.find((item) => !item.ok);
    if (invalidCart && !invalidCart.ok) {
      return { ok: false, message: invalidCart.message };
    }

    const items: PosTransactionItem[] = cartItems
      .filter((item): item is { ok: true; item: { productId: string; productName: string; category: PosProduct["category"]; type: NonNullable<PosProduct["type"]>; quantity: number; unitPrice: number } } => item.ok)
      .map((item) => createTransactionItem(item.item));

    const { subtotal, total } = calculateTransactionTotals(items);
    const receiptNumber = `R-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const transactionId = `txn_${Math.random().toString(36).slice(2, 9)}`;
    const saleCheckInSlots = expandSaleCheckInSlots(transactionId, selectedProducts, customer);
    const transaction: PosTransaction = {
      id: transactionId,
      organizationId: customer.organizationId,
      locationId: activeLocationId,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      customerMemberId: customer.memberId,
      purchaserCustomerId: customer.id,
      purchaserCustomerName: `${customer.firstName} ${customer.lastName}`,
      purchasedForCustomerIds: targetCustomerIds,
      householdId: purchaserHouseholdMembership?.householdId,
      transactionType: "sale",
      returnStatus: "none",
      soldByStaffId: options.soldByStaffId,
      soldByStaffName: options.soldByStaffName,
      items,
      subtotal,
      total,
      completedAt: `${activeDateKey}T15:30:00Z`,
      paymentType: options.paymentType ?? "mock",
      receiptStatus: (options.paymentType ?? "mock") === "comp" ? "comped" : "paid",
      paymentProcessor: options.paymentProcessor,
      paymentApprovalCode: options.paymentApprovalCode,
      paymentCardLast4: options.paymentCardLast4,
      checkInTriggered: Boolean(options.checkInAfterSale),
      receiptNumber,
      checkInSlots: saleCheckInSlots
    };
    setTransactions((prev) => [transaction, ...prev]);

    if (options.checkInAfterSale) {
      const firstSlot = saleCheckInSlots[0];
      const checkInResult = firstSlot
        ? checkInCustomer(firstSlot.assignedCustomerId ?? customer.id, {
            staffUserId: options.soldByStaffId,
            staffName: options.soldByStaffName,
            source: "pos_sale",
            customerOverride: nextCustomer,
            transactionId: transaction.id,
            slotId: firstSlot.id
          })
        : checkInCustomer(customer.id, {
        staffUserId: options.soldByStaffId,
        staffName: options.soldByStaffName,
        source: "pos_sale",
        customerOverride: nextCustomer,
        transactionId: transaction.id
      });

      if (firstSlot && checkInResult.ok) {
        setTransactions((prev) =>
          prev.map((entry) =>
            entry.id !== transaction.id
              ? entry
              : {
                  ...entry,
                  checkInSlots: (entry.checkInSlots ?? []).map((slot) =>
                    slot.id === firstSlot.id
                      ? {
                          ...slot,
                          status: "checked-in",
                          checkedInAt: `${activeDateKey}T16:00:00Z`,
                          checkedInByStaffId: options.soldByStaffId,
                          checkedInByStaffName: options.soldByStaffName,
                          assignedCustomerId: firstSlot.assignedCustomerId ?? customer.id,
                          assignedCustomerName: firstSlot.assignedCustomerName ?? `${customer.firstName} ${customer.lastName}`
                        }
                      : slot
                  )
                }
          )
        );
      }

      if (!checkInResult.ok) {
        return {
          ok: true,
          message: `Sale completed for ${customer.firstName} ${customer.lastName}. Check-in blocked: ${checkInResult.message}`,
          transactionId: transaction.id,
          transaction
        };
      }
    }

    return {
      ok: true,
      message: `Sale completed for ${customer.firstName} ${customer.lastName}.`,
      transactionId: transaction.id,
      transaction
    };
  };

  const refundTransaction = (options: {
    transactionId: string;
    amount?: number;
    itemProductIds?: string[];
    reason: string;
    staffId: string;
    staffName?: string;
  }) => {
    const reason = options.reason.trim();
    if (!reason) return { ok: false, message: "Refund reason is required." };
    const original = transactions.find((entry) => entry.id === options.transactionId);
    if (!original) return { ok: false, message: "Transaction not found." };
    if (original.transactionType !== "sale") return { ok: false, message: "Only sale transactions can be refunded." };

    const targetItems = (options.itemProductIds?.length
      ? original.items.filter((item) => options.itemProductIds?.includes(item.productId))
      : original.items
    ).map((item) => ({ ...item }));

    if (targetItems.length === 0) return { ok: false, message: "No refundable items selected." };
    const maxRefund = Number(targetItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const requested = typeof options.amount === "number" && Number.isFinite(options.amount) && options.amount > 0
      ? Number(options.amount.toFixed(2))
      : maxRefund;
    if (requested > maxRefund) return { ok: false, message: "Refund amount exceeds selected line items." };

    const refundId = `txn_ref_${Math.random().toString(36).slice(2, 9)}`;
    const refundReceipt = `R-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const refundTx: PosTransaction = {
      id: refundId,
      organizationId: original.organizationId,
      locationId: original.locationId,
      customerId: original.customerId,
      customerName: original.customerName,
      customerEmail: original.customerEmail,
      customerMemberId: original.customerMemberId,
      purchaserCustomerId: original.purchaserCustomerId ?? original.customerId,
      purchaserCustomerName: original.purchaserCustomerName ?? original.customerName,
      purchasedForCustomerIds: original.purchasedForCustomerIds ?? [original.customerId],
      householdId: original.householdId,
      transactionType: "return",
      originalTransactionId: original.id,
      returnStatus: "none",
      soldByStaffId: options.staffId,
      soldByStaffName: options.staffName,
      items: targetItems,
      subtotal: -requested,
      total: -requested,
      completedAt: new Date().toISOString(),
      paymentType: original.paymentType,
      receiptStatus: "refunded",
      paymentProcessor: original.paymentProcessor,
      paymentApprovalCode: original.paymentApprovalCode,
      paymentCardLast4: original.paymentCardLast4,
      checkInTriggered: false,
      receiptNumber: refundReceipt,
      refundReason: reason
    };

    setTransactions((prev) => {
      const next = prev.map((entry) => {
        if (entry.id !== original.id) return entry;
        const totalRefunded = Number(((entry.refundedTotal ?? 0) + requested).toFixed(2));
        return {
          ...entry,
          refundedTotal: totalRefunded,
          receiptStatus: (totalRefunded >= entry.total ? "refunded" : "partially_refunded") as
            | "refunded"
            | "partially_refunded",
          returnStatus: (totalRefunded >= entry.total ? "fully_returned" : "partially_returned") as
            | "fully_returned"
            | "partially_returned"
        };
      });
      return [refundTx, ...next];
    });

    return { ok: true, message: `Refunded $${requested.toFixed(2)}.`, refundTransaction: refundTx };
  };

  const assignSaleCheckInSlotCustomer = (transactionId: string, slotId: string, customerId: string) => {
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) return { ok: false, message: "Customer not found." };
    let updated = false;
    setTransactions((prev) =>
      prev.map((entry) => {
        if (entry.id !== transactionId) return entry;
        return {
          ...entry,
          checkInSlots: (entry.checkInSlots ?? []).map((slot) => {
            if (slot.id !== slotId || slot.status !== "available") return slot;
            updated = true;
            return {
              ...slot,
              assignedCustomerId: customer.id,
              assignedCustomerName: `${customer.firstName} ${customer.lastName}`
            };
          })
        };
      })
    );
    if (!updated) return { ok: false, message: "Slot not available." };
    return { ok: true, message: "Check-in slot assigned." };
  };

  const fulfillSaleCheckInSlot = (
    transactionId: string,
    slotId: string,
    options: { staffUserId: string; staffName?: string; overrideReason?: string }
  ) => {
    const transaction = transactions.find((entry) => entry.id === transactionId);
    if (!transaction) return { ok: false, message: "Transaction not found." };
    const slot = transaction.checkInSlots?.find((entry) => entry.id === slotId);
    if (!slot) return { ok: false, message: "Check-in slot not found." };
    if (slot.status !== "available") return { ok: false, message: "Check-in slot has already been fulfilled." };
    if (!slot.assignedCustomerId) {
      return { ok: false, message: "Create or select a customer to check in." };
    }
    if (!options.staffUserId) return { ok: false, message: "Select staff PIN to continue." };

    const checkInResult = checkInCustomer(slot.assignedCustomerId, {
      staffUserId: options.staffUserId,
      staffName: options.staffName,
      source: "pos_sale",
      transactionId: transaction.id,
      slotId: slot.id,
      overrideReason: options.overrideReason
    });

    if (!checkInResult.ok) return checkInResult;

    const latestRecord = checkInLogRecords.find(
      (entry) =>
        entry.transactionId === transaction.id &&
        entry.customerId === slot.assignedCustomerId &&
        entry.status === "checked-in"
    );
    setTransactions((prev) =>
      prev.map((entry) =>
        entry.id !== transaction.id
          ? entry
          : {
              ...entry,
              checkInSlots: (entry.checkInSlots ?? []).map((slotEntry) =>
                slotEntry.id !== slot.id
                  ? slotEntry
                  : {
                      ...slotEntry,
                      status: "checked-in",
                      checkedInAt: `${activeDateKey}T16:00:00Z`,
                      checkedInByStaffId: options.staffUserId,
                      checkedInByStaffName: options.staffName,
                      checkInRecordId: latestRecord?.id
                    }
              )
            }
      )
    );

    return { ok: true, message: checkInResult.message };
  };

  const addCustomer = (input: {
    firstName: string;
    lastName: string;
    preferredName?: string;
    pronouns?: string;
    customPronouns?: string;
    dateOfBirth?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    profilePhotoUrl?: string;
    waiverStatus?: "valid" | "missing" | "expired";
    waiverSignedToday?: boolean;
    relatedCustomerId?: string;
    relationshipType?: CustomerRelationshipType;
    relationshipNotes?: string;
    createdByStaffId?: string;
    createdByStaffName?: string;
  }) => {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) return { ok: false, message: "First and last name are required." };
    const dateOfBirth = input.dateOfBirth?.trim() ?? "";
    const phone = input.phone?.trim() ?? "";
    const addressLine1 = normalizeStreetAddress(input.addressLine1?.trim() ?? "");
    const city = normalizeCity(input.city?.trim() ?? "");
    const state = normalizeStateInput(input.state?.trim() ?? "");
    const postalCode = input.postalCode?.trim() ?? "";
    const emergencyContactName = input.emergencyContactName?.trim() ?? "";
    const emergencyContactPhone = input.emergencyContactPhone?.trim() ?? "";
    const email = input.email?.trim() ?? "";

    if (!dateOfBirth) return { ok: false, message: "Date of birth is required." };
    if (!phone) return { ok: false, message: "Phone is required." };
    if (!addressLine1) return { ok: false, message: "Address line 1 is required." };
    if (!city) return { ok: false, message: "City is required." };
    if (!state) return { ok: false, message: "State is required." };
    if (!postalCode) return { ok: false, message: "ZIP/postal code is required." };
    if (!emergencyContactName) return { ok: false, message: "Emergency contact name is required." };
    if (!emergencyContactPhone) return { ok: false, message: "Emergency contact phone is required." };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Enter a valid email address." };
    if (!/^[0-9()+\-\s]{7,}$/.test(phone)) return { ok: false, message: "Enter a valid phone number." };
    if (!/^[0-9()+\-\s]{7,}$/.test(emergencyContactPhone)) return { ok: false, message: "Enter a valid emergency contact phone number." };
    const dobDate = new Date(`${dateOfBirth}T00:00:00Z`);
    const now = new Date();
    const minDate = new Date("1900-01-01T00:00:00Z");
    if (Number.isNaN(dobDate.getTime()) || dobDate > now || dobDate < minDate) {
      return { ok: false, message: "Enter a reasonable date of birth." };
    }
    const maxMemberNumber = customers.reduce((max, customer) => {
      const value = Number(customer.memberId.replace("M-", ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 1000);

    const id = `cust_${Math.random().toString(36).slice(2, 9)}`;
    const newCustomer: Customer = {
      id,
      memberId: `M-${maxMemberNumber + 1}`,
      organizationId: activeOrgId,
      locationId: activeLocationId,
      firstName,
      lastName,
      preferredName: input.preferredName?.trim() || undefined,
      pronouns: input.pronouns?.trim() || undefined,
      customPronouns: input.customPronouns?.trim() || undefined,
      email,
      phone,
      dateOfBirth,
      addressLine1,
      addressLine2: input.addressLine2?.trim() || undefined,
      city,
      state,
      postalCode,
      emergencyContactName,
      emergencyContactPhone,
      profilePhotoUrl: input.profilePhotoUrl?.trim() || undefined,
      tags: [],
      checkInStatus: "out",
      communicationPreferences: DEFAULT_COMMUNICATION_PREFERENCES,
      notes: input.notes?.trim() || "",
      updatedByStaffId: input.createdByStaffId,
      updatedByStaffName: input.createdByStaffName,
      updatedAt: new Date().toISOString()
    };

    const waiverStatus = input.waiverSignedToday ? "valid" : (input.waiverStatus ?? "missing");
    if (waiverStatus !== "missing") {
      const waiverId = `wav_${Math.random().toString(36).slice(2, 9)}`;
      newCustomer.waiverId = waiverId;
      const signedAt = input.waiverSignedToday ? `${activeDateKey}T12:00:00Z` : undefined;
      const waiver: Waiver = {
        id: waiverId,
        customerId: id,
        status: waiverStatus,
        signedAt,
        expiresAt: waiverStatus === "valid" ? addDays(activeDateKey, 365) : undefined,
        signedByStaffId: signedAt ? input.createdByStaffId : undefined,
        updatedByStaffId: input.createdByStaffId,
        updatedByStaffName: input.createdByStaffName
      };
      setWaivers((prev) => [waiver, ...prev]);
    }

    if (input.relatedCustomerId && input.relationshipType) {
      newCustomer.relatedCustomers = [
        {
          relatedCustomerId: input.relatedCustomerId,
          relationshipType: input.relationshipType,
          notes: input.relationshipNotes?.trim() || undefined
        }
      ];
    }

    setCustomers((prev) => [newCustomer, ...prev]);
    return { ok: true, message: `Customer created: ${firstName} ${lastName}.`, customerId: id };
  };

  const addStaffProfileToCustomer = (input: {
    customerId: string;
    staffId: string;
    role: StaffRole;
    status: "active" | "inactive" | "on_leave";
    staffPin: string;
    locations: string[];
    assignedPrograms?: string[];
    permissions?: StaffPermission[];
    startDate?: string;
    certifications?: string[];
    staffNotes?: string;
  }) => {
    if (!input.staffId.trim()) return { ok: false as const, message: "Staff ID is required." };
    if (!input.staffPin.trim()) return { ok: false as const, message: "Staff PIN is required." };
    if (input.locations.length === 0) return { ok: false as const, message: "At least one location is required." };

    let foundCustomer = false;
    let alreadyStaff = false;
    setCustomers((prev) =>
      prev.map((entry) => {
        if (entry.id !== input.customerId) return entry;
        foundCustomer = true;
        if (entry.staffProfile?.isStaff) {
          alreadyStaff = true;
          return entry;
        }
        return {
          ...entry,
          staffProfile: {
            isStaff: true,
            staffId: input.staffId.trim(),
            role: input.role,
            status: input.status,
            staffPin: input.staffPin.trim(),
            locations: input.locations,
            assignedPrograms: input.assignedPrograms ?? [],
            permissions: input.permissions ?? [],
            startDate: input.startDate,
            certifications: input.certifications ?? [],
            staffNotes: input.staffNotes,
            lastActive: entry.staffProfile?.lastActive
          }
        };
      })
    );
    if (!foundCustomer) return { ok: false as const, message: "Customer not found." };
    if (alreadyStaff) return { ok: false as const, message: "Customer is already staff." };
    return { ok: true as const, message: "Staff profile added." };
  };

  const updateStaffProfileForCustomer = (input: {
    customerId: string;
    role: StaffRole;
    status: "active" | "inactive" | "on_leave";
    staffPin: string;
    locations: string[];
    assignedPrograms?: string[];
    permissions?: StaffPermission[];
    startDate?: string;
    certifications?: string[];
    staffNotes?: string;
  }) => {
    const customer = customers.find((entry) => entry.id === input.customerId);
    if (!customer) return { ok: false as const, message: "Customer not found." };
    if (!customer.staffProfile?.isStaff) return { ok: false as const, message: "Customer is not staff." };
    if (!input.staffPin.trim()) return { ok: false as const, message: "Staff PIN is required." };
    if (input.locations.length === 0) return { ok: false as const, message: "At least one location is required." };

    setCustomers((prev) =>
      prev.map((entry) =>
        entry.id !== input.customerId
          ? entry
          : {
              ...entry,
              staffProfile: {
                ...entry.staffProfile!,
                role: input.role,
                status: input.status,
                staffPin: input.staffPin.trim(),
                locations: input.locations,
                assignedPrograms: input.assignedPrograms ?? [],
                permissions: input.permissions ?? [],
                startDate: input.startDate,
                certifications: input.certifications ?? [],
                staffNotes: input.staffNotes
              }
            }
      )
    );
    return { ok: true as const, message: "Staff profile updated." };
  };

  const clearStaffProfileForCustomer = (customerId: string) => {
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) return { ok: false as const, message: "Customer not found." };
    if (!customer.staffProfile?.isStaff) return { ok: false as const, message: "Customer is not staff." };
    setCustomers((prev) =>
      prev.map((entry) =>
        entry.id !== customerId
          ? entry
          : {
              ...entry,
              staffProfile: undefined
            }
      )
    );
    return { ok: true as const, message: "Staff profile removed." };
  };

  const updateCustomerProfile = (input: {
    customerId: string;
    firstName: string;
    lastName: string;
    preferredName: string;
    dateOfBirth: string;
    pronouns?: string;
    customPronouns?: string;
    memberId: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    profilePhotoUrl?: string;
    updatedByStaffId: string;
    updatedByStaffName?: string;
  }) => {
    const customer = customers.find((entry) => entry.id === input.customerId);
    if (!customer) return { ok: false as const, message: "Customer not found." };
    if (!input.updatedByStaffId) return { ok: false as const, message: "Select staff PIN to continue." };

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const preferredName = input.preferredName.trim();
    const dateOfBirth = input.dateOfBirth.trim();
    const addressLine1 = input.addressLine1?.trim() ?? "";
    const city = input.city?.trim() ?? "";
    const state = input.state?.trim() ?? "";
    const postalCode = input.postalCode?.trim() ?? "";
    const emergencyContactName = input.emergencyContactName?.trim() ?? "";
    const emergencyContactPhone = input.emergencyContactPhone?.trim() ?? "";
    const memberId = input.memberId.trim();
    const email = input.email?.trim() ?? "";
    const phone = input.phone?.trim() ?? "";

    if (!firstName) return { ok: false as const, message: "First name is required." };
    if (!lastName) return { ok: false as const, message: "Last name is required." };
    if (!preferredName) return { ok: false as const, message: "Preferred name is required." };
    if (!dateOfBirth) return { ok: false as const, message: "Date of birth is required." };
    if (!memberId) return { ok: false as const, message: "Member ID is required." };
    if (!phone) return { ok: false as const, message: "Phone is required." };
    if (!addressLine1) return { ok: false as const, message: "Address line 1 is required." };
    if (!city) return { ok: false as const, message: "City is required." };
    if (!state) return { ok: false as const, message: "State is required." };
    if (!postalCode) return { ok: false as const, message: "ZIP/postal code is required." };
    if (!isValidUsState(state)) return { ok: false as const, message: "Enter a valid 2-letter US state code." };
    if (!emergencyContactName) return { ok: false as const, message: "Emergency contact name is required." };
    if (!emergencyContactPhone) return { ok: false as const, message: "Emergency contact phone is required." };

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false as const, message: "Enter a valid email address." };
    }
    if (phone && !/^[0-9()+\-\s]{7,}$/.test(phone)) {
      return { ok: false as const, message: "Enter a valid phone number." };
    }
    const dobDate = new Date(`${dateOfBirth}T00:00:00Z`);
    const now = new Date();
    const minDate = new Date("1900-01-01T00:00:00Z");
    if (Number.isNaN(dobDate.getTime()) || dobDate > now || dobDate < minDate) {
      return { ok: false as const, message: "Enter a reasonable date of birth." };
    }

    const memberTaken = customers.some(
      (entry) => entry.id !== input.customerId && entry.memberId.trim().toLowerCase() === memberId.toLowerCase()
    );
    if (memberTaken) return { ok: false as const, message: "Member ID must be unique." };

    const updatedAt = new Date().toISOString();
    setCustomers((prev) =>
      prev.map((entry) =>
        entry.id !== input.customerId
          ? entry
          : {
              ...entry,
              firstName,
              lastName,
              preferredName,
              pronouns: input.pronouns?.trim() || undefined,
              customPronouns: input.customPronouns?.trim() || undefined,
              memberId,
              email,
              phone,
              dateOfBirth,
              addressLine1: addressLine1 || undefined,
              addressLine2: input.addressLine2?.trim() || undefined,
              city: city || undefined,
              state: state || undefined,
              postalCode: postalCode || undefined,
              emergencyContactName: emergencyContactName || undefined,
              emergencyContactPhone: emergencyContactPhone || undefined,
              notes: input.notes?.trim() || undefined,
              profilePhotoUrl: input.profilePhotoUrl?.trim() || undefined,
              profilePhotoUpdatedAt: input.profilePhotoUrl?.trim() !== entry.profilePhotoUrl ? updatedAt : entry.profilePhotoUpdatedAt,
              profilePhotoUpdatedByStaffId:
                input.profilePhotoUrl?.trim() !== entry.profilePhotoUrl ? input.updatedByStaffId : entry.profilePhotoUpdatedByStaffId,
              profilePhotoUpdatedBy:
                input.profilePhotoUrl?.trim() !== entry.profilePhotoUrl ? input.updatedByStaffName : entry.profilePhotoUpdatedBy,
              updatedByStaffId: input.updatedByStaffId,
              updatedByStaffName: input.updatedByStaffName,
              updatedAt
            }
      )
    );

    return { ok: true as const, message: "Profile updated." };
  };

  const updateCustomerPhoto: CustomerStateContextValue["updateCustomerPhoto"] = (input) => {
    if (!input.updatedByStaffId) return { ok: false, message: "Select staff PIN to continue." };
    const customer = customers.find((entry) => entry.id === input.customerId);
    if (!customer) return { ok: false, message: "Customer not found." };
    const updatedAt = new Date().toISOString();
    const nextPhoto = input.profilePhotoUrl?.trim() || undefined;
    setCustomers((prev) =>
      prev.map((entry) =>
        entry.id !== input.customerId
          ? entry
          : {
              ...entry,
              profilePhotoUrl: nextPhoto,
              profilePhotoUpdatedAt: updatedAt,
              profilePhotoUpdatedByStaffId: input.updatedByStaffId,
              profilePhotoUpdatedBy: input.updatedByStaffName,
              updatedByStaffId: input.updatedByStaffId,
              updatedByStaffName: input.updatedByStaffName,
              updatedAt
            }
      )
    );
    return { ok: true, message: nextPhoto ? "Profile photo updated." : "Profile photo removed." };
  };

  const updateCustomerCommunicationPreferences: CustomerStateContextValue["updateCustomerCommunicationPreferences"] = (
    customerId,
    updates
  ) => {
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) return { ok: false, message: "Customer not found." };
    setCustomers((prev) =>
      prev.map((entry) =>
        entry.id !== customerId
          ? entry
          : {
              ...entry,
              communicationPreferences: {
                ...DEFAULT_COMMUNICATION_PREFERENCES,
                ...(entry.communicationPreferences ?? {}),
                ...updates
              }
            }
      )
    );
    return { ok: true, message: "Communication preferences updated." };
  };

  const adjustBillingCredit: CustomerStateContextValue["adjustBillingCredit"] = (input) => {
    const account = billingAccounts.find((entry) => entry.id === input.billingAccountId);
    if (!account) return { ok: false, message: "Billing account not found." };
    const destinationAccount =
      input.action === "transfer_out" && input.transferBillingAccountId
        ? billingAccounts.find((entry) => entry.id === input.transferBillingAccountId)
        : undefined;
    if (input.action === "transfer_out" && input.transferBillingAccountId && !destinationAccount) {
      return { ok: false, message: "Destination billing account not found." };
    }
    const amountCents = Math.abs(Math.round(input.amountCents));
    if (!amountCents) return { ok: false, message: "Enter a credit amount greater than zero." };
    if ((input.action === "remove" || input.action === "apply" || input.action === "transfer_out") && account.availableCreditCents < amountCents) {
      return { ok: false, message: "Not enough available credit on this account." };
    }

    const createdAt = new Date().toISOString();
    const creditEntryId = `billcred_${Math.random().toString(36).slice(2, 9)}`;
    const increaseCredit = input.action === "add" || input.action === "transfer_in" || input.action === "refund";
    const reduceDue = input.action === "add" || input.action === "transfer_in" || input.action === "refund" || input.action === "apply";

    setBillingAccounts((prev) =>
      prev.map((entry) => {
        if (entry.id !== input.billingAccountId) return entry;
        const availableCreditCents = increaseCredit
          ? entry.availableCreditCents + amountCents
          : entry.availableCreditCents - amountCents;
        const currentBalanceCents = reduceDue
          ? entry.currentBalanceCents + amountCents
          : entry.currentBalanceCents - amountCents;
        return {
          ...entry,
          availableCreditCents: Math.max(0, availableCreditCents),
          currentBalanceCents,
          status: getBillingAccountStatus(currentBalanceCents, Math.max(0, availableCreditCents)),
          updatedAt: createdAt
        };
      })
    );

    const primaryEntry: BillingCreditEntry = {
      id: creditEntryId,
      organizationId: activeOrgId,
      billingAccountId: input.billingAccountId,
      amountCents,
      action: input.action,
      reason: input.reason.trim(),
      transferBillingAccountId: input.transferBillingAccountId,
      invoiceId: input.invoiceId,
      customerId: input.customerId,
      householdId: input.householdId,
      createdAt,
      createdByStaffId: input.createdByStaffId,
      createdByStaffName: input.createdByStaffName
    };

    const extraEntries: BillingCreditEntry[] = [];
    if (input.action === "transfer_out" && input.transferBillingAccountId) {
      setBillingAccounts((prev) =>
        prev.map((entry) => {
          if (entry.id !== input.transferBillingAccountId) return entry;
          const availableCreditCents = entry.availableCreditCents + amountCents;
          const currentBalanceCents = entry.currentBalanceCents + amountCents;
          return {
            ...entry,
            availableCreditCents,
            currentBalanceCents,
            status: getBillingAccountStatus(currentBalanceCents, availableCreditCents),
            updatedAt: createdAt
          };
        })
      );
      extraEntries.push({
        id: `billcred_${Math.random().toString(36).slice(2, 9)}`,
        organizationId: activeOrgId,
        billingAccountId: input.transferBillingAccountId,
        amountCents,
        action: "transfer_in",
        reason: `Transfer from ${account.id}: ${input.reason.trim()}`,
        transferBillingAccountId: input.billingAccountId,
        createdAt,
        createdByStaffId: input.createdByStaffId,
        createdByStaffName: input.createdByStaffName
      });
    }

    setBillingCreditEntries((prev) => [primaryEntry, ...extraEntries, ...prev]);
    return { ok: true, message: "Billing credit updated.", creditEntryId };
  };

  const createBillingStatement: CustomerStateContextValue["createBillingStatement"] = (input) => {
    const account = billingAccounts.find((entry) => entry.id === input.billingAccountId);
    if (!account) return { ok: false, message: "Billing account not found." };
    const invoices = billingInvoices.filter(
      (entry) =>
        entry.billingAccountId === input.billingAccountId &&
        entry.issueDate >= input.periodStart &&
        entry.issueDate <= input.periodEnd
    );
    const credits = billingCreditEntries
      .filter(
        (entry) =>
          entry.billingAccountId === input.billingAccountId &&
          entry.createdAt.slice(0, 10) >= input.periodStart &&
          entry.createdAt.slice(0, 10) <= input.periodEnd
      )
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const refunds = billingRefunds
      .filter(
        (entry) =>
          entry.billingAccountId === input.billingAccountId &&
          entry.createdAt.slice(0, 10) >= input.periodStart &&
          entry.createdAt.slice(0, 10) <= input.periodEnd
      )
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const chargesCents = invoices.reduce((sum, entry) => sum + entry.totalCents, 0);
    const paymentsCents = invoices.reduce((sum, entry) => sum + Math.max(entry.totalCents - entry.balanceCents - entry.appliedCreditCents, 0), 0);
    const statement: BillingStatement = {
      id: `stmt_${Math.random().toString(36).slice(2, 9)}`,
      organizationId: activeOrgId,
      billingAccountId: input.billingAccountId,
      statementNumber: `STMT-${new Date().getUTCFullYear()}-${String(billingStatements.length + 1).padStart(3, "0")}`,
      statementDate: activeDateKey,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      invoiceIds: invoices.map((entry) => entry.id),
      chargesCents,
      creditsCents: credits,
      paymentsCents,
      refundsCents: refunds,
      balanceCents: Math.abs(account.currentBalanceCents),
      customerId: input.customerId,
      householdId: input.householdId,
      createdAt: new Date().toISOString()
    };
    const issued = invoiceProvider.generateStatement({ statement });
    if (!issued.ok) return { ok: false, message: issued.message };
    setBillingStatements((prev) => [statement, ...prev]);
    return { ok: true, message: "Billing statement created.", statementId: statement.id };
  };

  const markBillingInvoicePaid: CustomerStateContextValue["markBillingInvoicePaid"] = (invoiceId, options) => {
    const invoice = billingInvoices.find((entry) => entry.id === invoiceId);
    if (!invoice) return { ok: false, message: "Invoice not found." };
    const paidAt = new Date().toISOString();
    const balanceDelta = invoice.balanceCents;

    setBillingInvoices((prev) =>
      prev.map((entry) =>
        entry.id !== invoiceId
          ? entry
          : {
              ...entry,
              status: "paid",
              balanceCents: 0,
              updatedAt: paidAt
            }
      )
    );

    setBillingAccounts((prev) =>
      prev.map((entry) => {
        if (entry.id !== invoice.billingAccountId) return entry;
        const currentBalanceCents = entry.currentBalanceCents + balanceDelta;
        return {
          ...entry,
          currentBalanceCents,
          status: getBillingAccountStatus(currentBalanceCents, entry.availableCreditCents),
          updatedAt: paidAt
        };
      })
    );

    return { ok: true, message: "Invoice marked paid." };
  };

  const retryMembershipRenewal: CustomerStateContextValue["retryMembershipRenewal"] = (renewalId, options) => {
    const renewal = membershipRenewals.find((entry) => entry.id === renewalId);
    if (!renewal) return { ok: false, message: "Renewal not found." };
    const account = billingAccounts.find((entry) => entry.id === renewal.billingAccountId);
    if (!account) return { ok: false, message: "Billing account not found." };

    setMembershipRenewals((prev) =>
      prev.map((entry) =>
        entry.id !== renewalId
          ? entry
          : {
              ...entry,
              status: "processing",
              processedAt: new Date().toISOString(),
              createdByStaffId: options?.createdByStaffId ?? entry.createdByStaffId,
              createdByStaffName: options?.createdByStaffName ?? entry.createdByStaffName
            }
      )
    );

    const processed = billingProvider.processRenewal({ renewal, account });
    if (!processed.ok) {
      setMembershipRenewals((prev) =>
        prev.map((entry) =>
          entry.id !== renewalId
            ? entry
            : {
                ...entry,
                status: "failed",
                failureReason: processed.message,
                processedAt: processed.processedAt
              }
        )
      );
      return { ok: false, message: processed.message };
    }

    setMembershipRenewals((prev) =>
      prev.map((entry) =>
        entry.id !== renewalId
          ? entry
          : {
              ...entry,
              status: "succeeded",
              failureReason: undefined,
              nextRetryAt: undefined,
              processedAt: processed.processedAt
            }
      )
    );

    if (renewal.invoiceId) {
      markBillingInvoicePaid(renewal.invoiceId, {
        createdByStaffId: options?.createdByStaffId,
        createdByStaffName: options?.createdByStaffName,
        paymentMethodType: "credit_card"
      });
    }

    const membership = memberships.find((entry) => entry.id === renewal.membershipId);
    if (membership) {
      const nextDate = getNextRenewalDate(renewal.renewalDate, renewal.billingFrequency);
      setMemberships((prev) =>
        prev.map((entry) =>
          entry.id !== renewal.membershipId
            ? entry
            : {
                ...entry,
                status: "active",
                renewalDate: nextDate,
                expirationDate: nextDate
              }
        )
      );
      setCustomerAccessRecords((prev) =>
        prev.map((entry) =>
          entry.customerId === membership.customerId &&
          entry.notes === membership.planName
            ? {
                ...entry,
                status: "active",
                expirationDate: nextDate,
                updatedAt: processed.processedAt,
                updatedByStaffId: options?.createdByStaffId,
                updatedByStaffName: options?.createdByStaffName
              }
            : entry
        )
      );
    }

    return { ok: true, message: "Renewal retried successfully." };
  };

  const grantTemporaryAccessForRenewal: CustomerStateContextValue["grantTemporaryAccessForRenewal"] = (renewalId, untilDate, options) => {
    const renewal = membershipRenewals.find((entry) => entry.id === renewalId);
    if (!renewal) return { ok: false, message: "Renewal not found." };
    const renewalMembership = memberships.find((membership) => membership.id === renewal.membershipId);
    const timestamp = new Date().toISOString();
    setMembershipRenewals((prev) =>
      prev.map((entry) =>
        entry.id !== renewalId
          ? entry
          : {
              ...entry,
              grantTemporaryAccessUntil: untilDate,
              createdByStaffId: options?.createdByStaffId ?? entry.createdByStaffId,
              createdByStaffName: options?.createdByStaffName ?? entry.createdByStaffName,
              processedAt: timestamp
            }
      )
    );
    setCustomerAccessRecords((prev) =>
      prev.map((entry) =>
        entry.customerId === renewal.customerId && entry.notes === renewalMembership?.planName
          ? {
              ...entry,
              status: "active",
              expirationDate: untilDate,
              updatedAt: timestamp,
              updatedByStaffId: options?.createdByStaffId,
              updatedByStaffName: options?.createdByStaffName,
              notes: `${entry.notes ? `${entry.notes}\n` : ""}Temporary billing access through ${untilDate}`
            }
          : entry
      )
    );
    return { ok: true, message: "Temporary access granted." };
  };

  const createBillingRefund: CustomerStateContextValue["createBillingRefund"] = (input) => {
    const account = billingAccounts.find((entry) => entry.id === input.billingAccountId);
    if (!account) return { ok: false, message: "Billing account not found." };
    const amountCents = Math.abs(Math.round(input.amountCents));
    if (!amountCents) return { ok: false, message: "Enter a refund amount greater than zero." };
    const refund: BillingRefundRecord = {
      id: `billrefund_${Math.random().toString(36).slice(2, 9)}`,
      organizationId: activeOrgId,
      billingAccountId: input.billingAccountId,
      amountCents,
      type: input.type,
      reason: input.reason.trim(),
      relatedReceiptId: input.relatedReceiptId,
      relatedInvoiceId: input.relatedInvoiceId,
      createdAt: new Date().toISOString(),
      createdByStaffId: input.createdByStaffId,
      createdByStaffName: input.createdByStaffName
    };
    const issued = refundProvider.issueRefund({ refund });
    if (!issued.ok) return { ok: false, message: issued.message };
    setBillingRefunds((prev) => [refund, ...prev]);

    if (input.type === "store_credit") {
      adjustBillingCredit({
        billingAccountId: input.billingAccountId,
        amountCents,
        action: "refund",
        reason: input.reason,
        createdByStaffId: input.createdByStaffId,
        createdByStaffName: input.createdByStaffName
      });
    }

    return { ok: true, message: "Refund recorded.", refundId: refund.id };
  };

  const addCustomerRelationship = (
    customerId: string,
    input: { relatedCustomerId: string; relationshipType: CustomerRelationshipType; notes?: string }
  ) => {
    const customer = customers.find((entry) => entry.id === customerId);
    const related = customers.find((entry) => entry.id === input.relatedCustomerId);
    if (!customer || !related) return { ok: false as const, message: "Customer not found." };
    if (customerId === input.relatedCustomerId) return { ok: false as const, message: "Cannot relate a customer to themselves." };
    const exists = (customer.relatedCustomers ?? []).some((entry) => entry.relatedCustomerId === input.relatedCustomerId);
    if (exists) return { ok: false as const, message: "Relationship already exists." };

    setCustomers((prev) =>
      prev.map((entry) =>
        entry.id !== customerId
          ? entry
          : {
              ...entry,
              relatedCustomers: [
                ...(entry.relatedCustomers ?? []),
                {
                  relatedCustomerId: input.relatedCustomerId,
                  relationshipType: input.relationshipType,
                  notes: input.notes?.trim() || undefined
                }
              ]
            }
      )
    );
    return { ok: true as const, message: "Related customer added." };
  };

  const removeCustomerRelationship = (customerId: string, relatedCustomerId: string) => {
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) return { ok: false as const, message: "Customer not found." };
    setCustomers((prev) =>
      prev.map((entry) =>
        entry.id !== customerId
          ? entry
          : {
              ...entry,
              relatedCustomers: (entry.relatedCustomers ?? []).filter((relationship) => relationship.relatedCustomerId !== relatedCustomerId)
            }
      )
    );
    return { ok: true as const, message: "Relationship removed." };
  };

  const createSession = (input: {
    programId: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    title?: string;
    locationId?: string;
    instructorName?: string;
    instructorStaffId?: string;
    waitlistEnabled?: boolean;
    notes?: string;
    updatedByStaffId?: string;
    seriesId?: string;
    recurrenceRule?: string;
  }) => {
    const program = programs.find((entry) => entry.id === input.programId);
    if (!program) return { ok: false, message: "Program not found." };
    if (!input.startsAt || !input.endsAt) return { ok: false, message: "Session start and end are required." };
    if (!Number.isFinite(input.capacity) || input.capacity <= 0) return { ok: false, message: "Capacity must be greater than zero." };

    const startsAt = new Date(input.startsAt).toISOString();
    const endsAt = new Date(input.endsAt).toISOString();
    if (endsAt <= startsAt) return { ok: false, message: "Session end must be after start." };

    const sessionId = `sess_${Math.random().toString(36).slice(2, 9)}`;
    const next: ClassCampSession = {
      id: sessionId,
      programId: program.id,
      locationId: input.locationId || activeLocationId,
      title: input.title?.trim() || undefined,
      instructorName: input.instructorName,
      instructorStaffId: input.instructorStaffId,
      notes: input.notes?.trim() || undefined,
      seriesId: input.seriesId,
      recurrenceRule: input.recurrenceRule,
      status: "scheduled",
      waitlistEnabled: input.waitlistEnabled ?? false,
      waitlistCount: 0,
      updatedByStaffId: input.updatedByStaffId,
      startsAt,
      endsAt,
      capacity: Math.round(input.capacity),
      enrolled: 0
    };
    setSessions((prev) => [next, ...prev]);
    return { ok: true, message: `Session created for ${program.title}.`, sessionId };
  };

  const updateSession = (input: {
    sessionId: string;
    title?: string;
    programId: string;
    locationId: string;
    startsAt: string;
    endsAt: string;
    instructorName?: string;
    instructorStaffId?: string;
    capacity: number;
    waitlistEnabled: boolean;
    notes?: string;
    updatedByStaffId?: string;
  }) => {
    const existing = sessions.find((entry) => entry.id === input.sessionId);
    if (!existing) return { ok: false as const, message: "Session not found." };
    if (!input.programId) return { ok: false as const, message: "Program is required." };
    if (!input.startsAt || !input.endsAt) return { ok: false as const, message: "Session start and end are required." };
    if (!Number.isFinite(input.capacity) || input.capacity <= 0) return { ok: false as const, message: "Capacity must be greater than zero." };
    const startsAt = new Date(input.startsAt).toISOString();
    const endsAt = new Date(input.endsAt).toISOString();
    if (endsAt <= startsAt) return { ok: false as const, message: "Session end must be after start." };
    if (!seedLocations.find((entry) => entry.id === input.locationId)) return { ok: false as const, message: "Location is required." };

    setSessions((prev) =>
      prev.map((entry) =>
        entry.id === input.sessionId
          ? {
              ...entry,
              title: input.title?.trim() || undefined,
              programId: input.programId,
              locationId: input.locationId,
              startsAt,
              endsAt,
              instructorName: input.instructorName?.trim() || undefined,
              instructorStaffId: input.instructorStaffId || undefined,
              capacity: Math.round(input.capacity),
              waitlistEnabled: input.waitlistEnabled,
              notes: input.notes?.trim() || undefined,
              updatedByStaffId: input.updatedByStaffId ?? entry.updatedByStaffId
            }
          : entry
      )
    );

    return { ok: true as const, message: "Session updated." };
  };

  const cancelSession = (sessionId: string, cancelledByStaffId?: string) => {
    const existing = sessions.find((entry) => entry.id === sessionId);
    if (!existing) return { ok: false as const, message: "Session not found." };
    setSessions((prev) =>
      prev.map((entry) =>
        entry.id === sessionId
          ? {
              ...entry,
              status: "cancelled",
              cancelledAt: `${BASE_DATE}T18:00:00Z`,
              cancelledByStaffId
            }
          : entry
      )
    );
    return { ok: true as const, message: `${existing.title ?? "Session"} cancelled.` };
  };

  const appendRegistrationEvent = (input: Omit<RegistrationActivityEvent, "id" | "createdAt">) => {
    const event: RegistrationActivityEvent = {
      ...input,
      id: `regev_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    setRegistrationActivity((prev) => [event, ...prev]);
  };

  const registerCustomerForSession = (input: {
    customerId: string;
    sessionId: string;
    override?: boolean;
    registrationSource?: Registration["registrationSource"];
    registeredByStaffId?: string;
    registeredByStaffName?: string;
  }) => {
    const customer = customers.find((entry) => entry.id === input.customerId);
    if (!customer) return { ok: false, message: "Customer not found." };
    const session = sessions.find((entry) => entry.id === input.sessionId);
    if (!session) return { ok: false, message: "Session not found." };
    const program = programs.find((entry) => entry.id === session.programId);
    if (!program) return { ok: false, message: "Program not found." };

    const waiver = customer.waiverId ? waivers.find((entry) => entry.id === customer.waiverId) : undefined;
    const hasValidWaiver =
      waiver?.status === "valid" &&
      (!waiver.expiresAt || new Date(waiver.expiresAt).getTime() >= new Date(session.startsAt).getTime());
    const requiredTemplateIds = program.requiredWaiverTemplateIds ?? (program.requiresWaiver ? ["wtpl_general"] : []);
    const hasRequiredTemplateWaivers = requiredTemplateIds.every((templateId) => {
      const status = getWaiverStatusForCustomer(customer.id, templateId);
      return status === "valid" || status === "expiring_soon";
    });
    const dob = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
    const age =
      dob && !Number.isNaN(dob.getTime())
        ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
        : undefined;
    if (!input.override && typeof program.minimumAge === "number" && typeof age === "number" && age < program.minimumAge) {
      return { ok: false, message: "Blocked: Customer is below minimum age for this program." };
    }
    if (!input.override && typeof program.maximumAge === "number" && typeof age === "number" && age > program.maximumAge) {
      return { ok: false, message: "Blocked: Customer is above maximum age for this program." };
    }
    if (!input.override && program.requiresWaiver && (!hasValidWaiver || !hasRequiredTemplateWaivers)) {
      return { ok: false, message: "Blocked: Waiver missing or expired." };
    }
    if (!input.override && program.memberRequired) {
      const activeMembership = customerAccessRecords.some(
        (entry) =>
          entry.customerId === customer.id &&
          entry.type === "membership" &&
          entry.status === "active" &&
          (!entry.expirationDate || entry.expirationDate >= session.startsAt.slice(0, 10))
      );
      if (!activeMembership) {
        return { ok: false, message: "Warning: Customer is not an active member (drop-in fee may apply)." };
      }
    }
    if (!input.override && program.guardianRequired) {
      const membership = householdMembers.find((entry) => entry.customerId === customer.id);
      const hasGuardian = Boolean(
        membership &&
          householdMembers.some(
            (entry) =>
              entry.householdId === membership.householdId &&
              entry.customerId !== customer.id &&
              entry.memberType === "adult" &&
              (entry.relationship === "parent_guardian" || entry.role === "guardian" || entry.role === "primary-adult")
          )
      );
      if (!hasGuardian) return { ok: false, message: "Blocked: Guardian required." };
    }

    const existing = registrations.find((entry) => entry.customerId === input.customerId && entry.sessionId === input.sessionId && entry.status !== "cancelled");
    if (existing) return { ok: false, message: `${customer.firstName} ${customer.lastName} is already registered.` };
    const sessionIsFull = session.enrolled >= session.capacity;
    if (sessionIsFull && !session.waitlistEnabled) return { ok: false, message: "Session is full." };
    const waitlistPosition = sessionIsFull
      ? registrations.filter((entry) => entry.sessionId === session.id && entry.status === "waitlisted").length + 1
      : undefined;

    const registrationId = `reg_${Math.random().toString(36).slice(2, 9)}`;
    const registration: Registration = {
      id: registrationId,
      customerId: customer.id,
      sessionId: session.id,
      status: sessionIsFull ? "waitlisted" : "confirmed",
      waitlistPosition,
      registeredAt: new Date().toISOString(),
      registeredByStaffId: input.registeredByStaffId,
      registeredByStaffName: input.registeredByStaffName,
      registrationSource: input.registrationSource ?? "front_desk",
      paymentStatus:
        program.pricingModel === "free"
          ? "paid"
          : program.pricingModel === "included_membership"
            ? "included"
            : "unpaid"
    };

    setRegistrations((prev) => [registration, ...prev]);
    setSessions((prev) =>
      prev.map((entry) =>
        entry.id === session.id
          ? {
              ...entry,
              enrolled: sessionIsFull ? entry.enrolled : entry.enrolled + 1,
              waitlistCount: sessionIsFull ? (entry.waitlistCount ?? 0) + 1 : entry.waitlistCount ?? 0
            }
          : entry
      )
    );
    appendRegistrationEvent({
      registrationId,
      sessionId: session.id,
      customerId: customer.id,
      action: sessionIsFull ? "waitlisted" : "registered",
      statusAfter: sessionIsFull ? "waitlisted" : "confirmed",
      source: registration.registrationSource,
      staffId: input.registeredByStaffId,
      staffName: input.registeredByStaffName
    });
    return {
      ok: true,
      message: sessionIsFull
        ? `${customer.firstName} ${customer.lastName} added to waitlist (#${waitlistPosition}).`
        : input.override
          ? `Registration override confirmed for ${customer.firstName} ${customer.lastName}.`
          : `Registration confirmed for ${customer.firstName} ${customer.lastName}.`,
      registrationId
    };
  };

  const cancelRegistration = (registrationId: string) => {
    const existing = registrations.find((entry) => entry.id === registrationId);
    if (!existing) return { ok: false as const, message: "Registration not found." };
    if (existing.status === "cancelled") return { ok: true as const, message: "Registration already cancelled." };

    let promotedId: string | null = null;
    setRegistrations((prev) => {
      const next: Registration[] = prev.map((entry) =>
        entry.id === registrationId ? { ...entry, status: "cancelled" as const } : entry
      );
      if (existing.status !== "waitlisted") {
        const waitlisted = next
          .filter((entry) => entry.sessionId === existing.sessionId && entry.status === "waitlisted")
          .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
        if (waitlisted.length > 0) {
          promotedId = waitlisted[0].id;
          const promoted: Registration[] = next.map((entry) =>
            entry.id === waitlisted[0].id
              ? { ...entry, status: "confirmed" as const, waitlistPosition: undefined, updatedAt: new Date().toISOString() }
              : entry.sessionId === existing.sessionId && entry.status === "waitlisted" && (entry.waitlistPosition ?? 999) > (waitlisted[0].waitlistPosition ?? 999)
                ? { ...entry, waitlistPosition: Math.max((entry.waitlistPosition ?? 2) - 1, 1) }
                : entry
          );
          return promoted;
        }
      }
      return next;
    });
    setSessions((prev) =>
      prev.map((entry) => {
        if (entry.id !== existing.sessionId) return entry;
        if (existing.status === "waitlisted") {
          return { ...entry, waitlistCount: Math.max((entry.waitlistCount ?? 0) - 1, 0) };
        }
        return {
          ...entry,
          enrolled: Math.max(entry.enrolled - 1, 0) + (promotedId ? 1 : 0),
          waitlistCount: promotedId ? Math.max((entry.waitlistCount ?? 1) - 1, 0) : entry.waitlistCount
        };
      })
    );
    appendRegistrationEvent({
      registrationId: existing.id,
      sessionId: existing.sessionId,
      customerId: existing.customerId,
      action: "cancelled",
      statusAfter: "cancelled",
      source: existing.registrationSource
    });
    if (promotedId) {
      const promotedEntry = registrations.find((entry) => entry.id === promotedId);
      if (promotedEntry) {
        appendRegistrationEvent({
          registrationId: promotedEntry.id,
          sessionId: promotedEntry.sessionId,
          customerId: promotedEntry.customerId,
          action: "promoted",
          statusAfter: "confirmed",
          source: promotedEntry.registrationSource,
          note: "Promoted after cancellation opened a spot."
        });
      }
    }
    return { ok: true as const, message: promotedId ? "Registration cancelled. Waitlist promoted automatically." : "Registration cancelled." };
  };

  const promoteWaitlistedRegistration = (registrationId: string) => {
    const existing = registrations.find((entry) => entry.id === registrationId);
    if (!existing) return { ok: false as const, message: "Registration not found." };
    if (existing.status !== "waitlisted") return { ok: false as const, message: "Only waitlisted registrations can be promoted." };
    const session = sessions.find((entry) => entry.id === existing.sessionId);
    if (!session) return { ok: false as const, message: "Session not found." };
    if (session.enrolled >= session.capacity) return { ok: false as const, message: "Session is still full." };

    setRegistrations((prev) =>
      prev.map((entry) =>
        entry.id === registrationId
          ? { ...entry, status: "confirmed", waitlistPosition: undefined, updatedAt: new Date().toISOString() }
          : entry.sessionId === existing.sessionId && entry.status === "waitlisted" && (entry.waitlistPosition ?? 999) > (existing.waitlistPosition ?? 999)
            ? { ...entry, waitlistPosition: Math.max((entry.waitlistPosition ?? 2) - 1, 1) }
            : entry
      )
    );
    setSessions((prev) =>
      prev.map((entry) =>
        entry.id === existing.sessionId
          ? { ...entry, enrolled: entry.enrolled + 1, waitlistCount: Math.max((entry.waitlistCount ?? 1) - 1, 0) }
          : entry
      )
    );
    appendRegistrationEvent({
      registrationId: existing.id,
      sessionId: existing.sessionId,
      customerId: existing.customerId,
      action: "promoted",
      statusAfter: "confirmed",
      source: existing.registrationSource
    });
    return { ok: true as const, message: "Waitlisted registration promoted." };
  };

  const moveRegistrationToWaitlist = (registrationId: string) => {
    const existing = registrations.find((entry) => entry.id === registrationId);
    if (!existing) return { ok: false as const, message: "Registration not found." };
    if (existing.status === "waitlisted") return { ok: true as const, message: "Registration already waitlisted." };
    if (existing.status === "cancelled") return { ok: false as const, message: "Cancelled registrations cannot be waitlisted." };
    const session = sessions.find((entry) => entry.id === existing.sessionId);
    if (!session) return { ok: false as const, message: "Session not found." };
    if (!session.waitlistEnabled) return { ok: false as const, message: "Waitlist is not enabled for this session." };

    const nextWaitlistPosition =
      registrations
        .filter((entry) => entry.sessionId === existing.sessionId && entry.status === "waitlisted")
        .reduce((max, entry) => Math.max(max, entry.waitlistPosition ?? 0), 0) + 1;

    setRegistrations((prev) =>
      prev.map((entry) =>
        entry.id === registrationId
          ? {
              ...entry,
              status: "waitlisted",
              waitlistPosition: nextWaitlistPosition,
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    );
    setSessions((prev) =>
      prev.map((entry) =>
        entry.id === existing.sessionId
          ? {
              ...entry,
              enrolled: Math.max(entry.enrolled - 1, 0),
              waitlistCount: (entry.waitlistCount ?? 0) + 1
            }
          : entry
      )
    );
    appendRegistrationEvent({
      registrationId: existing.id,
      sessionId: existing.sessionId,
      customerId: existing.customerId,
      action: "waitlisted",
      statusAfter: "waitlisted",
      source: existing.registrationSource,
      note: "Moved from roster to waitlist."
    });
    return { ok: true as const, message: "Registration moved to waitlist." };
  };

  const markRegistrationAttendance = (
    registrationId: string,
    status: "attended" | "absent" | "late" | "excused" | "no_show" | "checked_in" | "completed",
    updatedByStaffId?: string
  ) => {
    const existing = registrations.find((entry) => entry.id === registrationId);
    if (!existing) return { ok: false as const, message: "Registration not found." };
    setRegistrations((prev) =>
      prev.map((entry) =>
        entry.id === registrationId
          ? { ...entry, status, updatedAt: new Date().toISOString(), updatedByStaffId: updatedByStaffId ?? entry.updatedByStaffId }
          : entry
      )
    );
    const mappedAction =
      status === "checked_in"
        ? "checked_in"
        : status === "attended" || status === "completed" || status === "late"
          ? "attended"
          : status === "excused"
            ? "excused"
            : "absent";
    appendRegistrationEvent({
      registrationId: existing.id,
      sessionId: existing.sessionId,
      customerId: existing.customerId,
      action: mappedAction,
      statusAfter: status,
      source: existing.registrationSource,
      staffId: updatedByStaffId
    });
    return { ok: true as const, message: `Marked ${status}.` };
  };

  const reorderWaitlistedRegistration = (registrationId: string, direction: "up" | "down") => {
    const existing = registrations.find((entry) => entry.id === registrationId);
    if (!existing || existing.status !== "waitlisted") return { ok: false as const, message: "Waitlisted registration not found." };
    const waitlisted = registrations
      .filter((entry) => entry.sessionId === existing.sessionId && entry.status === "waitlisted")
      .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
    const index = waitlisted.findIndex((entry) => entry.id === registrationId);
    if (index < 0) return { ok: false as const, message: "Waitlist entry not found." };
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= waitlisted.length) return { ok: false as const, message: "Cannot move further." };

    const current = waitlisted[index];
    const target = waitlisted[swapIndex];
    setRegistrations((prev) =>
      prev.map((entry) => {
        if (entry.id === current.id) return { ...entry, waitlistPosition: target.waitlistPosition ?? swapIndex + 1 };
        if (entry.id === target.id) return { ...entry, waitlistPosition: current.waitlistPosition ?? index + 1 };
        return entry;
      })
    );
    appendRegistrationEvent({
      registrationId: existing.id,
      sessionId: existing.sessionId,
      customerId: existing.customerId,
      action: "waitlisted",
      statusAfter: "waitlisted",
      source: existing.registrationSource,
      note: `Waitlist reordered ${direction}.`
    });
    return { ok: true as const, message: "Waitlist order updated." };
  };

  const addRegistrationNote = (registrationId: string, note: string, updatedByStaffId?: string) => {
    const existing = registrations.find((entry) => entry.id === registrationId);
    if (!existing) return { ok: false as const, message: "Registration not found." };
    const trimmed = note.trim();
    if (!trimmed) return { ok: false as const, message: "Enter a note first." };
    setRegistrations((prev) =>
      prev.map((entry) =>
        entry.id === registrationId
          ? {
              ...entry,
              notes: entry.notes ? `${entry.notes}\n${trimmed}` : trimmed,
              updatedAt: new Date().toISOString(),
              updatedByStaffId: updatedByStaffId ?? entry.updatedByStaffId
            }
          : entry
      )
    );
    appendRegistrationEvent({
      registrationId: existing.id,
      sessionId: existing.sessionId,
      customerId: existing.customerId,
      action: "note_added",
      statusAfter: existing.status,
      note: trimmed,
      source: existing.registrationSource,
      staffId: updatedByStaffId
    });
    return { ok: true as const, message: "Registration note added." };
  };

  const transferRegistration = (input: {
    registrationId: string;
    targetSessionId: string;
    override?: boolean;
    updatedByStaffId?: string;
    updatedByStaffName?: string;
  }) => {
    const existing = registrations.find((entry) => entry.id === input.registrationId);
    if (!existing) return { ok: false as const, message: "Registration not found." };
    if (existing.status === "cancelled") return { ok: false as const, message: "Cancelled registration cannot be transferred." };
    if (existing.sessionId === input.targetSessionId) return { ok: false as const, message: "Already in this session." };
    const customer = customers.find((entry) => entry.id === existing.customerId);
    if (!customer) return { ok: false as const, message: "Customer not found." };

    const cancelResult = cancelRegistration(existing.id);
    if (!cancelResult.ok) return cancelResult;
    const registerResult = registerCustomerForSession({
      customerId: existing.customerId,
      sessionId: input.targetSessionId,
      override: input.override,
      registrationSource: existing.registrationSource ?? "front_desk",
      registeredByStaffId: input.updatedByStaffId,
      registeredByStaffName: input.updatedByStaffName
    });
    if (!registerResult.ok || !registerResult.registrationId) return { ok: false as const, message: registerResult.message };

    appendRegistrationEvent({
      registrationId: registerResult.registrationId,
      sessionId: input.targetSessionId,
      customerId: existing.customerId,
      action: "transferred",
      statusAfter: "confirmed",
      note: `Transferred from session ${existing.sessionId}.`,
      source: existing.registrationSource,
      staffId: input.updatedByStaffId,
      staffName: input.updatedByStaffName
    });
    return { ok: true as const, message: `${customer.firstName} ${customer.lastName} transferred.`, newRegistrationId: registerResult.registrationId };
  };

  const duplicateRegistration = (input: {
    registrationId: string;
    targetSessionId?: string;
    updatedByStaffId?: string;
    updatedByStaffName?: string;
  }) => {
    const existing = registrations.find((entry) => entry.id === input.registrationId);
    if (!existing) return { ok: false as const, message: "Registration not found." };
    const targetSessionId = input.targetSessionId ?? existing.sessionId;
    const result = registerCustomerForSession({
      customerId: existing.customerId,
      sessionId: targetSessionId,
      override: true,
      registrationSource: existing.registrationSource ?? "admin",
      registeredByStaffId: input.updatedByStaffId,
      registeredByStaffName: input.updatedByStaffName
    });
    if (!result.ok || !result.registrationId) return { ok: false as const, message: result.message };
    appendRegistrationEvent({
      registrationId: result.registrationId,
      sessionId: targetSessionId,
      customerId: existing.customerId,
      action: "duplicated",
      statusAfter: "confirmed",
      note: `Duplicated from registration ${existing.id}.`,
      source: existing.registrationSource,
      staffId: input.updatedByStaffId,
      staffName: input.updatedByStaffName
    });
    return { ok: true as const, message: "Registration duplicated.", newRegistrationId: result.registrationId };
  };

  const createProgram = (input: {
    title: string;
    description?: string;
    category: Program["category"];
    programType?: Program["programType"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    guardianRequired?: boolean;
    memberRequired?: boolean;
    dropInAllowed?: boolean;
    defaultInstructorId?: string;
    pricingModel?: Program["pricingModel"];
    basePriceCents?: number;
    waitlistEnabled?: boolean;
    minimumAge?: number;
    maximumAge?: number;
    tags?: string[];
  }) => {
    const title = input.title.trim();
    if (!title) return { ok: false as const, message: "Program name is required." };
    const id = `prog_${Math.random().toString(36).slice(2, 9)}`;
    const next: Program = {
      id,
      organizationId: activeOrgId,
      title,
      description: input.description?.trim() || undefined,
      category: input.category,
      programType: input.programType,
      active: input.active,
      colorToken: input.colorToken,
      defaultCapacity: input.defaultCapacity,
      requiresWaiver: input.requiresWaiver,
      guardianRequired: input.guardianRequired,
      memberRequired: input.memberRequired,
      dropInAllowed: input.dropInAllowed,
      defaultInstructorId: input.defaultInstructorId,
      pricingModel: input.pricingModel,
      basePriceCents: Number.isFinite(input.basePriceCents) ? input.basePriceCents : undefined,
      waitlistEnabled: input.waitlistEnabled,
      minimumAge: Number.isFinite(input.minimumAge) ? input.minimumAge : undefined,
      maximumAge: Number.isFinite(input.maximumAge) ? input.maximumAge : undefined,
      tags: input.tags?.filter(Boolean)
    };
    setPrograms((prev) => [next, ...prev]);
    return { ok: true as const, message: `Program created: ${title}.`, programId: id };
  };

  const updateProgram = (input: {
    id: string;
    title: string;
    description?: string;
    category: Program["category"];
    programType?: Program["programType"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    guardianRequired?: boolean;
    memberRequired?: boolean;
    dropInAllowed?: boolean;
    defaultInstructorId?: string;
    pricingModel?: Program["pricingModel"];
    basePriceCents?: number;
    waitlistEnabled?: boolean;
    minimumAge?: number;
    maximumAge?: number;
    tags?: string[];
  }) => {
    const existing = programs.find((entry) => entry.id === input.id);
    if (!existing) return { ok: false as const, message: "Program not found." };
    const title = input.title.trim();
    if (!title) return { ok: false as const, message: "Program name is required." };
    setPrograms((prev) =>
      prev.map((entry) =>
        entry.id === input.id
          ? {
              ...entry,
              title,
              description: input.description?.trim() || undefined,
              category: input.category,
              programType: input.programType,
              active: input.active,
              colorToken: input.colorToken,
              defaultCapacity: input.defaultCapacity,
              requiresWaiver: input.requiresWaiver,
              guardianRequired: input.guardianRequired,
              memberRequired: input.memberRequired,
              dropInAllowed: input.dropInAllowed,
              defaultInstructorId: input.defaultInstructorId,
              pricingModel: input.pricingModel,
              basePriceCents: Number.isFinite(input.basePriceCents) ? input.basePriceCents : undefined,
              waitlistEnabled: input.waitlistEnabled,
              minimumAge: Number.isFinite(input.minimumAge) ? input.minimumAge : undefined,
              maximumAge: Number.isFinite(input.maximumAge) ? input.maximumAge : undefined,
              tags: input.tags?.filter(Boolean)
            }
          : entry
      )
    );
    return { ok: true as const, message: `Program updated: ${title}.` };
  };

  const parseProductInput = (input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }) => {
    const name = input.name.trim();
    const type = input.type;
    const category = input.category;
    if (!name) return { ok: false as const, message: "Product name is required." };
    if (!type) return { ok: false as const, message: "Product type is required." };
    if (!category) return { ok: false as const, message: "Product category is required." };
    const categoryExists = productCategories.some((entry) => entry.key === category && entry.active);
    if (!categoryExists) return { ok: false as const, message: "Select a valid product category." };

    const priceNumber = typeof input.price === "number" ? input.price : Number(input.price);
    if (!Number.isFinite(priceNumber) || priceNumber < 0) return { ok: false as const, message: "Enter a valid price." };

    const { price: _price, ...rest } = input;
    const product: Omit<PosProduct, "id" | "organizationId"> = {
      ...rest,
      name,
      description: input.description?.trim() ?? "",
      priceCents: Math.round(priceNumber * 100)
    };
    return { ok: true as const, product };
  };

  const createProduct = (input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }) => {
    const parsed = parseProductInput(input);
    if (!parsed.ok) return parsed;

    const id = `prd_${Math.random().toString(36).slice(2, 9)}`;
    const maxQuickRank = accessProducts.reduce((max, product) => Math.max(max, product.quickButtonRank ?? 0), 0);
    const next: PosProduct = normalizeProductForState({
      ...parsed.product,
      id,
      organizationId: activeOrgId,
      quickButtonRank: parsed.product.showAsQuickButton ? maxQuickRank + 1 : undefined,
      updatedAt: new Date().toISOString()
    });
    setAccessProducts((prev) => [next, ...prev]);
    return { ok: true as const, message: `Product created: ${next.name}.`, productId: id };
  };

  const updateProduct = (productId: string, input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }) => {
    const parsed = parseProductInput(input);
    if (!parsed.ok) return parsed;
    const existing = accessProducts.find((entry) => entry.id === productId);
    if (!existing) return { ok: false as const, message: "Product not found." };

    const next: PosProduct = normalizeProductForState({
      ...existing,
      ...parsed.product,
      quickButtonRank:
        parsed.product.showAsQuickButton
          ? existing.quickButtonRank ?? accessProducts.filter((entry) => entry.showAsQuickButton).length + 1
          : undefined,
      updatedAt: new Date().toISOString()
    });
    setAccessProducts((prev) => prev.map((entry) => (entry.id === productId ? next : entry)));
    return { ok: true as const, message: `Product updated: ${next.name}.` };
  };

  const toggleProductActive = (productId: string) => {
    const existing = accessProducts.find((entry) => entry.id === productId);
    if (!existing) return { ok: false as const, message: "Product not found." };
    setAccessProducts((prev) => prev.map((entry) => (entry.id === productId ? { ...entry, active: entry.active === false } : entry)));
    return { ok: true as const, message: `${existing.name} ${existing.active === false ? "activated" : "deactivated"}.` };
  };

  const reorderQuickButtonProduct = (productId: string, direction: "up" | "down") => {
    const current = accessProducts.find((entry) => entry.id === productId);
    if (!current) return { ok: false as const, message: "Product not found." };
    if (!current.showAsQuickButton) return { ok: false as const, message: "Product is not a quick button." };

    const quick = accessProducts
      .filter((entry) => entry.showAsQuickButton)
      .sort((a, b) => (a.quickButtonRank ?? 999) - (b.quickButtonRank ?? 999));
    const idx = quick.findIndex((entry) => entry.id === productId);
    if (idx < 0) return { ok: false as const, message: "Quick button product not found." };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= quick.length) return { ok: true as const, message: "No change." };

    const nextQuick = [...quick];
    const tmp = nextQuick[idx];
    nextQuick[idx] = nextQuick[swapIdx];
    nextQuick[swapIdx] = tmp;
    const rankMap = new Map(nextQuick.map((entry, index) => [entry.id, index + 1]));

    setAccessProducts((prev) =>
      prev.map((entry) =>
        entry.showAsQuickButton
          ? { ...entry, quickButtonRank: rankMap.get(entry.id) ?? entry.quickButtonRank }
          : entry
      )
    );
    return { ok: true as const, message: "Quick button order updated." };
  };

  const adjustProductInventory = (input: {
    productId: string;
    variantId?: string;
    locationId: string;
    quantityDelta: number;
    action: InventoryAuditEntry["action"];
    note?: string;
    staffId?: string;
    staffName?: string;
  }) => {
    const product = accessProducts.find((entry) => entry.id === input.productId);
    if (!product) return { ok: false as const, message: "Product not found." };
    if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
      return { ok: false as const, message: "Quantity delta must be non-zero." };
    }
    const variantExists = input.variantId
      ? (product.variants ?? []).some((entry) => entry.id === input.variantId)
      : true;
    setAccessProducts((prev) =>
      prev.map((entry) => {
        if (entry.id !== input.productId) return entry;
        if (input.variantId) {
          const variants = (entry.variants ?? []).map((variant) => {
            if (variant.id !== input.variantId) return variant;
            const current = variant.inventoryByLocation?.[input.locationId] ?? 0;
            const nextQty = Math.max(0, current + input.quantityDelta);
            return {
              ...variant,
              inventoryByLocation: {
                ...(variant.inventoryByLocation ?? {}),
                [input.locationId]: nextQty
              }
            };
          });
          if (!variantExists) {
            return {
              ...entry,
              variants: [
                ...variants,
                {
                  id: input.variantId,
                  productId: entry.id,
                  name: "Variant",
                  inventoryByLocation: {
                    [input.locationId]: Math.max(0, input.quantityDelta)
                  },
                  active: true
                }
              ]
            };
          }
          return { ...entry, variants };
        }
        const current = entry.inventoryByLocation?.[input.locationId] ?? 0;
        const nextQty = Math.max(0, current + input.quantityDelta);
        return {
          ...entry,
          inventoryByLocation: {
            ...(entry.inventoryByLocation ?? {}),
            [input.locationId]: nextQty
          }
        };
      })
    );
    setInventoryAuditEntries((prev) => [
      {
        id: `inv_${Math.random().toString(36).slice(2, 9)}`,
        organizationId: activeOrgId,
        locationId: input.locationId,
        productId: input.productId,
        variantId: input.variantId,
        action: input.action,
        quantityDelta: input.quantityDelta,
        note: input.note,
        createdAt: new Date().toISOString(),
        createdByStaffId: input.staffId,
        createdByStaffName: input.staffName
      },
      ...prev
    ]);
    return { ok: true as const, message: "Inventory updated." };
  };

  const transferProductInventory = (input: {
    productId: string;
    variantId?: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    note?: string;
    staffId?: string;
    staffName?: string;
  }) => {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      return { ok: false as const, message: "Transfer quantity must be greater than zero." };
    }
    const product = accessProducts.find((entry) => entry.id === input.productId);
    if (!product) return { ok: false as const, message: "Product not found." };

    const fromQty = input.variantId
      ? product.variants?.find((entry) => entry.id === input.variantId)?.inventoryByLocation?.[input.fromLocationId] ?? 0
      : product.inventoryByLocation?.[input.fromLocationId] ?? 0;

    if (fromQty < input.quantity) return { ok: false as const, message: "Insufficient stock for transfer." };

    const out = adjustProductInventory({
      productId: input.productId,
      variantId: input.variantId,
      locationId: input.fromLocationId,
      quantityDelta: -input.quantity,
      action: "transfer_out",
      note: input.note,
      staffId: input.staffId,
      staffName: input.staffName
    });
    if (!out.ok) return out;
    const incoming = adjustProductInventory({
      productId: input.productId,
      variantId: input.variantId,
      locationId: input.toLocationId,
      quantityDelta: input.quantity,
      action: "transfer_in",
      note: input.note,
      staffId: input.staffId,
      staffName: input.staffName
    });
    if (!incoming.ok) return incoming;
    return { ok: true as const, message: "Inventory transferred." };
  };

  const createProductCategory = (input: { label: string; colorToken?: ProductCategoryRecord["colorToken"] }) => {
    const label = input.label.trim();
    if (!label) return { ok: false as const, message: "Category name is required." };
    const key = normalizeCategoryKey(label);
    if (!key) return { ok: false as const, message: "Category name is required." };
    const exists = productCategories.some((entry) => entry.key === key && !entry.archivedAt);
    if (exists) return { ok: false as const, message: "Category already exists." };
    const next: ProductCategoryRecord = {
      id: `pcat_${Math.random().toString(36).slice(2, 9)}`,
      organizationId: activeOrgId,
      key,
      label,
      colorToken: input.colorToken ?? "slate",
      displayOrder: productCategories.length + 1,
      isSystem: false,
      active: true
    };
    setProductCategories((prev) => [...prev, next]);
    return { ok: true as const, message: `Category created: ${label}.`, categoryId: next.id };
  };

  const updateProductCategory = (categoryId: string, updates: { label?: string; colorToken?: ProductCategoryRecord["colorToken"] }) => {
    const existing = productCategories.find((entry) => entry.id === categoryId);
    if (!existing) return { ok: false as const, message: "Category not found." };
    const nextLabel = updates.label?.trim() || existing.label;
    const nextKey = normalizeCategoryKey(nextLabel) || existing.key;
    if (nextKey !== existing.key && productCategories.some((entry) => entry.id !== categoryId && entry.key === nextKey && !entry.archivedAt)) {
      return { ok: false as const, message: "Category already exists." };
    }
    setProductCategories((prev) =>
      prev.map((entry) =>
        entry.id === categoryId
          ? {
              ...entry,
              key: entry.isSystem ? entry.key : nextKey,
              label: nextLabel,
              colorToken: updates.colorToken ?? entry.colorToken
            }
          : entry
      )
    );
    setAccessProducts((prev) =>
      prev.map((entry) =>
        entry.category === existing.key
          ? { ...entry, category: existing.isSystem ? existing.key : nextKey }
          : entry
      )
    );
    return { ok: true as const, message: `Category updated: ${nextLabel}.` };
  };

  const archiveProductCategory = (categoryId: string) => {
    const existing = productCategories.find((entry) => entry.id === categoryId);
    if (!existing) return { ok: false as const, message: "Category not found." };
    if (existing.isSystem) return { ok: false as const, message: "System categories cannot be archived." };
    const inUse = accessProducts.some((entry) => entry.category === existing.key && entry.active !== false);
    if (inUse) return { ok: false as const, message: "Archive products in this category first." };
    setProductCategories((prev) =>
      prev.map((entry) =>
        entry.id === categoryId ? { ...entry, active: false, archivedAt: new Date().toISOString() } : entry
      )
    );
    return { ok: true as const, message: `${existing.label} archived.` };
  };

  const reorderProductCategory = (categoryId: string, direction: "up" | "down") => {
    const sorted = [...productCategories].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((entry) => entry.id === categoryId);
    if (idx < 0) return { ok: false as const, message: "Category not found." };
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= sorted.length) return { ok: true as const, message: "No change." };
    const swapped = [...sorted];
    const temp = swapped[idx];
    swapped[idx] = swapped[target];
    swapped[target] = temp;
    const rank = new Map(swapped.map((entry, index) => [entry.id, index + 1]));
    setProductCategories((prev) => prev.map((entry) => ({ ...entry, displayOrder: rank.get(entry.id) ?? entry.displayOrder })));
    return { ok: true as const, message: "Category order updated." };
  };

  const updateCustomerAccessRecord = (accessId: string, updates: Partial<CustomerAccessRecord>) => {
    const existing = customerAccessRecords.find((entry) => entry.id === accessId);
    if (!existing) return { ok: false as const, message: "Access record not found." };
    setCustomerAccessRecords((prev) =>
      prev.map((entry) =>
        entry.id === accessId
          ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
          : entry
      )
    );
    return { ok: true as const, message: "Access record updated." };
  };

  const addCustomerAccessRecord = (record: Omit<CustomerAccessRecord, "id">) => {
    const accessId = `acc_${Math.random().toString(36).slice(2, 9)}`;
    setCustomerAccessRecords((prev) => [{ ...record, id: accessId }, ...prev]);
    return { ok: true as const, message: "Access added.", accessId };
  };

  const recordMembershipCardEvent: CustomerStateContextValue["recordMembershipCardEvent"] = (input) => {
    const customer = customers.find((entry) => entry.id === input.customerId);
    const accessRecord = customerAccessRecords.find((entry) => entry.id === input.accessRecordId);
    if (!customer || !accessRecord) return;
    const membershipNumber = getMembershipNumber({ customer, accessRecord, orgSlug });
    const qrToken = getMembershipQrToken({ customer, accessRecord, orgSlug });
    const barcodeValue = getMembershipBarcodeValue({ customer, accessRecord, orgSlug });
    setMembershipCardEvents((prev) => [
      {
        id: `mcard_${Math.random().toString(36).slice(2, 9)}`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        customerId: input.customerId,
        accessRecordId: input.accessRecordId,
        membershipNumber,
        qrToken,
        barcodeValue,
        action: input.action,
        source: input.source,
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
  };

  const updateCustomerWaiver = (
    customerId: string,
    updates: {
      status: Waiver["status"];
      signedAt?: string | null;
      expiresAt?: string | null;
      notes?: string | null;
      updatedByStaffId: string;
      updatedByStaffName?: string;
      signedByStaffId?: string | null;
      signedByCustomerId?: string | null;
      signedByRelationship?: Waiver["signedByRelationship"] | null;
    }
  ) => {
    if (!updates.updatedByStaffId) return { ok: false as const, message: "Select staff PIN to continue." };
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) return { ok: false as const, message: "Customer not found." };
    const waiverId = customer.waiverId ?? `wav_${Math.random().toString(36).slice(2, 9)}`;
    const existing = customer.waiverId ? waivers.find((entry) => entry.id === customer.waiverId) : undefined;
    const nextWaiver: Waiver = {
      id: waiverId,
      customerId,
      status: updates.status,
      signedAt: updates.signedAt === null ? undefined : updates.signedAt ?? existing?.signedAt,
      expiresAt: updates.expiresAt === null ? undefined : updates.expiresAt ?? existing?.expiresAt,
      signedByStaffId: updates.signedByStaffId === null ? undefined : updates.signedByStaffId ?? existing?.signedByStaffId,
      signedByCustomerId: updates.signedByCustomerId === null ? undefined : updates.signedByCustomerId ?? existing?.signedByCustomerId,
      signedByRelationship:
        updates.signedByRelationship === null ? undefined : updates.signedByRelationship ?? existing?.signedByRelationship,
      updatedByStaffId: updates.updatedByStaffId,
      updatedByStaffName: updates.updatedByStaffName,
      notes: updates.notes === null ? undefined : updates.notes ?? existing?.notes
    };

    setWaivers((prev) => {
      const hasExisting = prev.some((entry) => entry.id === waiverId);
      if (hasExisting) return prev.map((entry) => (entry.id === waiverId ? nextWaiver : entry));
      return [nextWaiver, ...prev];
    });
    if (!customer.waiverId) {
      setCustomers((prev) => prev.map((entry) => (entry.id === customerId ? { ...entry, waiverId } : entry)));
    }
    return { ok: true as const, message: "Waiver updated." };
  };

  function getCurrentWaiverVersion(templateId: string) {
    const template = waiverTemplates.find((entry) => entry.id === templateId);
    if (!template) return undefined;
    return waiverTemplateVersions.find((entry) => entry.id === template.currentVersionId);
  }

  const computeWaiverExpiry = (
    signedAt: string,
    template: WaiverTemplate
  ) => {
    const signed = new Date(`${signedAt}T00:00:00Z`);
    if (Number.isNaN(signed.getTime())) return undefined;
    switch (template.expirationRuleType) {
      case "never":
        return undefined;
      case "fixed_date":
        return template.fixedExpirationDate;
      case "days_after_signing":
        if (!template.expirationDays) return undefined;
        return addDays(signedAt, template.expirationDays);
      case "annual":
        return addDays(signedAt, 365);
      case "membership_expiration":
      case "program_completion":
      case "per_transaction":
      default:
        return undefined;
    }
  };

  const createWaiverTemplate = (input: {
    name: string;
    description?: string;
    expirationRuleType: WaiverExpirationRuleType;
    expirationDays?: number;
    effectiveDate: string;
    facilityAssignment?: string[];
    brandingAssignment?: string;
    blocks?: WaiverTemplateBlock[];
    createdByStaffId?: string;
  }) => {
    const name = input.name.trim();
    if (!name) return { ok: false as const, message: "Waiver name is required." };
    const templateId = `wtpl_${Math.random().toString(36).slice(2, 9)}`;
    const versionId = `wver_${Math.random().toString(36).slice(2, 9)}`;
    const version: WaiverTemplateVersion = {
      id: versionId,
      templateId,
      version: "1.0",
      effectiveDate: input.effectiveDate || BASE_DATE,
      active: true,
      archived: false,
      blocks: input.blocks?.length
        ? input.blocks
        : [
            { id: `blk_${Math.random().toString(36).slice(2, 7)}`, type: "heading", label: "Heading", content: name },
            { id: `blk_${Math.random().toString(36).slice(2, 7)}`, type: "typed_name", label: "Typed legal name", required: true },
            { id: `blk_${Math.random().toString(36).slice(2, 7)}`, type: "signature_placeholder", label: "Signature", required: true }
          ],
      createdAt: new Date().toISOString(),
      createdByStaffId: input.createdByStaffId
    };
    const template: WaiverTemplate = {
      id: templateId,
      organizationId: activeOrgId,
      name,
      description: input.description?.trim() || undefined,
      active: true,
      archived: false,
      effectiveDate: input.effectiveDate || BASE_DATE,
      expirationRuleType: input.expirationRuleType,
      expirationDays: input.expirationDays,
      facilityAssignment: input.facilityAssignment?.length ? input.facilityAssignment : [activeLocationId],
      brandingAssignment: input.brandingAssignment || "default",
      versionIds: [versionId],
      currentVersionId: versionId,
      createdAt: new Date().toISOString()
    };
    setWaiverTemplateVersions((prev) => [version, ...prev]);
    setWaiverTemplates((prev) => [template, ...prev]);
    return { ok: true as const, message: `Waiver template created: ${name}.`, templateId, versionId };
  };

  const createWaiverTemplateVersion = (input: {
    templateId: string;
    version: string;
    effectiveDate: string;
    blocks: WaiverTemplateBlock[];
    createdByStaffId?: string;
  }) => {
    const template = waiverTemplates.find((entry) => entry.id === input.templateId);
    if (!template) return { ok: false as const, message: "Waiver template not found." };
    if (!input.version.trim()) return { ok: false as const, message: "Version label is required." };
    const versionId = `wver_${Math.random().toString(36).slice(2, 9)}`;
    const version: WaiverTemplateVersion = {
      id: versionId,
      templateId: input.templateId,
      version: input.version.trim(),
      effectiveDate: input.effectiveDate || BASE_DATE,
      active: true,
      archived: false,
      blocks: input.blocks,
      createdAt: new Date().toISOString(),
      createdByStaffId: input.createdByStaffId
    };
    setWaiverTemplateVersions((prev) => [version, ...prev]);
    setWaiverTemplates((prev) =>
      prev.map((entry) =>
        entry.id === input.templateId
          ? {
              ...entry,
              currentVersionId: versionId,
              versionIds: [...entry.versionIds, versionId],
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    );
    return { ok: true as const, message: `Version ${version.version} created.`, versionId };
  };

  const updateWaiverTemplate = (
    templateId: string,
    updates: {
      name?: string;
      description?: string;
      effectiveDate?: string;
      expirationRuleType?: WaiverExpirationRuleType;
      expirationDays?: number;
      facilityAssignment?: string[];
      productAssignment?: string[];
      brandingAssignment?: string;
    }
  ) => {
    const existing = waiverTemplates.find((entry) => entry.id === templateId);
    if (!existing) return { ok: false as const, message: "Waiver template not found." };
    setWaiverTemplates((prev) =>
      prev.map((entry) =>
        entry.id === templateId
          ? {
              ...entry,
              name: updates.name?.trim() || entry.name,
              description: updates.description?.trim() || undefined,
              effectiveDate: updates.effectiveDate || entry.effectiveDate,
              expirationRuleType: updates.expirationRuleType ?? entry.expirationRuleType,
              expirationDays: updates.expirationDays ?? entry.expirationDays,
              facilityAssignment: updates.facilityAssignment?.length ? updates.facilityAssignment : entry.facilityAssignment,
              productAssignment: updates.productAssignment?.length ? updates.productAssignment : entry.productAssignment,
              brandingAssignment: updates.brandingAssignment ?? entry.brandingAssignment,
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    );
    return { ok: true as const, message: "Waiver template updated." };
  };

  const archiveWaiverTemplate = (templateId: string) => {
    const existing = waiverTemplates.find((entry) => entry.id === templateId);
    if (!existing) return { ok: false as const, message: "Waiver template not found." };
    setWaiverTemplates((prev) =>
      prev.map((entry) =>
        entry.id === templateId
          ? { ...entry, active: false, archived: true, updatedAt: new Date().toISOString() }
          : entry
      )
    );
    return { ok: true as const, message: `${existing.name} archived.` };
  };

  function getWaiverStatusForCustomer(customerId: string, templateId?: string) {
    const record = waivers.find((entry) => entry.customerId === customerId && (!templateId || entry.templateId === templateId));
    if (!record) return "missing" as const;
    if (record.status !== "valid") return "expired" as const;
    if (record.expiresAt && record.expiresAt < activeDateKey) return "expired" as const;
    if (record.expiresAt && record.expiresAt <= addDays(activeDateKey, 30)) return "expiring_soon" as const;
    if (templateId) {
      const currentVersion = getCurrentWaiverVersion(templateId);
      if (currentVersion && record.templateVersion && record.templateVersion !== currentVersion.version) {
        return "outdated_version" as const;
      }
    }
    return "valid" as const;
  }

  const signWaiverForCustomer = (input: {
    customerId: string;
    templateId: string;
    typedName: string;
    signedByName?: string;
    signedByCustomerId?: string;
    signedByRelationship?: Waiver["signedByRelationship"];
    signedByStaffId?: string;
    updatedByStaffName?: string;
    notes?: string;
    source?: SignedWaiverRecord["source"];
    signingTokenId?: string;
    ipAddressPlaceholder?: string;
  }) => {
    const customer = customers.find((entry) => entry.id === input.customerId);
    if (!customer) return { ok: false as const, message: "Customer not found." };
    const template = waiverTemplates.find((entry) => entry.id === input.templateId);
    if (!template) return { ok: false as const, message: "Waiver template not found." };
    const currentVersion = getCurrentWaiverVersion(template.id);
    if (!currentVersion) return { ok: false as const, message: "Current waiver version not found." };
    const signedAt = activeDateKey;
    const expiresAt = computeWaiverExpiry(signedAt, template);
    const existing = waivers.find((entry) => entry.customerId === input.customerId && entry.templateId === input.templateId);
    const waiverId = existing?.id ?? `wav_${Math.random().toString(36).slice(2, 9)}`;
    const nextRecord: Waiver = {
      id: waiverId,
      customerId: input.customerId,
      status: "valid",
      templateId: input.templateId,
      templateName: template.name,
      templateVersion: currentVersion.version,
      typedName: input.typedName.trim(),
      signedByName: (input.signedByName || input.typedName).trim(),
      signedAt,
      expiresAt,
      signedByStaffId: input.signedByStaffId,
      signedByCustomerId: input.signedByCustomerId,
      signedByRelationship: input.signedByRelationship ?? "self",
      updatedByStaffId: input.signedByStaffId ?? existing?.updatedByStaffId,
      updatedByStaffName: input.updatedByStaffName,
      notes: input.notes?.trim() || undefined
    };
    setWaivers((prev) => {
      const hasExisting = prev.some((entry) => entry.id === waiverId);
      if (hasExisting) return prev.map((entry) => (entry.id === waiverId ? nextRecord : entry));
      return [nextRecord, ...prev];
    });
    const signedRecordId = `swr_${Math.random().toString(36).slice(2, 9)}`;
    const acknowledgements = currentVersion.blocks
      .filter((block) => block.type === "required_checkbox" || block.type === "checkbox")
      .map((block) => ({ label: block.label, required: Boolean(block.required), accepted: true }));
    const signedRecord: SignedWaiverRecord = {
      id: signedRecordId,
      organizationId: activeOrgId,
      customerId: input.customerId,
      waiverId,
      templateId: input.templateId,
      templateName: template.name,
      templateVersionId: currentVersion.id,
      templateVersion: currentVersion.version,
      status: "valid",
      signedAt: `${signedAt}T12:00:00Z`,
      expiresAt,
      signedByName: (input.signedByName || input.typedName).trim(),
      signedByCustomerId: input.signedByCustomerId,
      signedByRelationship: input.signedByRelationship ?? "self",
      typedName: input.typedName.trim(),
      typedSignature: input.typedName.trim(),
      acknowledgementChecks: acknowledgements,
      contentSnapshot: currentVersion.blocks.map((block) => ({ ...block })),
      signedByStaffId: input.signedByStaffId,
      updatedByStaffId: input.signedByStaffId,
      updatedByStaffName: input.updatedByStaffName,
      source: input.source ?? "staff",
      signingTokenId: input.signingTokenId,
      ipAddressPlaceholder: input.ipAddressPlaceholder,
      createdAt: new Date().toISOString()
    };
    setSignedWaiverRecords((prev) => [signedRecord, ...prev]);
    if (!customer.waiverId) {
      setCustomers((prev) => prev.map((entry) => (entry.id === input.customerId ? { ...entry, waiverId } : entry)));
    }
    return { ok: true as const, message: `${template.name} signed.`, waiverId };
  };

  const completePublicCheckout: CustomerStateContextValue["completePublicCheckout"] = (input) => {
    const purchaser = customers.find((entry) => entry.id === input.purchaserCustomerId);
    if (!purchaser) return { ok: false, message: "Purchaser not found." };
    if (input.items.length === 0) return { ok: false, message: "Cart is empty." };
    const authorizedParticipantIds = new Set(input.authorizedParticipantIds ?? []);

    const pendingLineItems: PosTransactionItem[] = [];
    const pendingRegistrations: Registration[] = [];
    const pendingAccessRecords: CustomerAccessRecord[] = [];
    const pendingMemberships: Membership[] = [];
    const pendingPunchPasses: PunchPass[] = [];
    const pendingInventoryEntries: InventoryAuditEntry[] = [];
    const registrationEvents: Array<Omit<RegistrationActivityEvent, "id" | "createdAt">> = [];
    const updatedSessions = new Map<string, ClassCampSession>();
    const updatedProducts = new Map<string, PosProduct>();
    const registrationIds: string[] = [];
    const waitlistedIds: string[] = [];

    const getSessionSnapshot = (sessionId: string) => updatedSessions.get(sessionId) ?? sessions.find((entry) => entry.id === sessionId);
    const getProductSnapshot = (productId: string) => updatedProducts.get(productId) ?? accessProducts.find((entry) => entry.id === productId);

    const customerHasActiveMembership = (customerId: string) => {
      const current = customerAccessRecords.some(
        (entry) =>
          entry.customerId === customerId &&
          entry.type === "membership" &&
          entry.status === "active" &&
          (!entry.expirationDate || entry.expirationDate >= activeDateKey)
      );
      if (current) return true;
      return input.items.some((item) => {
        if (item.kind !== "product" || item.participantCustomerId !== customerId) return false;
        const product = accessProducts.find((entry) => entry.id === item.productId);
        return Boolean(product && (product.category === "memberships" || product.type === "membership"));
      });
    };

    const promoCode = input.promoCode?.trim().toUpperCase() ?? "";
    const promoDiscountForSubtotal = (subtotalCents: number) => {
      if (!promoCode) return 0;
      if (promoCode === "WELCOME10") return Math.round(subtotalCents * 0.1);
      if (promoCode === "FAMILY5") {
        const participants = new Set(input.items.map((item) => item.participantCustomerId));
        return participants.size >= 2 ? 500 : 0;
      }
      return 0;
    };

    for (const item of input.items) {
      const participant = customers.find((entry) => entry.id === item.participantCustomerId);
      if (!participant) return { ok: false, message: "A participant in this cart could not be found." };
      if (authorizedParticipantIds.size > 0 && !authorizedParticipantIds.has(participant.id)) {
        return { ok: false, message: `${participant.firstName} ${participant.lastName} is not available for this account.` };
      }

      if (item.kind === "session") {
        const sessionSnapshot = getSessionSnapshot(item.sessionId);
        if (!sessionSnapshot) return { ok: false, message: "Session not found." };
        const session = sessionSnapshot;
        const program = programs.find((entry) => entry.id === session.programId);
        if (!program) return { ok: false, message: "Program not found." };

        const existing = registrations.find((entry) => entry.customerId === participant.id && entry.sessionId === session.id && entry.status !== "cancelled");
        if (existing) return { ok: false, message: `${participant.firstName} ${participant.lastName} is already registered for this session.` };

        const requiredTemplateIds = program.requiredWaiverTemplateIds ?? (program.requiresWaiver ? ["wtpl_general"] : []);
        const hasRequiredWaivers = requiredTemplateIds.every((templateId) => {
          const status = getWaiverStatusForCustomer(participant.id, templateId);
          return status === "valid" || status === "expiring_soon";
        });
        if (program.requiresWaiver && !hasRequiredWaivers) {
          return { ok: false, message: `${participant.firstName} ${participant.lastName} needs a valid waiver before checkout can continue.` };
        }

        const dob = participant.dateOfBirth ? new Date(`${participant.dateOfBirth}T00:00:00Z`) : null;
        const age =
          dob && !Number.isNaN(dob.getTime())
            ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
            : undefined;
        if (typeof program.minimumAge === "number" && typeof age === "number" && age < program.minimumAge) {
          return { ok: false, message: `${participant.firstName} ${participant.lastName} does not meet the minimum age for ${program.title}.` };
        }
        if (typeof program.maximumAge === "number" && typeof age === "number" && age > program.maximumAge) {
          return { ok: false, message: `${participant.firstName} ${participant.lastName} exceeds the maximum age for ${program.title}.` };
        }
        if (program.memberRequired && !customerHasActiveMembership(participant.id)) {
          return { ok: false, message: `${participant.firstName} ${participant.lastName} needs an active membership for ${program.title}.` };
        }
        if (program.guardianRequired) {
          const membership = householdMembers.find((entry) => entry.customerId === participant.id);
          const hasGuardian = Boolean(
            membership &&
              householdMembers.some(
                (entry) =>
                  entry.householdId === membership.householdId &&
                  entry.customerId !== participant.id &&
                  entry.memberType === "adult" &&
                  (entry.relationship === "parent_guardian" || entry.role === "guardian" || entry.role === "primary-adult" || entry.role === "secondary-adult")
              )
          );
          if (!hasGuardian) {
            return { ok: false, message: `${participant.firstName} ${participant.lastName} needs a guardian on file for this registration.` };
          }
        }

        const registeredCount = session.enrolled;
        const queuedWaitlist = session.waitlistCount ?? 0;
        const sessionIsFull = registeredCount >= session.capacity;
        if (sessionIsFull && !session.waitlistEnabled) {
          return { ok: false, message: `${program.title} is full and does not accept a waitlist.` };
        }

        const registrationId = `reg_${Math.random().toString(36).slice(2, 9)}`;
        const status = sessionIsFull ? "waitlisted" : "confirmed";
        const waitlistPosition = sessionIsFull ? queuedWaitlist + 1 : undefined;
        const registration: Registration = {
          id: registrationId,
          customerId: participant.id,
          sessionId: session.id,
          status,
          waitlistPosition,
          registeredAt: new Date().toISOString(),
          registrationSource: "online",
          paymentStatus: sessionIsFull ? "unpaid" : "paid"
        };
        pendingRegistrations.push(registration);
        registrationIds.push(registrationId);
        if (status === "waitlisted") waitlistedIds.push(registrationId);
        registrationEvents.push({
          registrationId,
          sessionId: session.id,
          customerId: participant.id,
          action: status === "waitlisted" ? "waitlisted" : "registered",
          statusAfter: status,
          source: "online"
        });
        updatedSessions.set(session.id, {
          ...session,
          enrolled: sessionIsFull ? session.enrolled : session.enrolled + 1,
          waitlistCount: sessionIsFull ? (session.waitlistCount ?? 0) + 1 : session.waitlistCount ?? 0
        });

        const pricingProduct = accessProducts.find((entry) => {
          if (entry.organizationId !== program.organizationId) return false;
          if (program.category === "camp" && (entry.category === "camps" || entry.type === "camp")) return true;
          if (
            (program.category === "class" || program.category === "clinic" || program.category === "course") &&
            (entry.category === "classes" || entry.type === "class" || entry.type === "registration")
          ) {
            return true;
          }
          return false;
        });
        const sessionUnitPrice =
          status === "waitlisted"
            ? 0
            : customerHasActiveMembership(participant.id)
              ? pricingProduct?.memberPriceCents ?? pricingProduct?.priceCents ?? program.basePriceCents ?? 0
              : pricingProduct?.nonMemberPriceCents ?? pricingProduct?.priceCents ?? program.basePriceCents ?? 0;
        pendingLineItems.push({
          productId: program.id,
          productName: session.title?.trim() ? `${program.title} · ${session.title}` : program.title,
          category: program.category,
          type: "program-registration",
          quantity: 1,
          unitPrice: sessionUnitPrice,
          lineTotal: sessionUnitPrice
        });
        continue;
      }

      const product = getProductSnapshot(item.productId);
      if (!product) return { ok: false, message: "Product not found." };
      if (product.waiverRequired) {
        const status = getWaiverStatusForCustomer(participant.id, "wtpl_general");
        if (!(status === "valid" || status === "expiring_soon")) {
          return { ok: false, message: `${participant.firstName} ${participant.lastName} needs a valid waiver before purchasing ${product.name}.` };
        }
      }
      if (typeof product.minimumAge === "number" && participant.dateOfBirth) {
        const age = Math.max(
          0,
          Math.floor((new Date(`${activeDateKey}T00:00:00Z`).getTime() - new Date(`${participant.dateOfBirth}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24 * 365.2425))
        );
        if (age < product.minimumAge) {
          return { ok: false, message: `${participant.firstName} ${participant.lastName} does not meet the age requirement for ${product.name}.` };
        }
      }

      const quantity = Math.max(1, item.quantity ?? 1);
      const unitPrice = customerHasActiveMembership(participant.id)
        ? product.memberPriceCents ?? product.priceCents
        : product.nonMemberPriceCents ?? product.priceCents;

      pendingLineItems.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        type: product.type ?? "service",
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity
      });

      if (product.trackInventory) {
        const variantInventoryTotal = product.variants?.reduce(
          (sum, variant) => sum + (variant.inventoryByLocation?.[activeLocationId] ?? 0),
          0
        ) ?? 0;
        const currentInventory = product.inventoryByLocation?.[activeLocationId] ?? variantInventoryTotal;
        if (currentInventory < quantity) {
          return { ok: false, message: `${product.name} does not have enough stock to complete this order.` };
        }
        if (product.inventoryByLocation?.[activeLocationId] !== undefined) {
          updatedProducts.set(product.id, {
            ...product,
            inventoryByLocation: {
              ...(product.inventoryByLocation ?? {}),
              [activeLocationId]: currentInventory - quantity
            }
          });
        } else if (product.variants?.length) {
          let remaining = quantity;
          const nextVariants = product.variants.map((variant) => {
            if (remaining <= 0) return variant;
            const variantStock = variant.inventoryByLocation?.[activeLocationId] ?? 0;
            if (variantStock <= 0) return variant;
            const decrement = Math.min(variantStock, remaining);
            remaining -= decrement;
            return {
              ...variant,
              inventoryByLocation: {
                ...(variant.inventoryByLocation ?? {}),
                [activeLocationId]: variantStock - decrement
              }
            };
          });
          updatedProducts.set(product.id, {
            ...product,
            variants: nextVariants
          });
        }
        pendingInventoryEntries.push({
          id: `inv_${Math.random().toString(36).slice(2, 9)}`,
          organizationId: activeOrgId,
          locationId: activeLocationId,
          productId: product.id,
          action: "adjust",
          quantityDelta: -quantity,
          note: "Online checkout sale",
          createdAt: new Date().toISOString(),
          createdByStaffId: "customer_portal",
          createdByStaffName: "Customer Portal"
        });
      }

      for (let index = 0; index < quantity; index += 1) {
        if (product.category === "memberships" || product.type === "membership") {
          const householdMembership = product.name.toLowerCase().includes("family");
          const coveredMembers = householdMembership
            ? householdMembers
                .filter((entry) => {
                  const participantMembership = householdMembers.find((member) => member.customerId === participant.id);
                  return participantMembership && entry.householdId === participantMembership.householdId;
                })
                .map((entry) => entry.customerId)
            : [participant.id];

          coveredMembers.forEach((customerId) => {
            const membershipId = `mem_${Math.random().toString(36).slice(2, 8)}`;
            pendingMemberships.push({
              id: membershipId,
              customerId,
              planName: product.name,
              status: "active",
              purchaseDate: activeDateKey,
              startDate: activeDateKey,
              expirationDate: addDays(activeDateKey, 30),
              renewalDate: addDays(activeDateKey, 30)
            });
            pendingAccessRecords.push({
              id: `acc_${Math.random().toString(36).slice(2, 9)}`,
              customerId,
              productId: product.id,
              type: householdMembership ? "household-membership" : "membership",
              status: "active",
              purchaseDate: activeDateKey,
              startDate: activeDateKey,
              expirationDate: addDays(activeDateKey, 30),
              unlimitedAccess: true,
              locationsAllowed: [activeLocationId],
              notes: product.name,
              grantedByStaffId: "customer_portal",
              grantedByStaffName: "Customer Portal"
            });
          });
        } else if (product.category === "punch_passes" || product.accessBehavior === "punch_decrement") {
          const passId = `pass_${Math.random().toString(36).slice(2, 8)}`;
          pendingPunchPasses.push({
            id: passId,
            customerId: participant.id,
            title: product.name,
            originalUses: product.punchQuantity ?? 10,
            remainingUses: product.punchQuantity ?? 10,
            expiresAt: addDays(activeDateKey, 90),
            type: "multi_visit",
            usageHistory: []
          });
          pendingAccessRecords.push({
            id: `acc_${Math.random().toString(36).slice(2, 9)}`,
            customerId: participant.id,
            productId: product.id,
            type: "punch-pass",
            status: "active",
            startDate: activeDateKey,
            expirationDate: addDays(activeDateKey, 90),
            remainingPunches: product.punchQuantity ?? 10,
            locationsAllowed: [activeLocationId],
            notes: product.name,
            grantedByStaffId: "customer_portal",
            grantedByStaffName: "Customer Portal"
          });
        } else if (product.category === "day_passes" || product.type === "day-pass" || product.category === "classes" || product.category === "camps" || product.category === "comps") {
          pendingAccessRecords.push({
            id: `acc_${Math.random().toString(36).slice(2, 9)}`,
            customerId: participant.id,
            productId: product.id,
            type: product.category === "comps" ? "comp" : "day-pass",
            status: "active",
            startDate: activeDateKey,
            expirationDate: activeDateKey,
            locationsAllowed: [activeLocationId],
            notes: product.name,
            grantedByStaffId: "customer_portal",
            grantedByStaffName: "Customer Portal"
          });
        }
      }
    }

    const subtotal = pendingLineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountCents = promoDiscountForSubtotal(subtotal);
    const taxableSubtotal = pendingLineItems.reduce((sum, item) => {
      const product = accessProducts.find((entry) => entry.id === item.productId);
      return sum + (product?.taxable ? item.lineTotal : 0);
    }, 0);
    const taxCents = Math.round(taxableSubtotal * 0.07);
    const total = Math.max(subtotal - discountCents + taxCents, 0);

    const paymentResult =
      total === 0 && input.paymentType !== "split"
        ? {
            ok: true,
            processorName: "Mock Payments",
            method: input.paymentType,
            message: "No payment required."
          }
        : mockPaymentProvider.charge({
            amountCents: total,
            method: input.paymentType,
            splitBreakdown: input.splitBreakdown,
            customerId: input.billingCustomerId ?? input.purchaserCustomerId,
            locationId: activeLocationId,
            organizationId: activeOrgId
          });

    if (!paymentResult.ok) {
      return { ok: false, message: paymentResult.message };
    }

    setRegistrations((prev) => [...pendingRegistrations, ...prev]);
    if (pendingRegistrations.length > 0) {
      setSessions((prev) =>
        prev.map((entry) => updatedSessions.get(entry.id) ?? entry)
      );
      registrationEvents.forEach((event) => appendRegistrationEvent(event));
    }
    if (pendingAccessRecords.length > 0) setCustomerAccessRecords((prev) => [...pendingAccessRecords, ...prev]);
    if (pendingMemberships.length > 0) setMemberships((prev) => [...pendingMemberships, ...prev]);
    if (pendingPunchPasses.length > 0) setPunchPasses((prev) => [...pendingPunchPasses, ...prev]);
    if (pendingInventoryEntries.length > 0) setInventoryAuditEntries((prev) => [...pendingInventoryEntries, ...prev]);
    if (updatedProducts.size > 0) {
      setAccessProducts((prev) => prev.map((entry) => updatedProducts.get(entry.id) ?? entry));
    }

    const purchaserHouseholdMembership = householdMembers.find((entry) => entry.customerId === input.purchaserCustomerId);
    const receiptNumber = `R-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const confirmationNumber = `C-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const transactionId = `txn_${Math.random().toString(36).slice(2, 9)}`;
    const transaction: PosTransaction = {
      id: transactionId,
      organizationId: activeOrgId,
      locationId: activeLocationId,
      customerId: input.billingCustomerId ?? input.purchaserCustomerId,
      customerName: `${purchaser.firstName} ${purchaser.lastName}`,
      customerEmail: purchaser.email,
      customerMemberId: purchaser.memberId,
      purchaserCustomerId: input.purchaserCustomerId,
      purchaserCustomerName: `${purchaser.firstName} ${purchaser.lastName}`,
      purchasedForCustomerIds: Array.from(new Set(input.items.map((item) => item.participantCustomerId))),
      householdId: purchaserHouseholdMembership?.householdId,
      transactionType: "sale",
      returnStatus: "none",
      soldByStaffId: "customer_portal",
      soldByStaffName: "Customer Portal",
      items: pendingLineItems,
      subtotal,
      total,
      completedAt: new Date().toISOString(),
      paymentType: input.paymentType,
      receiptStatus: total === 0 || input.paymentType === "comp" ? "comped" : "paid",
      paymentBreakdown: input.splitBreakdown,
      discountCents,
      taxCents,
      paymentProcessor: paymentResult.processorName,
      paymentApprovalCode: paymentResult.approvalCode,
      paymentCardLast4: paymentResult.last4,
      checkInTriggered: false,
      receiptNumber
    };
    setTransactions((prev) => [transaction, ...prev]);
    const createdAt = new Date().toISOString();
    const checkoutCommunications: CommunicationRecord[] = [
      {
        id: `comm_receipt_${transactionId}`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        channel: "email",
        status: input.emailReceipt === false ? "draft" : "sent",
        recipientType: "customer",
        recipientLabel: `${purchaser.firstName} ${purchaser.lastName}`,
        subject: `Receipt ${receiptNumber}`,
        message: `Your receipt total was recorded at ${total}.`,
        customerId: purchaser.id,
        householdId: purchaserHouseholdMembership?.householdId,
        templateType: "general_announcement",
        sentAt: input.emailReceipt === false ? undefined : createdAt,
        createdAt,
        createdByStaffName: "Customer Portal",
        deliveryStatus: input.emailReceipt === false ? "queued" : "delivered"
      }
    ];
    if (registrationIds.length > 0 || waitlistedIds.length > 0) {
      checkoutCommunications.push({
        id: `comm_checkout_registration_${transactionId}`,
        organizationId: activeOrgId,
        locationId: activeLocationId,
        channel: "system_notification",
        status: "sent",
        recipientType: "customer",
        recipientLabel: `${purchaser.firstName} ${purchaser.lastName}`,
        subject: "Registration update",
        message:
          waitlistedIds.length > 0
            ? `Checkout complete. ${waitlistedIds.length} registration${waitlistedIds.length === 1 ? " was" : "s were"} waitlisted.`
            : "Checkout complete and registrations were confirmed.",
        customerId: purchaser.id,
        householdId: purchaserHouseholdMembership?.householdId,
        templateType: "registration_confirmation",
        sentAt: createdAt,
        createdAt,
        createdByStaffName: "Customer Portal",
        deliveryStatus: "unread"
      });
    }
    setManualCommunications((prev) => [...checkoutCommunications, ...prev]);

    return {
      ok: true,
      message:
        waitlistedIds.length > 0
          ? `Checkout complete. ${waitlistedIds.length} registration${waitlistedIds.length === 1 ? " was" : "s were"} added to the waitlist.`
          : "Checkout complete.",
      transactionId,
      receiptNumber,
      confirmationNumber,
      registrationIds,
      waitlistedIds
    };
  };

  const createCommunication: CustomerStateContextValue["createCommunication"] = (input) => {
    const subject = input.subject.trim();
    const message = input.message.trim();
    if (!subject) return { ok: false, message: "Subject is required." };
    if (!message) return { ok: false, message: "Message is required." };
    const source = inferCommunicationSource(input.source, input.automatedTrigger, input.templateType);
    const isTransactional = input.isTransactional ?? isCommunicationTransactional(source, input.automatedTrigger);
    const primaryCustomer = input.customerId ? customers.find((entry) => entry.id === input.customerId) : undefined;
    const primaryHousehold = input.householdId ? households.find((entry) => entry.id === input.householdId) : undefined;
    const householdCustomerIds = primaryHousehold
      ? householdMembers.filter((entry) => entry.householdId === primaryHousehold.id).map((entry) => entry.customerId)
      : [];
    const householdCustomers = customers.filter((entry) => householdCustomerIds.includes(entry.id));
    const derivedRecipients: CommunicationRecipient[] =
      input.recipients && input.recipients.length > 0
        ? input.recipients
        : primaryCustomer
          ? [{
              id: primaryCustomer.id,
              type: "customer",
              label: `${primaryCustomer.firstName} ${primaryCustomer.lastName}`,
              customerId: primaryCustomer.id,
              email: primaryCustomer.email,
              phone: primaryCustomer.phone
            }]
          : primaryHousehold
            ? householdCustomers.map((entry) => ({
                id: entry.id,
                type: "customer" as const,
                label: `${entry.firstName} ${entry.lastName}`,
                customerId: entry.id,
                householdId: primaryHousehold.id,
                email: entry.email,
                phone: entry.phone
              }))
            : [];
    const shouldEnforcePreferences = input.status !== "draft";
    const preferenceControlledChannel = input.channel === "email" || input.channel === "sms" || input.channel === "in_app_notification";
    const blockedRecipients = shouldEnforcePreferences ? derivedRecipients.filter((recipient) => {
      const customer = recipient.customerId ? customers.find((entry) => entry.id === recipient.customerId) : undefined;
      const preferences = customer?.communicationPreferences ?? DEFAULT_COMMUNICATION_PREFERENCES;
      if (!preferenceControlledChannel) return false;
      if (input.channel === "email" && !preferences.email) return true;
      if (input.channel === "sms" && !preferences.sms) return true;
      if (!isTransactional && !preferences.marketing) return true;
      if (isTransactional && !preferences.transactional) return true;
      return false;
    }) : [];
    if (blockedRecipients.length === derivedRecipients.length && derivedRecipients.length > 0) {
      return { ok: false, message: "Recipient preferences block this message." };
    }
    const allowedRecipients = derivedRecipients.filter((recipient) => !blockedRecipients.some((blocked) => blocked.id === recipient.id));
    const template = input.templateType ? communicationTemplates.find((entry) => entry.type === input.templateType) : undefined;
    const renderedBody = template
      ? renderTemplateVariables(message || template.body, {
          customerName: primaryCustomer ? `${primaryCustomer.firstName} ${primaryCustomer.lastName}` : undefined,
          householdName: primaryHousehold?.householdName,
          programName: input.programId ? programs.find((entry) => entry.id === input.programId)?.title : undefined,
          sessionDate: input.sessionId ? sessions.find((entry) => entry.id === input.sessionId)?.startsAt?.slice(0, 10) : undefined,
          facilityName: settings.facilityProfile.facilityName,
          membershipName: input.membershipId ? memberships.find((entry) => entry.id === input.membershipId)?.planName : undefined,
          expirationDate: input.membershipId ? memberships.find((entry) => entry.id === input.membershipId)?.expirationDate : undefined,
          balanceDue: input.transactionId ? transactions.find((entry) => entry.id === input.transactionId)?.total.toFixed(2) : undefined,
          waiverName: input.waiverTemplateId ? waiverTemplates.find((entry) => entry.id === input.waiverTemplateId)?.name : undefined
        })
      : message;
    const createdAt = new Date().toISOString();
    const communication: CommunicationRecord = {
      id: `comm_${Math.random().toString(36).slice(2, 9)}`,
      organizationId: activeOrgId,
      locationId: activeLocationId,
      channel: input.channel,
      status: input.status,
      recipientType: input.recipientType,
      recipientLabel: input.recipientLabel.trim(),
      subject,
      message: renderedBody,
      body: renderedBody,
      recipients: allowedRecipients,
      sender: {
        id: input.createdByStaffId,
        name: input.createdByStaffName ?? "System",
        kind: input.createdByStaffId ? "staff" : "system",
        staffUserId: input.createdByStaffId
      },
      customerId: input.customerId,
      householdId: input.householdId,
      sessionId: input.sessionId,
      programId: input.programId,
      membershipId: input.membershipId,
      waiverTemplateId: input.waiverTemplateId,
      registrationId: input.registrationId,
      transactionId: input.transactionId,
      alertId: input.alertId,
      staffUserId: input.staffUserId,
      segmentKey: input.segmentKey,
      templateType: input.templateType,
      automatedTrigger: input.automatedTrigger,
      source,
      isTransactional,
      relatedRecords: input.relatedRecords,
      scheduledFor: input.status === "scheduled" ? (input.scheduledFor ?? addDays(activeDateKey, 1)) : undefined,
      sentAt: input.status === "sent" ? createdAt : undefined,
      createdAt,
      createdByStaffId: input.createdByStaffId,
      createdByStaffName: input.createdByStaffName,
      deliveryStatus:
        input.channel === "system_notification" || input.channel === "in_app_notification"
          ? input.deliveryStatus ?? "unread"
          : input.status === "failed"
            ? "failed"
            : input.status === "sent"
              ? "delivered"
              : "queued",
      attachmentsPlaceholder: input.attachmentsPlaceholder
    };
    setManualCommunications((prev) => [communication, ...prev]);
    return {
      ok: true,
      message:
        communication.status === "draft"
          ? "Draft saved."
          : communication.status === "scheduled"
            ? "Message scheduled."
            : "Message sent.",
      communicationId: communication.id
    };
  };

  const updateCommunication: CustomerStateContextValue["updateCommunication"] = (communicationId, updates) => {
    let found = false;
    setManualCommunications((prev) =>
      prev.map((entry) => {
        if (entry.id !== communicationId) return entry;
        found = true;
        return { ...entry, ...updates };
      })
    );
    return { ok: found, message: found ? "Communication updated." : "Communication not found." };
  };

  const markCommunicationRead: CustomerStateContextValue["markCommunicationRead"] = (communicationId) =>
    updateCommunication(communicationId, {
      deliveryStatus: "read",
      readAt: new Date().toISOString()
    });

  const getSignedWaiverRecordsForCustomer = (customerId: string) => {
    return signedWaiverRecords
      .filter((entry) => entry.customerId === customerId)
      .sort((a, b) => b.signedAt.localeCompare(a.signedAt));
  };

  const createHousehold = (input: {
    householdName: string;
    primaryContactCustomerId: string;
    billingCustomerId?: string;
    locationId: string;
    secondaryContactCustomerId?: string;
    householdStatus?: Household["householdStatus"];
    preferredCommunicationMethod?: Household["preferredCommunicationMethod"];
    email?: string;
    phone?: string;
    defaultAddress?: string;
    defaultEmergencyContactName?: string;
    defaultEmergencyContactPhone?: string;
    notes?: string;
  }) => {
    const householdName = input.householdName.trim();
    if (!householdName) return { ok: false as const, message: "Household name is required." };
    const primary = customers.find((entry) => entry.id === input.primaryContactCustomerId);
    if (!primary) return { ok: false as const, message: "Primary contact not found." };
    const householdId = `hh_${Math.random().toString(36).slice(2, 9)}`;
    const billingCustomerId = input.billingCustomerId ?? input.primaryContactCustomerId;
    const nextHousehold: Household = {
      id: householdId,
      householdName,
      primaryContactCustomerId: input.primaryContactCustomerId,
      secondaryContactCustomerId: input.secondaryContactCustomerId,
      billingCustomerId,
      locationId: input.locationId,
      householdStatus: input.householdStatus ?? "active",
      preferredCommunicationMethod: input.preferredCommunicationMethod ?? "email",
      email: input.email?.trim() || primary.email,
      phone: input.phone?.trim() || primary.phone,
      defaultAddress: input.defaultAddress?.trim() || primary.addressLine1,
      defaultEmergencyContactName: input.defaultEmergencyContactName?.trim() || primary.emergencyContactName,
      defaultEmergencyContactPhone: input.defaultEmergencyContactPhone?.trim() || primary.emergencyContactPhone,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString()
    };
    setHouseholds((prev) => [nextHousehold, ...prev]);
    setHouseholdMembers((prev) => {
      const alreadyMember = prev.some(
        (entry) => entry.householdId === householdId && entry.customerId === input.primaryContactCustomerId
      );
      if (alreadyMember) return prev;
      return [
        {
          householdId,
          customerId: input.primaryContactCustomerId,
          memberType: "adult",
          role: "primary-adult",
          relationship: "parent_guardian",
          canCheckInOthers: true,
          canPurchaseForOthers: true,
          canSignWaivers: true,
          emergencyContactPriority: 1
        },
        ...prev
      ];
    });
    return { ok: true as const, message: `Household created: ${householdName}.`, householdId };
  };

  const updateHousehold: CustomerStateContextValue["updateHousehold"] = (householdId, updates) => {
    const exists = households.some((entry) => entry.id === householdId);
    if (!exists) return { ok: false as const, message: "Household not found." };

    setHouseholds((prev) =>
      prev.map((entry) =>
        entry.id === householdId
          ? {
              ...entry,
              ...updates,
              householdName: updates.householdName?.trim() || entry.householdName,
              email: updates.email?.trim() || undefined,
              phone: updates.phone?.trim() || undefined,
              defaultAddress: updates.defaultAddress?.trim() || undefined,
              defaultEmergencyContactName: updates.defaultEmergencyContactName?.trim() || undefined,
              defaultEmergencyContactPhone: updates.defaultEmergencyContactPhone?.trim() || undefined,
              notes: updates.notes?.trim() || undefined
            }
          : entry
      )
    );

    return { ok: true as const, message: "Household updated." };
  };

  const updateHouseholdPhoto: CustomerStateContextValue["updateHouseholdPhoto"] = (householdId, input) => {
    const exists = households.some((entry) => entry.id === householdId);
    if (!exists) return { ok: false as const, message: "Household not found." };

    const updatedAt = new Date().toISOString();
    const nextPhoto = input.profilePhotoUrl?.trim() || undefined;
    setHouseholds((prev) =>
      prev.map((entry) =>
        entry.id === householdId
          ? {
              ...entry,
              profilePhotoUrl: nextPhoto,
              profilePhotoUpdatedAt: updatedAt,
              profilePhotoUpdatedByStaffId: input.updatedByStaffId,
              profilePhotoUpdatedBy: input.updatedByStaffName
            }
          : entry
      )
    );

    return {
      ok: true as const,
      message: nextPhoto ? "Household photo updated." : "Household photo removed."
    };
  };

  const addHouseholdMember = (input: {
    householdId: string;
    customerId: string;
    memberType: "adult" | "child";
    role: HouseholdMemberRole;
    relationship: HouseholdRelationship;
    canCheckInOthers: boolean;
    canPurchaseForOthers: boolean;
    canSignWaivers: boolean;
    emergencyContactPriority?: number;
  }) => {
    const household = households.find((entry) => entry.id === input.householdId);
    if (!household) return { ok: false as const, message: "Household not found." };
    const customer = customers.find((entry) => entry.id === input.customerId);
    if (!customer) return { ok: false as const, message: "Customer not found." };
    const exists = householdMembers.some(
      (entry) => entry.householdId === input.householdId && entry.customerId === input.customerId
    );
    if (exists) return { ok: false as const, message: "Customer is already in this household." };
    setHouseholdMembers((prev) => [
      {
        householdId: input.householdId,
        customerId: input.customerId,
        memberType: input.memberType,
        role: input.role,
        relationship: input.relationship,
        canCheckInOthers: input.canCheckInOthers,
        canPurchaseForOthers: input.canPurchaseForOthers,
        canSignWaivers: input.canSignWaivers,
        emergencyContactPriority: input.emergencyContactPriority
      },
      ...prev
    ]);
    return { ok: true as const, message: `${customer.firstName} ${customer.lastName} added to household.` };
  };

  const removeHouseholdMember = (householdId: string, customerId: string) => {
    const exists = householdMembers.some(
      (entry) => entry.householdId === householdId && entry.customerId === customerId
    );
    if (!exists) return { ok: false as const, message: "Household member not found." };
    setHouseholdMembers((prev) =>
      prev.filter((entry) => !(entry.householdId === householdId && entry.customerId === customerId))
    );
    return { ok: true as const, message: "Household member removed." };
  };

  const updateHouseholdMember = (
    householdId: string,
    customerId: string,
    updates: Partial<
      Pick<
        HouseholdMember,
        "role" | "relationship" | "canCheckInOthers" | "canPurchaseForOthers" | "canSignWaivers" | "emergencyContactPriority"
        | "memberType"
      >
    >
  ) => {
    const exists = householdMembers.some(
      (entry) => entry.householdId === householdId && entry.customerId === customerId
    );
    if (!exists) return { ok: false as const, message: "Household member not found." };
    setHouseholdMembers((prev) =>
      prev.map((entry) =>
        entry.householdId === householdId && entry.customerId === customerId ? { ...entry, ...updates } : entry
      )
    );
    return { ok: true as const, message: "Household member updated." };
  };

  const familyCheckIn = (input: {
    actingCustomerId: string;
    memberIds: string[];
    staffUserId: string;
    staffName?: string;
  }) => {
    if (!isActiveDateToday) {
      return { ok: false as const, message: "Historical check-in logs are read-only.", successes: [], failures: [] };
    }
    if (!input.staffUserId) {
      return { ok: false as const, message: "Select staff PIN to continue.", successes: [], failures: [] };
    }

    const actingMembership = householdMembers.find((entry) => entry.customerId === input.actingCustomerId);
    if (!actingMembership) {
      return { ok: false as const, message: "Acting customer is not in a household.", successes: [], failures: [] };
    }
    if (!actingMembership.canCheckInOthers) {
      return { ok: false as const, message: "Guardian approval required.", successes: [], failures: [] };
    }

    const householdId = actingMembership.householdId;
    const allowedMembers = householdMembers
      .filter((entry) => entry.householdId === householdId)
      .map((entry) => entry.customerId);
    const targets = input.memberIds.filter((memberId) => allowedMembers.includes(memberId));

    const successes: string[] = [];
    const failures: string[] = [];
    targets.forEach((memberId) => {
      const result = checkInCustomer(memberId, {
        staffUserId: input.staffUserId,
        staffName: input.staffName,
        source: "manual_search",
        overrideReason: `Family check-in by ${input.actingCustomerId}`
      });
      if (result.ok) successes.push(memberId);
      else failures.push(result.message);
    });

    return {
      ok: failures.length === 0,
      message:
        failures.length === 0
          ? `Checked in ${successes.length} household member${successes.length === 1 ? "" : "s"}.`
          : `Checked in ${successes.length}. ${failures.length} could not be checked in.`,
      successes,
      failures
    };
  };

  const value = useMemo<CustomerStateContextValue>(
    () => ({
      customers,
      billingAccounts,
      billingCreditEntries,
      billingInvoices,
      billingStatements,
      membershipRenewals,
      billingRefunds,
      memberships,
      punchPasses,
      accessProducts,
      inventoryAuditEntries,
      productCategories,
      transactions,
      programs,
      sessions,
      registrations,
      registrationActivity,
      customerAccessRecords,
      waivers,
      signedWaiverRecords,
      waiverTemplates,
      waiverTemplateVersions,
      households,
      householdMembers,
      rentableResources,
      reservations,
      maintenanceBlocks,
      communicationTemplates,
      communications,
      membershipCardEvents,
      operationsAlerts,
      operationsTasks,
      checkInRecords: checkInLogRecords,
      activeLocationId,
      activeDateKey,
      setToday: () => setActiveDateKey(BASE_DATE),
      goToPreviousDay: () => setActiveDateKey((prev) => addDays(prev, -1)),
      goToNextDay: () => setActiveDateKey((prev) => addDays(prev, 1)),
      isActiveDateToday,
      todayLogRecords,
      occupancyCount,
      totalCheckIns,
      checkedOutCount,
      evaluateCustomerEntry,
      searchCustomers(query: string) {
        const q = query.trim().toLowerCase();
        if (!q || !isActiveDateToday) return [];
        return customers.filter((customer) => {
          const cardRecord = selectPrimaryMembershipCardRecord(
            customerAccessRecords.filter((entry) => entry.customerId === customer.id)
          );
          const membershipTerms = cardRecord
            ? buildMembershipCardSearchTerms({
                customer,
                accessRecord: cardRecord,
                orgSlug
              })
            : [];
          const haystack = [
            customer.firstName,
            customer.lastName,
            `${customer.firstName} ${customer.lastName}`,
            customer.memberId,
            customer.email,
            customer.phone,
            ...membershipTerms
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
      },
      checkInCustomer,
      checkOutRecord,
      runCustomerCheckInAction,
      sellAccessProducts,
      refundTransaction,
      assignSaleCheckInSlotCustomer,
      fulfillSaleCheckInSlot,
      addCustomer,
      addStaffProfileToCustomer,
      updateStaffProfileForCustomer,
      clearStaffProfileForCustomer,
      updateCustomerProfile,
      updateCustomerPhoto,
      updateCustomerCommunicationPreferences,
      adjustBillingCredit,
      createBillingStatement,
      retryMembershipRenewal,
      markBillingInvoicePaid,
      grantTemporaryAccessForRenewal,
      createBillingRefund,
      addCustomerRelationship,
      removeCustomerRelationship,
      createSession,
      updateSession,
      cancelSession,
      registerCustomerForSession,
      cancelRegistration,
      promoteWaitlistedRegistration,
      moveRegistrationToWaitlist,
      markRegistrationAttendance,
      transferRegistration,
      duplicateRegistration,
      reorderWaitlistedRegistration,
      addRegistrationNote,
      createProgram,
      updateProgram,
      createProduct,
      updateProduct,
      createProductCategory,
      updateProductCategory,
      archiveProductCategory,
      reorderProductCategory,
      toggleProductActive,
      reorderQuickButtonProduct,
      adjustProductInventory,
      transferProductInventory,
      updateCustomerAccessRecord,
      addCustomerAccessRecord,
      updateCustomerWaiver,
      createWaiverTemplate,
      createWaiverTemplateVersion,
      updateWaiverTemplate,
      archiveWaiverTemplate,
      signWaiverForCustomer,
      completePublicCheckout,
      createCommunication,
      updateCommunication,
      markCommunicationRead,
      recordMembershipCardEvent,
      getWaiverStatusForCustomer,
      getSignedWaiverRecordsForCustomer,
      createOperationsAlert,
      resolveOperationsAlert,
      archiveOperationsAlert,
      createOperationsTask,
      updateOperationsTask,
      createRentableResource,
      updateRentableResource,
      createReservation,
      updateReservation,
      checkInReservation,
      checkOutReservation,
      cancelReservation,
      createMaintenanceBlock,
      createHousehold,
      updateHousehold,
      updateHouseholdPhoto,
      addHouseholdMember,
      removeHouseholdMember,
      updateHouseholdMember,
      familyCheckIn,
      toggleCheckIn,
      resetMockState() {
        setCustomers(seededCustomersForOrg);
        setBillingAccounts(seededBillingAccountsForOrg);
        setBillingCreditEntries(seededBillingCreditEntriesForOrg);
        setBillingInvoices(seededBillingInvoicesForOrg);
        setBillingStatements(seededBillingStatementsForOrg);
        setMembershipRenewals(seededMembershipRenewalsForOrg);
        setBillingRefunds(seededBillingRefundsForOrg);
        setMemberships(seededMembershipsForOrg);
        setPunchPasses(seededPunchPassesForOrg);
        setCheckInLogRecords(seededCheckIns);
        setAccessProducts(seededProductsForOrg.map(normalizeProductForState));
        setInventoryAuditEntries([]);
        setProductCategories(seededProductCategoriesForOrg);
        setTransactions(normalizeTransactions(seededTransactionsForOrg, seededProductsForOrg.map(normalizeProductForState)));
        setPrograms(seededProgramsForOrg);
        setSessions(seededSessionsForOrg.map((session) => normalizeSessionForState(session, seededProgramsForOrg)));
        setRegistrations(seededRegistrationsForOrg);
        setRegistrationActivity([]);
        setCustomerAccessRecords(seededAccessRecordsForOrg);
        setWaivers(seededWaiversForOrg);
        setSignedWaiverRecords(seededSignedWaiverRecordsForOrg);
        setWaiverTemplates(seededWaiverTemplatesForOrg);
        setWaiverTemplateVersions(seededWaiverTemplateVersionsForOrg);
        setHouseholds(seededHouseholdsForOrg);
        setHouseholdMembers(seededHouseholdMembersForOrg.map(normalizeHouseholdMemberForState));
        setRentableResources(seededRentableResourcesForOrg);
        setReservations(seededReservationsForOrg);
        setMaintenanceBlocks(seededMaintenanceBlocksForOrg);
        setManualCommunications(seededManualCommunicationsForOrg);
        setMembershipCardEvents([]);
        setOperationsAlertOverrides([]);
        setOperationsManualAlerts([]);
        setOperationsTasks(seededOperationsTasksForOrg);
        clearScopedMockState(
          activeOrgId,
          activeLocationId,
          ["customers", "billingAccounts", "billingCredits", "billingInvoices", "billingStatements", "membershipRenewals", "billingRefunds", "punchPasses", "checkIns", "memberships", "transactions", "products", "inventoryAudit", "productCategories", "programs", "sessions", "registrations", "registrationActivity", "accessRecords", "waivers", "signedWaiverRecords", "waiverTemplates", "waiverTemplateVersions", "households", "householdMembers", "rentableResources", "reservations", "maintenanceBlocks", "communications", "membershipCardEvents", "operationsAlertOverrides", "operationsManualAlerts", "operationsTasks"]
        );
      }
    }),
    [
      customers,
      billingAccounts,
      billingCreditEntries,
      billingInvoices,
      billingStatements,
      membershipRenewals,
      billingRefunds,
      memberships,
      punchPasses,
      accessProducts,
      inventoryAuditEntries,
      productCategories,
      customerAccessRecords,
      waivers,
      signedWaiverRecords,
      waiverTemplates,
      waiverTemplateVersions,
      households,
      householdMembers,
      rentableResources,
      reservations,
      maintenanceBlocks,
      communicationTemplates,
      communications,
      membershipCardEvents,
      operationsAlerts,
      operationsTasks,
      transactions,
      programs,
      sessions,
      registrations,
      registrationActivity,
      checkInLogRecords,
      membershipCardEvents,
      seededMaintenanceBlocksForOrg,
      seededManualCommunicationsForOrg,
      seededOperationsTasksForOrg,
      seededRentableResourcesForOrg,
      seededReservationsForOrg,
      orgSlug,
      activeOrgId,
      activeLocationId,
      activeDateKey,
      isActiveDateToday,
      todayLogRecords,
      occupancyCount,
      totalCheckIns,
      checkedOutCount
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Dev helper for quickly resetting persisted mock state.
    (window as Window & { cairnResetMockState?: () => void }).cairnResetMockState = value.resetMockState;
    return () => {
      delete (window as Window & { cairnResetMockState?: () => void }).cairnResetMockState;
    };
  }, [value]);

  return <CustomerStateContext.Provider value={value}>{children}</CustomerStateContext.Provider>;
}

export function useCustomerState() {
  const ctx = useContext(CustomerStateContext);
  if (!ctx) throw new Error("useCustomerState must be used within CustomerStateProvider");
  return ctx;
}
