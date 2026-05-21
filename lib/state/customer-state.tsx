"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { checkInRecords as seedCheckInRecords } from "@/lib/mocks/checkins";
import { customers as seedCustomers } from "@/lib/mocks/customers";
import { memberships as seedMemberships } from "@/lib/mocks/memberships";
import { punchPasses as seedPunchPasses } from "@/lib/mocks/passes";
import type { CheckInLogRecord, CheckInSource, Customer, EntryMethod, Membership, PunchPass } from "@/types/domain";

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

interface CustomerStateContextValue {
  customers: Customer[];
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
  checkInCustomer: (customerId: string, source?: CheckInSource) => { ok: boolean; message: string };
  checkOutRecord: (recordId: string) => { ok: boolean; message: string };
  toggleCheckIn: (customerId: string) => void;
}

const CustomerStateContext = createContext<CustomerStateContextValue | null>(null);

export function CustomerStateProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [memberships] = useState<Membership[]>(seedMemberships);
  const [punchPasses, setPunchPasses] = useState<PunchPass[]>(seedPunchPasses);
  const [checkInLogRecords, setCheckInLogRecords] = useState<CheckInLogRecord[]>(seedCheckInRecords);
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

  const checkOutRecord = (recordId: string) => {
    if (!isActiveDateToday) return { ok: false, message: "Historical check-in logs are read-only." };

    const target = checkInLogRecords.find((entry) => entry.id === recordId);
    if (!target) return { ok: false, message: "Record not found." };

    setCheckInLogRecords((prev) =>
      prev.map((entry) =>
        entry.id === recordId
          ? {
              ...entry,
              status: "checked-out",
              checkOutTime: `${activeDateKey}T18:00:00Z`
            }
          : entry
      )
    );
    setCustomers((prev) => prev.map((entry) => (entry.id === target.customerId ? { ...entry, checkInStatus: "out" } : entry)));
    return { ok: true, message: `Check-in updated for ${target.customerName}.` };
  };

  const checkInCustomer = (customerId: string, source: CheckInSource = "manual_search") => {
    if (!isActiveDateToday) return { ok: false, message: "Historical check-in logs are read-only." };

    const customer = customers.find((entry) => entry.id === customerId);
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
      staffUserId: "staff_001"
    };

    setCheckInLogRecords((prev) => [newRecord, ...prev]);
    setCustomers((prev) => prev.map((entry) => (entry.id === customerId ? { ...entry, checkInStatus: "in" } : entry)));

    return { ok: true, message: `Check-in recorded for ${customer.firstName} ${customer.lastName}.` };
  };

  const toggleCheckIn = (customerId: string) => {
    const existing = checkInLogRecords.find(
      (record) =>
        record.customerId === customerId &&
        record.locationId === activeLocationId &&
        record.checkInTime.startsWith(activeDateKey) &&
        record.status === "checked-in"
    );

    if (existing) checkOutRecord(existing.id);
    else checkInCustomer(customerId, "manual_search");
  };

  const value = useMemo<CustomerStateContextValue>(
    () => ({
      customers,
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
      toggleCheckIn
    }),
    [customers, activeDateKey, isActiveDateToday, todayLogRecords, occupancyCount, totalCheckIns, checkedOutCount, memberships, punchPasses]
  );

  return <CustomerStateContext.Provider value={value}>{children}</CustomerStateContext.Provider>;
}

export function useCustomerState() {
  const ctx = useContext(CustomerStateContext);
  if (!ctx) throw new Error("useCustomerState must be used within CustomerStateProvider");
  return ctx;
}
