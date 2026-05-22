"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { checkInRecords as seedCheckInRecords } from "@/lib/mocks/checkins";
import { customers as seedCustomers } from "@/lib/mocks/customers";
import { memberships as seedMemberships } from "@/lib/mocks/memberships";
import { punchPasses as seedPunchPasses } from "@/lib/mocks/passes";
import { posProducts as seedPosProducts } from "@/lib/mocks/products";
import { classCampSessions as seedSessions, programs as seedPrograms } from "@/lib/mocks/programs";
import { registrations as seedRegistrations } from "@/lib/mocks/registrations";
import { posTransactions as seedPosTransactions } from "@/lib/mocks/transactions";
import { buildScopedMockKey, clearScopedMockState, loadMockState, saveMockState } from "@/lib/mock-storage";
import {
  calculateTransactionTotals,
  createTransactionItem,
  normalizeCartItem,
  normalizeProductPriceCents
} from "@/lib/pos-transactions";
import { normalizeTransactions } from "@/lib/transactions";
import type {
  CheckInLogRecord,
  CheckInSource,
  Customer,
  EntryMethod,
  Membership,
  PosProduct,
  PosTransaction,
  PosTransactionItem,
  Program,
  PunchPass,
  ClassCampSession,
  Registration
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

interface CustomerStateContextValue {
  customers: Customer[];
  memberships: Membership[];
  punchPasses: PunchPass[];
  accessProducts: PosProduct[];
  transactions: PosTransaction[];
  programs: Program[];
  sessions: ClassCampSession[];
  registrations: Registration[];
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
  searchCustomers: (query: string) => Customer[];
  checkInCustomer: (
    customerId: string,
    options: { staffUserId: string; staffName?: string; source?: CheckInSource; overrideReason?: string; customerOverride?: Customer }
  ) => { ok: boolean; message: string };
  checkOutRecord: (recordId: string, staffUserId: string, staffName?: string) => { ok: boolean; message: string };
  runCustomerCheckInAction: (
    customerId: string,
    options: { staffUserId: string; staffName?: string; source?: CheckInSource; overrideReason?: string }
  ) => { ok: boolean; message: string; action: "check-in" | "check-out" };
  sellAccessProducts: (options: {
    customerId: string;
    productIds: string[];
    soldByStaffId: string;
    soldByStaffName?: string;
    checkInAfterSale?: boolean;
  }) => { ok: boolean; message: string; transactionId?: string; transaction?: PosTransaction };
  addCustomer: (input: { firstName: string; lastName: string; email?: string; phone?: string }) => { ok: boolean; message: string; customerId?: string };
  createSession: (input: { programId: string; startsAt: string; endsAt: string; capacity: number }) => { ok: boolean; message: string; sessionId?: string };
  registerCustomerForSession: (input: { customerId: string; sessionId: string }) => { ok: boolean; message: string; registrationId?: string };
  createProduct: (
    input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }
  ) => { ok: boolean; message: string; productId?: string };
  updateProduct: (
    productId: string,
    input: Omit<PosProduct, "id" | "organizationId"> & { price: string | number }
  ) => { ok: boolean; message: string };
  toggleProductActive: (productId: string) => { ok: boolean; message: string };
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
    registrations: buildScopedMockKey("org_summit", "loc_001", "registrations")
  };

  const loadedProducts = (loadMockState(storageKeys.products, seedPosProducts) as PosProduct[]).map(normalizeProductForState);
  const loadedTransactions = normalizeTransactions(
    loadMockState(storageKeys.transactions, seedPosTransactions) as Partial<PosTransaction>[],
    loadedProducts
  );

  const [customers, setCustomers] = useState<Customer[]>(() => loadMockState(storageKeys.customers, seedCustomers));
  const [memberships, setMemberships] = useState<Membership[]>(() => loadMockState(storageKeys.memberships, seedMemberships));
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>(() => loadMockState(storageKeys.passes, seedPunchPasses));
  const [transactions, setTransactions] = useState<PosTransaction[]>(() => loadedTransactions);
  const [accessProducts, setAccessProducts] = useState<PosProduct[]>(() => loadedProducts);
  const [programs, setPrograms] = useState<Program[]>(() => loadMockState(storageKeys.programs, seedPrograms));
  const [sessions, setSessions] = useState<ClassCampSession[]>(() => loadMockState(storageKeys.sessions, seedSessions));
  const [registrations, setRegistrations] = useState<Registration[]>(() => loadMockState(storageKeys.registrations, seedRegistrations));
  const [checkInLogRecords, setCheckInLogRecords] = useState<CheckInLogRecord[]>(() =>
    loadMockState(storageKeys.checkins, seedCheckInRecords).map((record) => ({
      ...record,
      checkedInByStaffId: record.checkedInByStaffId ?? record.staffUserId ?? "",
      checkedInByStaffName: record.checkedInByStaffName
    }))
  );
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
    options: { staffUserId: string; staffName?: string; source?: CheckInSource; overrideReason?: string; customerOverride?: Customer }
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

    const membership = customer.membershipId ? memberships.find((m) => m.id === customer.membershipId) : undefined;
    const pass = customer.punchPassId ? punchPasses.find((p) => p.id === customer.punchPassId) : undefined;

    let entryMethod: EntryMethod | null = null;
    let membershipPassType = "";
    let passProductUsed: string | undefined;
    let punchesUsed: number | undefined;
    let punchesRemaining: number | undefined;

    if (membership && membership.status === "active") {
      entryMethod = "membership";
      membershipPassType = membership.planName;
      passProductUsed = membership.planName;
    } else if (pass && pass.remainingUses > 0) {
      entryMethod = "multi_visit_pass";
      membershipPassType = pass.title;
      passProductUsed = pass.title;
      punchesUsed = 1;
      punchesRemaining = pass.remainingUses - 1;
      setPunchPasses((prev) => prev.map((entry) => (entry.id === pass.id ? { ...entry, remainingUses: entry.remainingUses - 1 } : entry)));
    } else if (customer.dayPassProductName) {
      entryMethod = "day_pass";
      membershipPassType = customer.dayPassProductName;
      passProductUsed = customer.dayPassProductName;
    } else if (options.overrideReason) {
      entryMethod = "staff_comp";
      membershipPassType = "Staff/Manual Comp";
      passProductUsed = "Manual Access Override";
    }

    if (!entryMethod) {
      return { ok: false, message: `${customer.firstName} ${customer.lastName} has no valid access method.` };
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
      checkedInByStaffId: options.staffUserId,
      checkedInByStaffName: options.staffName,
      overriddenByStaffId: options.overrideReason ? options.staffUserId : undefined,
      overrideReason: options.overrideReason
    };

    setCheckInLogRecords((prev) => [newRecord, ...prev]);
    setCustomers((prev) => prev.map((entry) => (entry.id === customerId ? { ...entry, checkInStatus: "in" } : entry)));

    return { ok: true, message: `Check-in recorded for ${customer.firstName} ${customer.lastName}.` };
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

    const selectedProducts = accessProducts.filter((product) => options.productIds.includes(product.id));
    if (selectedProducts.length === 0) return { ok: false, message: "Select at least one access product." };

    let nextCustomer = customer;
    let createdPass: PunchPass | null = null;
    let createdMembership: Membership | null = null;

    selectedProducts.forEach((product) => {
      if (product.category === "day_passes" || product.category === "classes" || product.category === "camps" || product.category === "comps") {
        nextCustomer = { ...nextCustomer, dayPassProductName: product.name };
      }

      if (product.category === "punch_passes" || product.accessBehavior === "punch_decrement") {
        const passId = `pass_${Math.random().toString(36).slice(2, 8)}`;
        createdPass = {
          id: passId,
          customerId: customer.id,
          title: product.name,
          originalUses: product.punchQuantity ?? 10,
          remainingUses: product.punchQuantity ?? 10,
          expiresAt: "2026-06-30",
          type: "multi_visit"
        };
        nextCustomer = { ...nextCustomer, punchPassId: passId, dayPassProductName: undefined };
      }

      if (product.category === "memberships" || product.type === "membership") {
        const membershipId = `mem_${Math.random().toString(36).slice(2, 8)}`;
        createdMembership = {
          id: membershipId,
          customerId: customer.id,
          planName: product.name,
          status: "active",
          renewalDate: "2026-06-20"
        };
        nextCustomer = { ...nextCustomer, membershipId, dayPassProductName: undefined };
      }
    });

    if (createdPass) setPunchPasses((prev) => [createdPass as PunchPass, ...prev]);
    if (createdMembership) setMemberships((prev) => [createdMembership as Membership, ...prev]);
    setCustomers((prev) => prev.map((entry) => (entry.id === customer.id ? nextCustomer : entry)));

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
    const transaction: PosTransaction = {
      id: `txn_${Math.random().toString(36).slice(2, 9)}`,
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
      receiptNumber
    };
    setTransactions((prev) => [transaction, ...prev]);

    if (options.checkInAfterSale) {
      const checkInResult = checkInCustomer(customer.id, {
        staffUserId: options.soldByStaffId,
        staffName: options.soldByStaffName,
        source: "pos_sale",
        customerOverride: nextCustomer
      });
      if (!checkInResult.ok) return { ok: false, message: checkInResult.message };
    }

    return {
      ok: true,
      message: `Sale completed for ${customer.firstName} ${customer.lastName}.`,
      transactionId: transaction.id,
      transaction
    };
  };

  const addCustomer = (input: { firstName: string; lastName: string; email?: string; phone?: string }) => {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) return { ok: false, message: "First and last name are required." };

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
      email: input.email?.trim() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: input.phone?.trim() || "",
      tags: [],
      checkInStatus: "out",
      notes: ""
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    return { ok: true, message: `Customer created: ${firstName} ${lastName}.`, customerId: id };
  };

  const createSession = (input: { programId: string; startsAt: string; endsAt: string; capacity: number }) => {
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
      locationId: activeLocationId,
      startsAt,
      endsAt,
      capacity: Math.round(input.capacity),
      enrolled: 0
    };
    setSessions((prev) => [next, ...prev]);
    return { ok: true, message: `Session created for ${program.title}.`, sessionId };
  };

  const registerCustomerForSession = (input: { customerId: string; sessionId: string }) => {
    const customer = customers.find((entry) => entry.id === input.customerId);
    if (!customer) return { ok: false, message: "Customer not found." };
    const session = sessions.find((entry) => entry.id === input.sessionId);
    if (!session) return { ok: false, message: "Session not found." };

    const existing = registrations.find((entry) => entry.customerId === input.customerId && entry.sessionId === input.sessionId && entry.status !== "cancelled");
    if (existing) return { ok: false, message: `${customer.firstName} ${customer.lastName} is already registered.` };
    if (session.enrolled >= session.capacity) return { ok: false, message: "Session is full." };

    const registrationId = `reg_${Math.random().toString(36).slice(2, 9)}`;
    const registration: Registration = {
      id: registrationId,
      customerId: customer.id,
      sessionId: session.id,
      status: "confirmed"
    };

    setRegistrations((prev) => [registration, ...prev]);
    setSessions((prev) => prev.map((entry) => (entry.id === session.id ? { ...entry, enrolled: entry.enrolled + 1 } : entry)));
    return { ok: true, message: `Registration confirmed for ${customer.firstName} ${customer.lastName}.`, registrationId };
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
      addCustomer,
      createSession,
      registerCustomerForSession,
      createProduct,
      updateProduct,
      toggleProductActive,
      toggleCheckIn,
      resetMockState() {
        setCustomers(seedCustomers);
        setMemberships(seedMemberships);
        setPunchPasses(seedPunchPasses);
        setCheckInLogRecords(seedCheckInRecords);
        setAccessProducts(seedPosProducts.map(normalizeProductForState));
        setTransactions(normalizeTransactions(seedPosTransactions, seedPosProducts.map(normalizeProductForState)));
        setPrograms(seedPrograms);
        setSessions(seedSessions);
        setRegistrations(seedRegistrations);
        clearScopedMockState(
          "org_summit",
          "loc_001",
          ["customers", "punchPasses", "checkIns", "memberships", "transactions", "products", "programs", "sessions", "registrations"]
        );
      }
    }),
    [
      customers,
      memberships,
      punchPasses,
      accessProducts,
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
