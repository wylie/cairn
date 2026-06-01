import type { ClassCampSession, Customer, CustomerAccessRecord, Program, Registration, Waiver } from "@/types/domain";

export type AccessOutcome = "approved" | "attention" | "denied";

export interface AccessDecision {
  outcome: AccessOutcome;
  allowed: boolean;
  headline: string;
  reasons: string[];
  warnings: string[];
  chosenAccess?: CustomerAccessRecord;
  sessionAccess?: {
    sessionId: string;
    sessionTitle: string;
    programCategory?: Program["category"];
    startsAt: string;
  };
  accessSummary: string[];
}

export interface EligibleAccessResult {
  eligible: boolean;
  reason: string;
  accessType?: CustomerAccessRecord["type"] | "session-registration";
  sourceProduct?: string;
  remainingQuantity?: number;
  overrideRequired: boolean;
  chosenAccess?: CustomerAccessRecord;
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function toDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCustomerAge(dateOfBirth?: string) {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)));
}

function isSameDay(date: Date, dayKey: string) {
  return date.toISOString().slice(0, 10) === dayKey;
}

function isWaiverValid(waiver: Waiver | undefined, dayKey: string) {
  if (!waiver || waiver.status !== "valid") return false;
  const exp = toDate(waiver.expiresAt);
  if (!exp) return true;
  return exp.getTime() >= new Date(`${dayKey}T00:00:00Z`).getTime();
}

function waiverWarnings(waiver: Waiver | undefined, dayKey: string) {
  if (!waiver || waiver.status !== "valid") return [] as string[];
  const exp = toDate(waiver.expiresAt);
  if (!exp) return [];
  const base = new Date(`${dayKey}T00:00:00Z`);
  const days = Math.ceil((exp.getTime() - base.getTime()) / MS_IN_DAY);
  if (days <= 14) {
    return [`Waiver expires on ${exp.toLocaleDateString("en-US")}.`];
  }
  return [];
}

function accessUsable(record: CustomerAccessRecord, locationId: string, dayKey: string) {
  if (record.status === "frozen") {
    return { ok: false, reason: `${record.type} is frozen${record.freezeEndDate ? ` until ${record.freezeEndDate}` : ""}.` };
  }
  if (record.status === "pending") return { ok: false, reason: `${record.type} is pending activation.` };
  if (record.status === "suspended") return { ok: false, reason: `${record.type} is suspended.` };
  if (record.status !== "active") return { ok: false, reason: `${record.type} is ${record.status}.` };
  const start = toDate(record.startDate);
  const end = toDate(record.expirationDate);
  const day = toDate(`${dayKey}T12:00:00Z`)!;
  const startKey = record.startDate?.slice(0, 10);
  const endKey = record.expirationDate?.slice(0, 10);
  if (startKey && dayKey < startKey) return { ok: false, reason: `${record.type} starts on ${start?.toLocaleDateString("en-US") ?? startKey}.` };
  if (endKey && dayKey > endKey) return { ok: false, reason: `${record.type} expired on ${end?.toLocaleDateString("en-US") ?? endKey}.` };
  if (record.locationsAllowed?.length && !record.locationsAllowed.includes(locationId)) {
    return { ok: false, reason: `${record.type} is not valid at this location.` };
  }
  if (record.type === "day-pass" && endKey && endKey !== dayKey) {
    return { ok: false, reason: "Day pass is only valid for the original purchase day." };
  }
  if (record.type === "punch-pass" && (record.remainingPunches ?? 0) <= 0) {
    return { ok: false, reason: "No punches remaining." };
  }
  if (record.freezeStartDate && record.freezeEndDate && dayKey >= record.freezeStartDate && dayKey <= record.freezeEndDate) {
    return { ok: false, reason: `Membership frozen through ${record.freezeEndDate}.` };
  }
  return { ok: true };
}

const ACCESS_PRIORITY: CustomerAccessRecord["type"][] = ["membership", "day-pass", "punch-pass", "comp"];

function pickBestAccess(records: CustomerAccessRecord[], locationId: string, dayKey: string) {
  const deniedReasons: string[] = [];

  for (const type of ACCESS_PRIORITY) {
    const candidates = records.filter((entry) => entry.type === type);
    if (candidates.length === 0) continue;

    const sortedCandidates = [...candidates].sort((a, b) => {
      const aEnd = a.expirationDate ?? "9999-12-31";
      const bEnd = b.expirationDate ?? "9999-12-31";
      return aEnd.localeCompare(bEnd);
    });

    for (const record of sortedCandidates) {
      const usable = accessUsable(record, locationId, dayKey);
      if (usable.ok) return { chosen: record, deniedReasons };
      const reason = "reason" in usable ? usable.reason : undefined;
      if (reason) deniedReasons.push(reason);
    }
  }

  return { chosen: undefined as CustomerAccessRecord | undefined, deniedReasons };
}

export function getEligibleAccess(input: {
  customer: Customer;
  waiver?: Waiver;
  locationId: string;
  dayKey: string;
  accessRecords: CustomerAccessRecord[];
  registrations: Registration[];
  sessions: ClassCampSession[];
  programs: Program[];
  allowSessionRegistrationAccess?: boolean;
}): EligibleAccessResult {
  const {
    customer,
    waiver,
    locationId,
    dayKey,
    accessRecords,
    registrations,
    sessions,
    programs,
    allowSessionRegistrationAccess = true
  } = input;

  const hasWaiver = isWaiverValid(waiver, dayKey);
  const customerAge = getCustomerAge(customer.dateOfBirth);
  const customerRecords = accessRecords.filter((entry) => entry.customerId === customer.id);
  const { chosen, deniedReasons } = pickBestAccess(customerRecords, locationId, dayKey);

  const sameDayRegistration = allowSessionRegistrationAccess
    ? registrations
        .filter((entry) => entry.customerId === customer.id && entry.status !== "cancelled")
        .map((entry) => ({ entry, session: sessions.find((s) => s.id === entry.sessionId) }))
        .find(({ session }) => session && session.startsAt.slice(0, 10) === dayKey)
    : undefined;

  const sessionTitle = sameDayRegistration?.session
    ? sameDayRegistration.session.title ??
      programs.find((p) => p.id === sameDayRegistration.session!.programId)?.title ??
      "Registered Session"
    : undefined;

  if (!hasWaiver) {
    return {
      eligible: false,
      reason: waiver?.status === "expired" ? "Waiver expired." : "Waiver missing.",
      overrideRequired: true,
      accessType: chosen ? chosen.type : sameDayRegistration?.session ? "session-registration" : undefined,
      sourceProduct: chosen?.notes ?? sessionTitle,
      remainingQuantity: chosen?.remainingPunches,
      chosenAccess: chosen
    };
  }

  if (chosen) {
    if (typeof chosen.minimumAge === "number" && typeof customerAge === "number" && customerAge < chosen.minimumAge) {
      return {
        eligible: false,
        reason: `Minimum age is ${chosen.minimumAge}.`,
        overrideRequired: true,
        accessType: chosen.type,
        chosenAccess: chosen
      };
    }
    if (typeof chosen.maximumAge === "number" && typeof customerAge === "number" && customerAge > chosen.maximumAge) {
      return {
        eligible: false,
        reason: `Maximum age is ${chosen.maximumAge}.`,
        overrideRequired: true,
        accessType: chosen.type,
        chosenAccess: chosen
      };
    }
    return {
      eligible: true,
      reason: `Eligible via ${chosen.type}.`,
      accessType: chosen.type,
      sourceProduct: chosen.notes,
      remainingQuantity: chosen.remainingPunches,
      overrideRequired: false,
      chosenAccess: chosen
    };
  }

  if (sameDayRegistration?.session) {
    return {
      eligible: true,
      reason: "Eligible via session registration.",
      accessType: "session-registration",
      sourceProduct: sessionTitle,
      overrideRequired: false
    };
  }

  return {
    eligible: false,
    reason: deniedReasons[0] ?? "No valid access found.",
    overrideRequired: false
  };
}

export function evaluateCustomerAccess(input: {
  customer: Customer;
  waiver?: Waiver;
  locationId: string;
  dayKey: string;
  accessRecords: CustomerAccessRecord[];
  registrations: Registration[];
  sessions: ClassCampSession[];
  programs: Program[];
  allowSessionRegistrationAccess?: boolean;
}): AccessDecision {
  const {
    customer,
    waiver,
    locationId,
    dayKey,
    accessRecords,
    registrations,
    sessions,
    programs,
    allowSessionRegistrationAccess = true
  } = input;

  const reasons: string[] = [];
  const warnings: string[] = [];
  const customerAge = getCustomerAge(customer.dateOfBirth);

  if (!isWaiverValid(waiver, dayKey)) {
    reasons.push(waiver?.status === "expired" ? "Waiver expired." : "Waiver missing.");
  } else {
    warnings.push(...waiverWarnings(waiver, dayKey));
  }

  const customerRecords = accessRecords.filter((entry) => entry.customerId === customer.id);
  const { chosen: chosenAccess, deniedReasons } = pickBestAccess(customerRecords, locationId, dayKey);
  reasons.push(...deniedReasons);

  let sessionAccess: AccessDecision["sessionAccess"];
  if (!chosenAccess && allowSessionRegistrationAccess) {
    const sameDayRegistration = registrations
      .filter((entry) => entry.customerId === customer.id && entry.status !== "cancelled")
      .map((entry) => ({ entry, session: sessions.find((s) => s.id === entry.sessionId) }))
      .find(({ session }) => session && session.startsAt.slice(0, 10) === dayKey);

    if (sameDayRegistration?.session) {
      const program = programs.find((p) => p.id === sameDayRegistration.session!.programId);
      sessionAccess = {
        sessionId: sameDayRegistration.session.id,
        sessionTitle: sameDayRegistration.session.title ?? program?.title ?? "Registered Session",
        startsAt: sameDayRegistration.session.startsAt,
        programCategory: program?.category
      };
    }
  }

  if (!chosenAccess && !sessionAccess) {
    reasons.push("No valid access found.");
  }
  if (chosenAccess && typeof chosenAccess.minimumAge === "number" && typeof customerAge === "number" && customerAge < chosenAccess.minimumAge) {
    reasons.push(`Minimum age is ${chosenAccess.minimumAge}.`);
  }
  if (chosenAccess && typeof chosenAccess.maximumAge === "number" && typeof customerAge === "number" && customerAge > chosenAccess.maximumAge) {
    reasons.push(`Maximum age is ${chosenAccess.maximumAge}.`);
  }

  const accessWarning = chosenAccess?.expirationDate
    ? (() => {
        const exp = toDate(chosenAccess.expirationDate);
        const day = toDate(`${dayKey}T12:00:00Z`)!;
        if (!exp) return null;
        const days = Math.ceil((exp.getTime() - day.getTime()) / MS_IN_DAY);
        if (days <= 0) return `${chosenAccess.type} expires today.`;
        if (days <= 2) return `${chosenAccess.type} expires soon.`;
        return null;
      })()
    : null;
  if (accessWarning) warnings.push(accessWarning);
  if (chosenAccess?.type === "punch-pass" && typeof chosenAccess.remainingPunches === "number" && chosenAccess.remainingPunches <= 2) {
    warnings.push(`Low punches remaining (${chosenAccess.remainingPunches}).`);
  }

  const hasAgeBlock = reasons.some((reason) => /minimum age|maximum age/i.test(reason));
  const allowed = (Boolean(chosenAccess) || Boolean(sessionAccess)) && isWaiverValid(waiver, dayKey) && !hasAgeBlock;
  const accessSummary: string[] = [];
  if (chosenAccess?.type === "membership") {
    accessSummary.push(`Membership ${chosenAccess.status}${chosenAccess.expirationDate ? ` • Expires ${chosenAccess.expirationDate}` : ""}`);
  } else if (chosenAccess?.type === "day-pass") {
    accessSummary.push(`Day pass available${chosenAccess.expirationDate ? ` • Valid ${chosenAccess.expirationDate}` : ""}`);
  } else if (chosenAccess?.type === "punch-pass") {
    accessSummary.push(`Punch pass • ${chosenAccess.remainingPunches ?? 0} remaining`);
  } else if (chosenAccess?.type === "comp") {
    accessSummary.push("Comp access active");
  }
  if (sessionAccess) {
    accessSummary.push(`Registered for ${sessionAccess.sessionTitle}`);
  }
  if (!isWaiverValid(waiver, dayKey)) {
    accessSummary.push("Waiver missing or expired");
  }
  if (!allowed) {
    return {
      outcome: "denied",
      allowed: false,
      headline: "Access Denied",
      reasons,
      warnings,
      chosenAccess,
      sessionAccess,
      accessSummary
    };
  }

  if (warnings.length > 0) {
    return {
      outcome: "attention",
      allowed: true,
      headline: "Needs Attention",
      reasons: chosenAccess ? [`Access approved via ${chosenAccess.type}.`] : ["Access approved via session registration."],
      warnings,
      chosenAccess,
      sessionAccess,
      accessSummary
    };
  }

  return {
    outcome: "approved",
    allowed: true,
    headline: "Access Approved",
    reasons: chosenAccess ? [`Access approved via ${chosenAccess.type}.`] : ["Access approved via session registration."],
    warnings,
    chosenAccess,
    sessionAccess,
    accessSummary
  };
}
