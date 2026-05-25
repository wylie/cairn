"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { checkInRecords as seedCheckInRecords } from "@/lib/mocks/checkins";
import { accessRecords as seedAccessRecords } from "@/lib/mocks/access-records";
import { customers as seedCustomers } from "@/lib/mocks/customers";
import { locations as seedLocations } from "@/lib/mocks/locations";
import { memberships as seedMemberships } from "@/lib/mocks/memberships";
import { punchPasses as seedPunchPasses } from "@/lib/mocks/passes";
import { posProducts as seedPosProducts } from "@/lib/mocks/products";
import { classCampSessions as seedSessions, programs as seedPrograms } from "@/lib/mocks/programs";
import { registrations as seedRegistrations } from "@/lib/mocks/registrations";
import { posTransactions as seedPosTransactions } from "@/lib/mocks/transactions";
import { waivers as seedWaivers } from "@/lib/mocks/waivers";
import { households as seedHouseholds, householdMembers as seedHouseholdMembers } from "@/lib/mocks/households";
import { buildScopedMockKey, clearScopedMockState, loadMockState, saveMockState } from "@/lib/mock-storage";
import { buildSystemProductCategories, normalizeCategoryKey } from "@/lib/products/categories";
import { isValidUsState, normalizeCity, normalizeStateInput, normalizeStreetAddress } from "@/lib/customer-input-format";
import {
  calculateTransactionTotals,
  createTransactionItem,
  normalizeCartItem,
  normalizeProductPriceCents
} from "@/lib/pos-transactions";
import type { PaymentMethod } from "@/lib/payments/provider";
import { normalizeTransactions } from "@/lib/transactions";
import { evaluateCustomerAccess, getEligibleAccess, type AccessDecision } from "@/lib/access-rules";
import type {
  CheckInLogRecord,
  CheckInSource,
  Customer,
  CustomerRelationshipType,
  Household,
  HouseholdMember,
  HouseholdMemberRole,
  HouseholdRelationship,
  CustomerAccessRecord,
  EntryMethod,
  Membership,
  PosProduct,
  PosTransaction,
  PosTransactionItem,
  PostSaleCheckInSlot,
  Program,
  ProductCategoryRecord,
  PunchPass,
  ClassCampSession,
  Registration,
  StaffPermission,
  StaffRole,
  Waiver
} from "@/types/domain";
import { resolveTenant } from "@/lib/tenant/resolve";
import { getCurrentOrgSlugClient } from "@/lib/tenant/client";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";

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
  const program = programs.find((entry) => entry.id === session.programId);
  return {
    ...session,
    title: session.title ?? program?.title ?? "Untitled Session",
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
        : seeded.emergencyContactPhone
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
  memberships: Membership[];
  punchPasses: PunchPass[];
  accessProducts: PosProduct[];
  productCategories: ProductCategoryRecord[];
  transactions: PosTransaction[];
  programs: Program[];
  sessions: ClassCampSession[];
  registrations: Registration[];
  customerAccessRecords: CustomerAccessRecord[];
  waivers: Waiver[];
  households: Household[];
  householdMembers: HouseholdMember[];
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
    title: string;
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
  registerCustomerForSession: (input: { customerId: string; sessionId: string }) => { ok: boolean; message: string; registrationId?: string };
  cancelRegistration: (registrationId: string) => { ok: boolean; message: string };
  promoteWaitlistedRegistration: (registrationId: string) => { ok: boolean; message: string };
  moveRegistrationToWaitlist: (registrationId: string) => { ok: boolean; message: string };
  markRegistrationAttendance: (
    registrationId: string,
    status: "attended" | "absent" | "late" | "excused" | "no_show" | "checked_in" | "completed",
    updatedByStaffId?: string
  ) => { ok: boolean; message: string };
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
  createHousehold: (input: {
    householdName: string;
    primaryContactCustomerId: string;
    billingCustomerId?: string;
    locationId: string;
    notes?: string;
  }) => { ok: boolean; message: string; householdId?: string };
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

  const storageKeys = useMemo(() => ({
    customers: buildScopedMockKey(activeOrgId, activeLocationId, "customers"),
    passes: buildScopedMockKey(activeOrgId, activeLocationId, "punchPasses"),
    checkins: buildScopedMockKey(activeOrgId, activeLocationId, "checkIns"),
    memberships: buildScopedMockKey(activeOrgId, activeLocationId, "memberships"),
    transactions: buildScopedMockKey(activeOrgId, activeLocationId, "transactions"),
    products: buildScopedMockKey(activeOrgId, activeLocationId, "products"),
    productCategories: buildScopedMockKey(activeOrgId, activeLocationId, "productCategories"),
    programs: buildScopedMockKey(activeOrgId, activeLocationId, "programs"),
    sessions: buildScopedMockKey(activeOrgId, activeLocationId, "sessions"),
    registrations: buildScopedMockKey(activeOrgId, activeLocationId, "registrations"),
    accessRecords: buildScopedMockKey(activeOrgId, activeLocationId, "accessRecords"),
    waivers: buildScopedMockKey(activeOrgId, activeLocationId, "waivers"),
    households: buildScopedMockKey(activeOrgId, activeLocationId, "households"),
    householdMembers: buildScopedMockKey(activeOrgId, activeLocationId, "householdMembers")
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
  const [memberships, setMemberships] = useState<Membership[]>(seededMembershipsForOrg);
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>(seededPunchPassesForOrg);
  const [transactions, setTransactions] = useState<PosTransaction[]>(
    normalizeTransactions(seededTransactionsForOrg as Partial<PosTransaction>[], seededProductsForOrg)
  );
  const [accessProducts, setAccessProducts] = useState<PosProduct[]>(seededProductsForOrg);
  const [productCategories, setProductCategories] = useState<ProductCategoryRecord[]>(seededProductCategoriesForOrg);
  const [programs, setPrograms] = useState<Program[]>(seededProgramsForOrg);
  const [sessions, setSessions] = useState<ClassCampSession[]>(
    seededSessionsForOrg.map((session) => normalizeSessionForState(session, seededProgramsForOrg))
  );
  const [registrations, setRegistrations] = useState<Registration[]>(seededRegistrationsForOrg);
  const [customerAccessRecords, setCustomerAccessRecords] = useState<CustomerAccessRecord[]>(seededAccessRecordsForOrg);
  const [waivers, setWaivers] = useState<Waiver[]>(seededWaiversForOrg);
  const [households, setHouseholds] = useState<Household[]>(seededHouseholdsForOrg);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>(
    seededHouseholdMembersForOrg.map(normalizeHouseholdMemberForState)
  );
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
    return evaluateCustomerAccess({
      customer,
      waiver,
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
    const storedPrograms = (loadMockState(storageKeys.programs, seededProgramsForOrg) as Program[]).map(normalizeProgramForState);
    const storedCheckIns = loadMockState(storageKeys.checkins, seededCheckIns).map((record) => ({
      ...record,
      checkedInByStaffId: record.checkedInByStaffId ?? record.staffUserId ?? "",
      checkedInByStaffName: record.checkedInByStaffName
    }));

    const loadedCustomers = loadMockState(storageKeys.customers, seededCustomersForOrg) as Customer[];
    setCustomers(normalizeCustomersForState(mergeSeedCustomers(loadedCustomers, seededCustomersForOrg), seededCustomersForOrg));
    setMemberships(loadMockState(storageKeys.memberships, seededMembershipsForOrg));
    setPunchPasses(loadMockState(storageKeys.passes, seededPunchPassesForOrg));
    setAccessProducts(products);
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
    setCustomerAccessRecords(loadMockState(storageKeys.accessRecords, seededAccessRecordsForOrg) as CustomerAccessRecord[]);
    setWaivers(loadMockState(storageKeys.waivers, seededWaiversForOrg) as Waiver[]);
    setHouseholds(loadMockState(storageKeys.households, seededHouseholdsForOrg) as Household[]);
    setHouseholdMembers(
      (loadMockState(storageKeys.householdMembers, seededHouseholdMembersForOrg) as HouseholdMember[]).map(
        normalizeHouseholdMemberForState
      )
    );
    setTransactions(
      normalizeTransactions(loadMockState(storageKeys.transactions, seededTransactionsForOrg) as Partial<PosTransaction>[], products)
    );
    setCheckInLogRecords(storedCheckIns);
    setHydrated(true);
  }, [activeOrgId, activeLocationId]);

  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.customers, customers);
  }, [customers, hydrated]);

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
    saveMockState(storageKeys.accessRecords, customerAccessRecords);
  }, [customerAccessRecords, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(storageKeys.waivers, waivers);
  }, [waivers, hydrated]);
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
    saveMockState(storageKeys.checkins, checkInLogRecords);
  }, [checkInLogRecords, hydrated]);

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
          type: "multi_visit"
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

    const cartItems = selectedProducts.map((product) => normalizeCartItem(product));
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
      transactionType: "sale",
      returnStatus: "none",
      soldByStaffId: options.soldByStaffId,
      soldByStaffName: options.soldByStaffName,
      items,
      subtotal,
      total,
      completedAt: `${activeDateKey}T15:30:00Z`,
      paymentType: options.paymentType ?? "mock",
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
              updatedByStaffId: input.updatedByStaffId,
              updatedByStaffName: input.updatedByStaffName,
              updatedAt
            }
      )
    );

    return { ok: true as const, message: "Profile updated." };
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
      title: input.title?.trim() || program.title,
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
    title: string;
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
              title: input.title.trim() || existing.title || "Untitled Session",
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

  const registerCustomerForSession = (input: { customerId: string; sessionId: string }) => {
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
    const dob = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
    const age =
      dob && !Number.isNaN(dob.getTime())
        ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
        : undefined;
    if (typeof program.minimumAge === "number" && typeof age === "number" && age < program.minimumAge) {
      return { ok: false, message: "Blocked: Customer is below minimum age for this program." };
    }
    if (typeof program.maximumAge === "number" && typeof age === "number" && age > program.maximumAge) {
      return { ok: false, message: "Blocked: Customer is above maximum age for this program." };
    }
    if (program.requiresWaiver && !hasValidWaiver) {
      return { ok: false, message: "Blocked: Waiver missing or expired." };
    }
    if (program.memberRequired) {
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
    if (program.guardianRequired) {
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
    return {
      ok: true,
      message: sessionIsFull
        ? `${customer.firstName} ${customer.lastName} added to waitlist (#${waitlistPosition}).`
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
    return { ok: true as const, message: `Marked ${status}.` };
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

  const createHousehold = (input: {
    householdName: string;
    primaryContactCustomerId: string;
    billingCustomerId?: string;
    locationId: string;
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
      billingCustomerId,
      locationId: input.locationId,
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
      memberships,
      punchPasses,
      accessProducts,
      productCategories,
      transactions,
      programs,
      sessions,
      registrations,
      customerAccessRecords,
      waivers,
      households,
      householdMembers,
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
          const haystack = [
            customer.firstName,
            customer.lastName,
            `${customer.firstName} ${customer.lastName}`,
            customer.memberId,
            customer.email,
            customer.phone
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
      updateCustomerAccessRecord,
      addCustomerAccessRecord,
      updateCustomerWaiver,
      createHousehold,
      addHouseholdMember,
      removeHouseholdMember,
      updateHouseholdMember,
      familyCheckIn,
      toggleCheckIn,
      resetMockState() {
        setCustomers(seededCustomersForOrg);
        setMemberships(seededMembershipsForOrg);
        setPunchPasses(seededPunchPassesForOrg);
        setCheckInLogRecords(seededCheckIns);
        setAccessProducts(seededProductsForOrg.map(normalizeProductForState));
        setProductCategories(seededProductCategoriesForOrg);
        setTransactions(normalizeTransactions(seededTransactionsForOrg, seededProductsForOrg.map(normalizeProductForState)));
        setPrograms(seededProgramsForOrg);
        setSessions(seededSessionsForOrg.map((session) => normalizeSessionForState(session, seededProgramsForOrg)));
        setRegistrations(seededRegistrationsForOrg);
        setCustomerAccessRecords(seededAccessRecordsForOrg);
        setWaivers(seededWaiversForOrg);
        setHouseholds(seededHouseholdsForOrg);
        setHouseholdMembers(seededHouseholdMembersForOrg.map(normalizeHouseholdMemberForState));
        clearScopedMockState(
          activeOrgId,
          activeLocationId,
          ["customers", "punchPasses", "checkIns", "memberships", "transactions", "products", "productCategories", "programs", "sessions", "registrations", "accessRecords", "waivers", "households", "householdMembers"]
        );
      }
    }),
    [
      customers,
      memberships,
      punchPasses,
      accessProducts,
      productCategories,
      customerAccessRecords,
      waivers,
      households,
      householdMembers,
      transactions,
      programs,
      sessions,
      registrations,
      checkInLogRecords,
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
