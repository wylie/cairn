import type {
  CheckInLogRecord,
  ClassCampSession,
  Customer,
  Household,
  HouseholdMember,
  Membership,
  PosProduct,
  PosTransaction,
  Program,
  Registration,
  StaffRole
} from "@/types/domain";

export type ReportRangeKey = "today" | "7d" | "30d" | "90d" | "this_month" | "last_month" | "custom";

export interface ReportFilters {
  rangeKey: ReportRangeKey;
  customStart?: string;
  customEnd?: string;
  locationId?: string;
  programType?: Program["programType"] | "all";
  instructorId?: string | "all";
  ageGroup?: "all" | "youth" | "adult";
  membershipStatus?: "all" | Membership["status"];
  productType?: "all" | NonNullable<PosProduct["type"]>;
}

export interface ReportInput {
  staffRole: StaffRole;
  staffId?: string;
  now: Date;
  filters: ReportFilters;
  customers: Customer[];
  checkIns: CheckInLogRecord[];
  transactions: PosTransaction[];
  programs: Program[];
  sessions: ClassCampSession[];
  registrations: Registration[];
  memberships: Membership[];
  products: PosProduct[];
  households: Household[];
  householdMembers: HouseholdMember[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMPTY_REPORT_MODEL = {
  range: { start: new Date(), end: new Date() },
  totals: {
    todayCheckIns: 0,
    currentlyIn: 0,
    uniqueVisitors: 0,
    repeatVisits: 0,
    avgOccupancy: 0,
    revenueTodayCents: 0,
    grossRevenueCents: 0,
    waiversMissing: 0,
    birthdaysToday: 0,
    lowPunchPass: 0,
    registrationsToday: 0
  },
  trends: {
    daily: [] as Array<{ label: string; checkIns: number; revenue: number; memberships: number }>,
    byHour: new Array(24).fill(0).map((_, hour) => ({ hour, label: `${hour}:00`, count: 0 })),
    byDay: DAYS.map((label) => ({ label, count: 0 })),
    youthAdult: [
      { name: "Adults", value: 0 },
      { name: "Youth", value: 0 }
    ]
  },
  membership: { active: 0, expiring: 0, inactive: 0, trial: 0, newSold: 0 },
  products: { topProducts: [] as Array<{ name: string; quantity: number; revenue: number; type: string }>, compTxCount: 0, discountsUsed: 0 },
  programs: { rows: [] as Array<{ id: string; name: string; enrolled: number; waitlisted: number; attended: number; capacity: number; utilization: number }>, upcomingSessions: [] as Array<{ id: string; title: string; program: string; startsAt: string; registered: number; capacity: number }> },
  occupancy: { current: 0, busiestHour: "0:00", busiestHourCount: 0, busiestDay: "Sun", busiestDayCount: 0 },
  households: { total: 0, averageSize: 0, youthMembers: 0, adultMembers: 0 },
  financial: { revenueCents: 0, refunds: 0, comps: 0 },
  sales: {
    grossCents: 0,
    netCents: 0,
    refundsCents: 0,
    discountsCents: 0,
    compsCents: 0,
    taxCents: 0,
    transactionCount: 0,
    averageTransactionCents: 0,
    byCategory: [] as Array<{ category: string; quantity: number; revenueCents: number }>,
    byProduct: [] as Array<{ productId: string; productName: string; category: string; quantity: number; revenueCents: number }>,
    byStaff: [] as Array<{ staffId: string; staffName: string; transactionCount: number; revenueCents: number }>,
    byPaymentMethod: [] as Array<{ paymentMethod: string; transactionCount: number; revenueCents: number }>,
    transactions: [] as Array<{
      id: string;
      receipt: string;
      date: string;
      customer: string;
      staff: string;
      paymentMethod: string;
      subtotalCents: number;
      discountCents: number;
      totalCents: number;
      itemCount: number;
    }>
  },
  members: {
    newMembers: 0,
    cancelledMembers: 0,
    pausedMembers: 0,
    expiredMembers: 0,
    renewals: 0,
    churnRate: 0,
    retentionRate: 0,
    averageMembershipLengthDays: 0,
    inactiveMemberCount: 0
  },
  attendance: {
    totalVisits: 0,
    uniqueVisitors: 0,
    repeatVisitors: 0,
    averageVisitDurationMinutes: 0,
    topVisitors: [] as Array<{ customerId: string; customerName: string; visits: number }>
  },
  csvRows: [] as Array<{ receipt: string; date: string; customer: string; staff: string; total: string; items: string }>
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function rangeFromFilters(now: Date, filters: ReportFilters) {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  if (filters.rangeKey === "today") return { start: todayStart, end: todayEnd };
  if (filters.rangeKey === "7d") return { start: startOfDay(addDays(now, -6)), end: todayEnd };
  if (filters.rangeKey === "30d") return { start: startOfDay(addDays(now, -29)), end: todayEnd };
  if (filters.rangeKey === "90d") return { start: startOfDay(addDays(now, -89)), end: todayEnd };
  if (filters.rangeKey === "this_month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: todayEnd };
  if (filters.rangeKey === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }
  const start = filters.customStart ? startOfDay(new Date(filters.customStart)) : todayStart;
  const end = filters.customEnd ? endOfDay(new Date(filters.customEnd)) : todayEnd;
  return { start, end };
}

function inRange(iso: string, start: Date, end: Date) {
  const d = new Date(iso);
  return d >= start && d <= end;
}

function keyForDay(iso: string) {
  return iso.slice(0, 10);
}

function keyLabel(key: string) {
  const d = new Date(`${key}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function computeAge(dateOfBirth?: string) {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)));
}

function safeItems(transaction: PosTransaction): PosTransaction["items"] {
  return Array.isArray(transaction.items)
    ? transaction.items.filter(
        (item) =>
          item &&
          typeof item.productName === "string" &&
          Number.isFinite(item.quantity) &&
          Number.isFinite(item.unitPrice) &&
          Number.isFinite(item.lineTotal)
      )
    : [];
}

export function buildReportModel(input: ReportInput) {
  const { start, end } = rangeFromFilters(input.now, input.filters);
  const safeTransactions = (Array.isArray(input.transactions) ? input.transactions : []).map((entry) => ({
    ...entry,
    items: safeItems(entry),
    total: Number.isFinite(entry.total) ? entry.total : 0,
    subtotal: Number.isFinite(entry.subtotal) ? entry.subtotal : 0,
    completedAt: typeof entry.completedAt === "string" ? entry.completedAt : ""
  }));
  const customersById = new Map(input.customers.map((entry) => [entry.id, entry]));
  const programsById = new Map(input.programs.map((entry) => [entry.id, entry]));
  const sessionsById = new Map(input.sessions.map((entry) => [entry.id, entry]));

  const scopedSessions = input.sessions.filter((session) => {
    if (input.filters.locationId && session.locationId !== input.filters.locationId) return false;
    if (input.staffRole === "instructor" && input.staffId && session.instructorStaffId !== input.staffId) return false;
    if (input.filters.instructorId && input.filters.instructorId !== "all" && session.instructorStaffId !== input.filters.instructorId) return false;
    const program = programsById.get(session.programId);
    if (input.filters.programType && input.filters.programType !== "all" && program?.programType !== input.filters.programType) return false;
    return true;
  });
  const scopedSessionIds = new Set(scopedSessions.map((s) => s.id));

  const scopedCheckIns = input.checkIns.filter((entry) => {
    if (!inRange(entry.checkInTime, start, end)) return false;
    if (input.filters.locationId && entry.locationId !== input.filters.locationId) return false;
    if (input.staffRole === "instructor" && input.staffId) {
      const hasInstructorSessionSource = entry.checkInSource === "registration";
      if (!hasInstructorSessionSource) return false;
    }
    if (input.filters.ageGroup && input.filters.ageGroup !== "all") {
      const age = computeAge(customersById.get(entry.customerId)?.dateOfBirth);
      if (age == null) return false;
      if (input.filters.ageGroup === "youth" && age >= 18) return false;
      if (input.filters.ageGroup === "adult" && age < 18) return false;
    }
    return true;
  });

  const scopedRegistrations = input.registrations.filter((entry) => {
    if (!scopedSessionIds.has(entry.sessionId)) return false;
    const time = entry.registeredAt ?? sessionsById.get(entry.sessionId)?.startsAt;
    if (!time || !inRange(time, start, end)) return false;
    return true;
  });

  const scopedTransactions = safeTransactions.filter((entry) => {
    if (!inRange(entry.completedAt, start, end)) return false;
    if (input.filters.locationId && entry.locationId !== input.filters.locationId) return false;
    if (input.staffRole === "instructor") return false;
    if (input.filters.productType && input.filters.productType !== "all") {
      const hasType = safeItems(entry).some((item) => item.type === input.filters.productType);
      if (!hasType) return false;
    }
    return true;
  });

  const dayBuckets = new Map<string, { key: string; checkIns: number; revenueCents: number; memberships: number }>();
  for (let i = 0; i <= 90; i += 1) {
    const d = addDays(startOfDay(end), -i);
    if (d < start) break;
    const key = d.toISOString().slice(0, 10);
    dayBuckets.set(key, { key, checkIns: 0, revenueCents: 0, memberships: 0 });
  }
  scopedCheckIns.forEach((entry) => {
    const key = keyForDay(entry.checkInTime);
    const bucket = dayBuckets.get(key);
    if (bucket) bucket.checkIns += 1;
  });
  scopedTransactions.forEach((entry) => {
    const key = keyForDay(entry.completedAt);
    const bucket = dayBuckets.get(key);
    if (bucket) {
      bucket.revenueCents += entry.total;
      const membershipLineCount = safeItems(entry).filter((item) => item.type === "membership").reduce((sum, item) => sum + item.quantity, 0);
      bucket.memberships += membershipLineCount;
    }
  });

  const dailyTrend = Array.from(dayBuckets.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => ({
      label: keyLabel(entry.key),
      checkIns: entry.checkIns,
      revenue: Number((entry.revenueCents / 100).toFixed(2)),
      memberships: entry.memberships
    }));

  const todayKey = input.now.toISOString().slice(0, 10);
  const todayCheckIns = scopedCheckIns.filter((entry) => keyForDay(entry.checkInTime) === todayKey);
  const uniqueVisitors = new Set(scopedCheckIns.map((entry) => entry.customerId)).size;
  const repeatVisits = Math.max(scopedCheckIns.length - uniqueVisitors, 0);

  const hourBuckets = new Array(24).fill(0).map((_, hour) => ({ hour, label: `${hour}:00`, count: 0 }));
  scopedCheckIns.forEach((entry) => {
    const hour = new Date(entry.checkInTime).getHours();
    hourBuckets[hour].count += 1;
  });
  const busiestHour = hourBuckets.reduce((best, entry) => (entry.count > best.count ? entry : best), hourBuckets[0]);

  const dayNameCounts = DAYS.map((label) => ({ label, count: 0 }));
  scopedCheckIns.forEach((entry) => {
    const idx = new Date(entry.checkInTime).getDay();
    dayNameCounts[idx].count += 1;
  });
  const busiestDay = dayNameCounts.reduce((best, entry) => (entry.count > best.count ? entry : best), dayNameCounts[0]);

  const youthAdult = scopedCheckIns.reduce(
    (acc, entry) => {
      const age = computeAge(customersById.get(entry.customerId)?.dateOfBirth);
      if (age != null && age < 18) acc.youth += 1;
      else acc.adult += 1;
      return acc;
    },
    { youth: 0, adult: 0 }
  );

  const membershipMetrics = {
    active: input.memberships.filter((entry) => entry.status === "active").length,
    expiring: input.memberships.filter((entry) => entry.status === "expiring").length,
    inactive: input.memberships.filter((entry) => entry.status === "inactive").length,
    trial: input.memberships.filter((entry) => entry.status === "trial").length,
    newSold: scopedTransactions.reduce(
      (sum, txn) => sum + safeItems(txn).filter((item) => item.type === "membership").reduce((s, item) => s + item.quantity, 0),
      0
    )
  };

  const productSalesMap = new Map<string, { name: string; quantity: number; revenueCents: number; type: string }>();
  scopedTransactions.forEach((entry) => {
    safeItems(entry).forEach((item) => {
      const current = productSalesMap.get(item.productId) ?? {
        name: item.productName,
        quantity: 0,
        revenueCents: 0,
        type: item.type
      };
      current.quantity += item.quantity;
      current.revenueCents += item.lineTotal;
      productSalesMap.set(item.productId, current);
    });
  });
  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8)
    .map((entry) => ({
      name: entry.name,
      quantity: entry.quantity,
      revenue: Number((entry.revenueCents / 100).toFixed(2)),
      type: entry.type
    }));

  const programRows = input.programs
    .map((program) => {
      const programSessions = scopedSessions.filter((session) => session.programId === program.id);
      const programRegistrations = scopedRegistrations.filter((registration) =>
        programSessions.some((session) => session.id === registration.sessionId)
      );
      const enrolled = programRegistrations.filter((entry) => entry.status === "confirmed" || entry.status === "attended" || entry.status === "checked_in" || entry.status === "completed").length;
      const waitlisted = programRegistrations.filter((entry) => entry.status === "waitlisted").length;
      const attended = programRegistrations.filter((entry) => entry.status === "attended" || entry.status === "completed").length;
      const capacityTotal = programSessions.reduce((sum, session) => sum + session.capacity, 0);
      return {
        id: program.id,
        name: program.title,
        enrolled,
        waitlisted,
        attended,
        capacity: capacityTotal,
        utilization: capacityTotal > 0 ? Number(((enrolled / capacityTotal) * 100).toFixed(1)) : 0
      };
    })
    .filter((row) => row.enrolled > 0 || row.waitlisted > 0 || row.capacity > 0)
    .sort((a, b) => b.enrolled - a.enrolled);

  const upcomingSessions = scopedSessions
    .filter((session) => new Date(session.startsAt) >= input.now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6)
    .map((session) => {
      const program = programsById.get(session.programId);
      return {
        id: session.id,
        title: session.title || program?.title || "Session",
        program: program?.title ?? "Program",
        startsAt: session.startsAt,
        registered: scopedRegistrations.filter((entry) => entry.sessionId === session.id && entry.status !== "cancelled").length,
        capacity: session.capacity
      };
    });

  const waiversMissing = input.customers.filter((customer) => {
    const waiverStatus = input.customers.find((entry) => entry.id === customer.id)?.waiverId;
    if (!waiverStatus) return true;
    return false;
  }).length;

  const birthdaysToday = input.customers.filter((customer) => {
    if (!customer.dateOfBirth) return false;
    const dob = new Date(`${customer.dateOfBirth}T00:00:00`);
    return dob.getMonth() === input.now.getMonth() && dob.getDate() === input.now.getDate();
  });

  const lowPunchPass = input.customers.filter((customer) => {
    const accessRecord = input.products.find((product) => product.id === customer.punchPassId);
    return Boolean(accessRecord) && customer.checkInStatus === "out";
  }).length;

  const occupancyNow = input.checkIns.filter(
    (entry) =>
      keyForDay(entry.checkInTime) === todayKey &&
      entry.status === "checked-in" &&
      (!input.filters.locationId || entry.locationId === input.filters.locationId)
  ).length;

  const registrationsToday = scopedRegistrations.filter((entry) => {
    const session = sessionsById.get(entry.sessionId);
    if (!session) return false;
    return keyForDay(session.startsAt) === todayKey;
  }).length;

  const discountsUsed = scopedTransactions.filter((entry) => entry.subtotal > entry.total).length;
  const compTxCount = scopedTransactions.filter((entry) => safeItems(entry).some((item) => item.type === "comp")).length;
  const grossRevenue = scopedTransactions.reduce((sum, entry) => sum + entry.total, 0);
  const refundCount = scopedTransactions.filter((entry) => entry.transactionType === "return").length;
  const refundsCents = scopedTransactions
    .filter((entry) => entry.transactionType === "return")
    .reduce((sum, entry) => sum + Math.abs(entry.total), 0);
  const discountsCents = scopedTransactions.reduce((sum, entry) => sum + Math.max(0, entry.subtotal - entry.total), 0);
  const taxCents = 0;
  const netCents = grossRevenue - refundsCents;

  const categoryMap = new Map<string, { category: string; quantity: number; revenueCents: number }>();
  const productMap = new Map<string, { productId: string; productName: string; category: string; quantity: number; revenueCents: number }>();
  const staffSalesMap = new Map<string, { staffId: string; staffName: string; transactionCount: number; revenueCents: number }>();
  const paymentMethodMap = new Map<string, { paymentMethod: string; transactionCount: number; revenueCents: number }>();

  scopedTransactions.forEach((entry) => {
    const staffId = entry.soldByStaffId ?? "staff_unknown";
    const staffName = entry.soldByStaffName ?? "Staff not recorded";
    const staffBucket = staffSalesMap.get(staffId) ?? { staffId, staffName, transactionCount: 0, revenueCents: 0 };
    staffBucket.transactionCount += 1;
    staffBucket.revenueCents += entry.total;
    staffSalesMap.set(staffId, staffBucket);

    const paymentMethod = entry.paymentType || "mock";
    const paymentBucket = paymentMethodMap.get(paymentMethod) ?? { paymentMethod, transactionCount: 0, revenueCents: 0 };
    paymentBucket.transactionCount += 1;
    paymentBucket.revenueCents += entry.total;
    paymentMethodMap.set(paymentMethod, paymentBucket);

    safeItems(entry).forEach((item) => {
      const category = item.category ?? "uncategorized";
      const categoryBucket = categoryMap.get(category) ?? { category, quantity: 0, revenueCents: 0 };
      categoryBucket.quantity += item.quantity;
      categoryBucket.revenueCents += item.lineTotal;
      categoryMap.set(category, categoryBucket);

      const productBucket = productMap.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        category,
        quantity: 0,
        revenueCents: 0
      };
      productBucket.quantity += item.quantity;
      productBucket.revenueCents += item.lineTotal;
      productMap.set(item.productId, productBucket);
    });
  });

  const transactionsTable = scopedTransactions
    .slice()
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .map((entry) => ({
      id: entry.id,
      receipt: entry.receiptNumber,
      date: entry.completedAt,
      customer: entry.customerName || "Unknown customer",
      staff: entry.soldByStaffName ?? "Staff not recorded",
      paymentMethod: entry.paymentType || "mock",
      subtotalCents: entry.subtotal,
      discountCents: Math.max(0, entry.subtotal - entry.total),
      totalCents: entry.total,
      itemCount: safeItems(entry).reduce((sum, item) => sum + item.quantity, 0)
    }));

  const householdSizeMap = new Map<string, number>();
  input.householdMembers.forEach((member) => {
    householdSizeMap.set(member.householdId, (householdSizeMap.get(member.householdId) ?? 0) + 1);
  });
  const avgHouseholdSize =
    householdSizeMap.size > 0
      ? Number(
          (
            Array.from(householdSizeMap.values()).reduce((sum, value) => sum + value, 0) /
            householdSizeMap.size
          ).toFixed(1)
        )
      : 0;

  const csvRows = scopedTransactions.map((txn) => ({
    receipt: txn.receiptNumber,
    date: txn.completedAt,
    customer: txn.customerName,
    staff: txn.soldByStaffName ?? "Staff not recorded",
    total: (txn.total / 100).toFixed(2),
    items: safeItems(txn).map((item) => `${item.productName} x${item.quantity}`).join("; ")
  }));

  const membersInactiveThreshold = addDays(input.now, -30);
  const membersByCustomerId = new Set(
    input.memberships.filter((entry) => entry.status === "active" || entry.status === "expiring" || entry.status === "trial").map((entry) => entry.customerId)
  );
  const memberVisitCounts = new Map<string, number>();
  scopedCheckIns.forEach((entry) => {
    if (!membersByCustomerId.has(entry.customerId)) return;
    memberVisitCounts.set(entry.customerId, (memberVisitCounts.get(entry.customerId) ?? 0) + 1);
  });

  const inactiveMemberCount = Array.from(membersByCustomerId).filter((customerId) => {
    const visits = input.checkIns.filter((entry) => entry.customerId === customerId && new Date(entry.checkInTime) >= membersInactiveThreshold);
    return visits.length === 0;
  }).length;

  const membershipRenewalDates = input.memberships.reduce<Date[]>((dates, entry) => {
    if (!entry.renewalDate) return dates;
    const date = new Date(entry.renewalDate);
    if (Number.isFinite(date.getTime())) dates.push(date);
    return dates;
  }, []);
  const averageMembershipLengthDays = membershipRenewalDates.length > 0 ? 30 : 0;

  const cancelledMembers = input.memberships.filter((entry) => entry.status === "inactive").length;
  const pausedMembers = 0;
  const expiredMembers = input.memberships.filter((entry) => entry.status === "inactive").length;
  const newMembers = membershipMetrics.newSold;
  const renewals = input.memberships.filter((entry) => entry.renewalDate && inRange(entry.renewalDate, start, end)).length;
  const activeMemberCount = membershipMetrics.active + membershipMetrics.expiring + membershipMetrics.trial;
  const churnRate = activeMemberCount > 0 ? Number(((cancelledMembers / Math.max(activeMemberCount + cancelledMembers, 1)) * 100).toFixed(1)) : 0;
  const retentionRate = Number((100 - churnRate).toFixed(1));

  const visitDurations = scopedCheckIns
    .filter((entry) => entry.checkOutTime)
    .map((entry) => {
      const checkIn = new Date(entry.checkInTime).getTime();
      const checkOut = new Date(entry.checkOutTime as string).getTime();
      return checkOut > checkIn ? Math.round((checkOut - checkIn) / (1000 * 60)) : 0;
    })
    .filter((duration) => duration > 0);
  const averageVisitDurationMinutes =
    visitDurations.length > 0 ? Math.round(visitDurations.reduce((sum, duration) => sum + duration, 0) / visitDurations.length) : 0;

  const topVisitors = Array.from(
    scopedCheckIns.reduce((map, entry) => {
      map.set(entry.customerId, (map.get(entry.customerId) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .map(([customerId, visits]) => ({
      customerId,
      customerName: customersById.get(customerId)
        ? `${customersById.get(customerId)?.firstName} ${customersById.get(customerId)?.lastName}`
        : "Unknown customer",
      visits
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);

  return {
    range: { start, end },
    totals: {
      todayCheckIns: todayCheckIns.length,
      currentlyIn: occupancyNow,
      uniqueVisitors,
      repeatVisits,
      avgOccupancy: dailyTrend.length > 0 ? Number((scopedCheckIns.length / dailyTrend.length).toFixed(1)) : 0,
      revenueTodayCents: scopedTransactions
        .filter((entry) => keyForDay(entry.completedAt) === todayKey)
        .reduce((sum, entry) => sum + entry.total, 0),
      grossRevenueCents: grossRevenue,
      waiversMissing,
      birthdaysToday: birthdaysToday.length,
      lowPunchPass,
      registrationsToday
    },
    trends: {
      daily: dailyTrend,
      byHour: hourBuckets,
      byDay: dayNameCounts,
      youthAdult: [
        { name: "Adults", value: youthAdult.adult },
        { name: "Youth", value: youthAdult.youth }
      ]
    },
    membership: membershipMetrics,
    products: {
      topProducts,
      compTxCount,
      discountsUsed
    },
    programs: {
      rows: programRows,
      upcomingSessions
    },
    occupancy: {
      current: occupancyNow,
      busiestHour: busiestHour.label,
      busiestHourCount: busiestHour.count,
      busiestDay: busiestDay.label,
      busiestDayCount: busiestDay.count
    },
    households: {
      total: input.households.length,
      averageSize: avgHouseholdSize,
      youthMembers: input.householdMembers.filter((entry) => entry.memberType === "child").length,
      adultMembers: input.householdMembers.filter((entry) => entry.memberType === "adult").length
    },
    financial: {
      revenueCents: grossRevenue,
      refunds: refundCount,
      comps: compTxCount
    },
    sales: {
      grossCents: grossRevenue,
      netCents,
      refundsCents,
      discountsCents,
      compsCents: compTxCount * 100,
      taxCents,
      transactionCount: scopedTransactions.length,
      averageTransactionCents: scopedTransactions.length > 0 ? Math.round(grossRevenue / scopedTransactions.length) : 0,
      byCategory: Array.from(categoryMap.values()).sort((a, b) => b.revenueCents - a.revenueCents),
      byProduct: Array.from(productMap.values()).sort((a, b) => b.revenueCents - a.revenueCents),
      byStaff: Array.from(staffSalesMap.values()).sort((a, b) => b.revenueCents - a.revenueCents),
      byPaymentMethod: Array.from(paymentMethodMap.values()).sort((a, b) => b.revenueCents - a.revenueCents),
      transactions: transactionsTable
    },
    members: {
      newMembers,
      cancelledMembers,
      pausedMembers,
      expiredMembers,
      renewals,
      churnRate,
      retentionRate,
      averageMembershipLengthDays,
      inactiveMemberCount
    },
    attendance: {
      totalVisits: scopedCheckIns.length,
      uniqueVisitors,
      repeatVisitors: repeatVisits,
      averageVisitDurationMinutes,
      topVisitors
    },
    csvRows
  };
}

export function getEmptyReportModel() {
  return EMPTY_REPORT_MODEL;
}
