"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { isValidUsState, normalizeCity, normalizeStateInput, normalizeStreetAddress } from "@/lib/customer-input-format";
import {
  calculateTransactionTotals,
  createTransactionItem,
  normalizeCartItem,
  normalizeProductPriceCents
} from "@/lib/pos-transactions";
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
  PunchPass,
  ClassCampSession,
  Registration,
  Waiver
} from "@/types/domain";

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
  return {
    ...product,
    priceCents: normalizedPriceCents ?? 0
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

function normalizeCustomersForState(customers: Customer[]): Customer[] {
  const seededById = new Map(seedCustomers.map((customer) => [customer.id, customer]));
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
  ) => { ok: boolean; message: string };
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
    checkInAfterSale?: boolean;
  }) => { ok: boolean; message: string; transactionId?: string; transaction?: PosTransaction };
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
  createProgram: (input: {
    title: string;
    description?: string;
    category: Program["category"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    minimumAge?: number;
    maximumAge?: number;
  }) => { ok: boolean; message: string; programId?: string };
  updateProgram: (input: {
    id: string;
    title: string;
    description?: string;
    category: Program["category"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    minimumAge?: number;
    maximumAge?: number;
  }) => { ok: boolean; message: string };
  createProduct: (
    input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }
  ) => { ok: boolean; message: string; productId?: string };
  updateProduct: (
    productId: string,
    input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }
  ) => { ok: boolean; message: string };
  toggleProductActive: (productId: string) => { ok: boolean; message: string };
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
    updates: Partial<Pick<HouseholdMember, "role" | "relationship" | "canCheckInOthers" | "canPurchaseForOthers" | "canSignWaivers" | "emergencyContactPriority">>
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
  const storageKeys = {
    customers: buildScopedMockKey("org_summit", "loc_001", "customers"),
    passes: buildScopedMockKey("org_summit", "loc_001", "punchPasses"),
    checkins: buildScopedMockKey("org_summit", "loc_001", "checkIns"),
    memberships: buildScopedMockKey("org_summit", "loc_001", "memberships"),
    transactions: buildScopedMockKey("org_summit", "loc_001", "transactions"),
    products: buildScopedMockKey("org_summit", "loc_001", "products"),
    programs: buildScopedMockKey("org_summit", "loc_001", "programs"),
    sessions: buildScopedMockKey("org_summit", "loc_001", "sessions"),
    registrations: buildScopedMockKey("org_summit", "loc_001", "registrations"),
    accessRecords: buildScopedMockKey("org_summit", "loc_001", "accessRecords"),
    waivers: buildScopedMockKey("org_summit", "loc_001", "waivers"),
    households: buildScopedMockKey("org_summit", "loc_001", "households"),
    householdMembers: buildScopedMockKey("org_summit", "loc_001", "householdMembers")
  };

  const initialStateRef = useRef<{
    customers: Customer[];
    memberships: Membership[];
    punchPasses: PunchPass[];
    transactions: PosTransaction[];
    accessProducts: PosProduct[];
    programs: Program[];
    sessions: ClassCampSession[];
    registrations: Registration[];
    accessRecords: CustomerAccessRecord[];
    waivers: Waiver[];
    households: Household[];
    householdMembers: HouseholdMember[];
    checkIns: CheckInLogRecord[];
  } | null>(null);

  if (!initialStateRef.current) {
    const products = (loadMockState(storageKeys.products, seedPosProducts) as PosProduct[]).map(normalizeProductForState);
    const programs = (loadMockState(storageKeys.programs, seedPrograms) as Program[]).map(normalizeProgramForState);
    initialStateRef.current = {
      customers: normalizeCustomersForState(loadMockState(storageKeys.customers, seedCustomers)),
      memberships: loadMockState(storageKeys.memberships, seedMemberships),
      punchPasses: loadMockState(storageKeys.passes, seedPunchPasses),
      transactions: normalizeTransactions(
        loadMockState(storageKeys.transactions, seedPosTransactions) as Partial<PosTransaction>[],
        products
      ),
      accessProducts: products,
      programs,
      sessions: (loadMockState(storageKeys.sessions, seedSessions) as ClassCampSession[]).map((session) =>
        normalizeSessionForState(session, programs)
      ),
      registrations: loadMockState(storageKeys.registrations, seedRegistrations),
      accessRecords: loadMockState(storageKeys.accessRecords, seedAccessRecords) as CustomerAccessRecord[],
      waivers: loadMockState(storageKeys.waivers, seedWaivers) as Waiver[],
      households: loadMockState(storageKeys.households, seedHouseholds) as Household[],
      householdMembers: loadMockState(storageKeys.householdMembers, seedHouseholdMembers) as HouseholdMember[],
      checkIns: loadMockState(storageKeys.checkins, seedCheckInRecords).map((record) => ({
        ...record,
        checkedInByStaffId: record.checkedInByStaffId ?? record.staffUserId ?? "",
        checkedInByStaffName: record.checkedInByStaffName
      }))
    };
  }

  const [customers, setCustomers] = useState<Customer[]>(initialStateRef.current.customers);
  const [memberships, setMemberships] = useState<Membership[]>(initialStateRef.current.memberships);
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>(initialStateRef.current.punchPasses);
  const [transactions, setTransactions] = useState<PosTransaction[]>(initialStateRef.current.transactions);
  const [accessProducts, setAccessProducts] = useState<PosProduct[]>(initialStateRef.current.accessProducts);
  const [programs, setPrograms] = useState<Program[]>(initialStateRef.current.programs);
  const [sessions, setSessions] = useState<ClassCampSession[]>(initialStateRef.current.sessions);
  const [registrations, setRegistrations] = useState<Registration[]>(initialStateRef.current.registrations);
  const [customerAccessRecords, setCustomerAccessRecords] = useState<CustomerAccessRecord[]>(initialStateRef.current.accessRecords);
  const [waivers, setWaivers] = useState<Waiver[]>(initialStateRef.current.waivers);
  const [households, setHouseholds] = useState<Household[]>(initialStateRef.current.households);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>(initialStateRef.current.householdMembers);
  const [checkInLogRecords, setCheckInLogRecords] = useState<CheckInLogRecord[]>(initialStateRef.current.checkIns.map((record) => ({
      ...record,
      checkedInByStaffId: record.checkedInByStaffId ?? record.staffUserId ?? "",
      checkedInByStaffName: record.checkedInByStaffName
    })));
  const [activeDateKey, setActiveDateKey] = useState<string>(BASE_DATE);
  const activeLocationId = "loc_001";

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
    saveMockState(storageKeys.customers, customers);
  }, [customers]);

  useEffect(() => {
    saveMockState(storageKeys.passes, punchPasses);
  }, [punchPasses]);
  useEffect(() => {
    saveMockState(storageKeys.memberships, memberships);
  }, [memberships]);
  useEffect(() => {
    saveMockState(storageKeys.transactions, transactions);
  }, [transactions]);
  useEffect(() => {
    saveMockState(storageKeys.products, accessProducts);
  }, [accessProducts]);
  useEffect(() => {
    saveMockState(storageKeys.programs, programs);
  }, [programs]);
  useEffect(() => {
    saveMockState(storageKeys.sessions, sessions);
  }, [sessions]);
  useEffect(() => {
    saveMockState(storageKeys.registrations, registrations);
  }, [registrations]);
  useEffect(() => {
    saveMockState(storageKeys.accessRecords, customerAccessRecords);
  }, [customerAccessRecords]);
  useEffect(() => {
    saveMockState(storageKeys.waivers, waivers);
  }, [waivers]);
  useEffect(() => {
    saveMockState(storageKeys.households, households);
  }, [households]);
  useEffect(() => {
    saveMockState(storageKeys.householdMembers, householdMembers);
  }, [householdMembers]);

  useEffect(() => {
    saveMockState(storageKeys.checkins, checkInLogRecords);
  }, [checkInLogRecords]);

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
      message: `Check-in recorded for ${customer.firstName} ${customer.lastName}. ${accessUsedMessage}${warningSuffix}`.trim()
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
      paymentType: "mock",
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
      organizationId: "org_summit",
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

    const existing = registrations.find((entry) => entry.customerId === input.customerId && entry.sessionId === input.sessionId && entry.status !== "cancelled");
    if (existing) return { ok: false, message: `${customer.firstName} ${customer.lastName} is already registered.` };
    const sessionIsFull = session.enrolled >= session.capacity;
    if (sessionIsFull && !session.waitlistEnabled) return { ok: false, message: "Session is full." };

    const registrationId = `reg_${Math.random().toString(36).slice(2, 9)}`;
    const registration: Registration = {
      id: registrationId,
      customerId: customer.id,
      sessionId: session.id,
      status: sessionIsFull ? "waitlisted" : "confirmed"
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
    return { ok: true, message: `Registration confirmed for ${customer.firstName} ${customer.lastName}.`, registrationId };
  };

  const cancelRegistration = (registrationId: string) => {
    const existing = registrations.find((entry) => entry.id === registrationId);
    if (!existing) return { ok: false as const, message: "Registration not found." };
    if (existing.status === "cancelled") return { ok: true as const, message: "Registration already cancelled." };

    setRegistrations((prev) => prev.map((entry) => (entry.id === registrationId ? { ...entry, status: "cancelled" } : entry)));
    setSessions((prev) =>
      prev.map((entry) => {
        if (entry.id !== existing.sessionId) return entry;
        if (existing.status === "waitlisted") {
          return { ...entry, waitlistCount: Math.max((entry.waitlistCount ?? 0) - 1, 0) };
        }
        return { ...entry, enrolled: Math.max(entry.enrolled - 1, 0) };
      })
    );
    return { ok: true as const, message: "Registration cancelled." };
  };

  const createProgram = (input: {
    title: string;
    description?: string;
    category: Program["category"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    minimumAge?: number;
    maximumAge?: number;
  }) => {
    const title = input.title.trim();
    if (!title) return { ok: false as const, message: "Program name is required." };
    const id = `prog_${Math.random().toString(36).slice(2, 9)}`;
    const next: Program = {
      id,
      organizationId: "org_summit",
      title,
      description: input.description?.trim() || undefined,
      category: input.category,
      active: input.active,
      colorToken: input.colorToken,
      defaultCapacity: input.defaultCapacity,
      requiresWaiver: input.requiresWaiver,
      minimumAge: Number.isFinite(input.minimumAge) ? input.minimumAge : undefined,
      maximumAge: Number.isFinite(input.maximumAge) ? input.maximumAge : undefined
    };
    setPrograms((prev) => [next, ...prev]);
    return { ok: true as const, message: `Program created: ${title}.`, programId: id };
  };

  const updateProgram = (input: {
    id: string;
    title: string;
    description?: string;
    category: Program["category"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    minimumAge?: number;
    maximumAge?: number;
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
              active: input.active,
              colorToken: input.colorToken,
              defaultCapacity: input.defaultCapacity,
              requiresWaiver: input.requiresWaiver,
              minimumAge: Number.isFinite(input.minimumAge) ? input.minimumAge : undefined,
              maximumAge: Number.isFinite(input.maximumAge) ? input.maximumAge : undefined
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
    const next: PosProduct = normalizeProductForState({ ...parsed.product, id, organizationId: "org_summit" });
    setAccessProducts((prev) => [next, ...prev]);
    return { ok: true as const, message: `Product created: ${next.name}.`, productId: id };
  };

  const updateProduct = (productId: string, input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }) => {
    const parsed = parseProductInput(input);
    if (!parsed.ok) return parsed;
    const existing = accessProducts.find((entry) => entry.id === productId);
    if (!existing) return { ok: false as const, message: "Product not found." };

    const next: PosProduct = normalizeProductForState({ ...existing, ...parsed.product });
    setAccessProducts((prev) => prev.map((entry) => (entry.id === productId ? next : entry)));
    return { ok: true as const, message: `Product updated: ${next.name}.` };
  };

  const toggleProductActive = (productId: string) => {
    const existing = accessProducts.find((entry) => entry.id === productId);
    if (!existing) return { ok: false as const, message: "Product not found." };
    setAccessProducts((prev) => prev.map((entry) => (entry.id === productId ? { ...entry, active: entry.active === false } : entry)));
    return { ok: true as const, message: `${existing.name} ${existing.active === false ? "activated" : "deactivated"}.` };
  };

  const updateCustomerAccessRecord = (accessId: string, updates: Partial<CustomerAccessRecord>) => {
    const existing = customerAccessRecords.find((entry) => entry.id === accessId);
    if (!existing) return { ok: false as const, message: "Access record not found." };
    setCustomerAccessRecords((prev) => prev.map((entry) => (entry.id === accessId ? { ...entry, ...updates } : entry)));
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
          role: "primary-adult",
          relationship: "guardian",
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
      assignSaleCheckInSlotCustomer,
      fulfillSaleCheckInSlot,
      addCustomer,
      updateCustomerProfile,
      addCustomerRelationship,
      removeCustomerRelationship,
      createSession,
      updateSession,
      cancelSession,
      registerCustomerForSession,
      cancelRegistration,
      createProgram,
      updateProgram,
      createProduct,
      updateProduct,
      toggleProductActive,
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
        setCustomers(seedCustomers);
        setMemberships(seedMemberships);
        setPunchPasses(seedPunchPasses);
        setCheckInLogRecords(seedCheckInRecords);
        setAccessProducts(seedPosProducts.map(normalizeProductForState));
        setTransactions(normalizeTransactions(seedPosTransactions, seedPosProducts.map(normalizeProductForState)));
        setPrograms(seedPrograms);
        setSessions(seedSessions.map((session) => normalizeSessionForState(session, seedPrograms)));
        setRegistrations(seedRegistrations);
        setCustomerAccessRecords(seedAccessRecords);
        setWaivers(seedWaivers);
        setHouseholds(seedHouseholds);
        setHouseholdMembers(seedHouseholdMembers);
        clearScopedMockState(
          "org_summit",
          "loc_001",
          ["customers", "punchPasses", "checkIns", "memberships", "transactions", "products", "programs", "sessions", "registrations", "accessRecords", "waivers", "households", "householdMembers"]
        );
      }
    }),
    [
      customers,
      memberships,
      punchPasses,
      accessProducts,
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
