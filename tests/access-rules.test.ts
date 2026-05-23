import { describe, expect, it } from "vitest";
import { evaluateCustomerAccess, getEligibleAccess } from "@/lib/access-rules";
import { customers } from "@/lib/mocks/customers";
import { waivers } from "@/lib/mocks/waivers";
import { accessRecords } from "@/lib/mocks/access-records";
import { classCampSessions, programs } from "@/lib/mocks/programs";
import { registrations } from "@/lib/mocks/registrations";

describe("access rules", () => {
  it("active membership allows check-in", () => {
    const customer = customers.find((entry) => entry.id === "cust_001")!;
    const waiver = waivers.find((entry) => entry.id === customer.waiverId);
    const decision = evaluateCustomerAccess({
      customer,
      waiver,
      locationId: "loc_001",
      dayKey: "2026-05-20",
      accessRecords,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(true);
  });

  it("expired membership blocks check-in", () => {
    const customer = customers.find((entry) => entry.id === "cust_004")!;
    const decision = evaluateCustomerAccess({
      customer,
      waiver: undefined,
      locationId: "loc_001",
      dayKey: "2026-05-20",
      accessRecords,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(" ").toLowerCase()).toContain("expired");
  });

  it("paused membership blocks check-in", () => {
    const customer = customers.find((entry) => entry.id === "cust_001")!;
    const paused = accessRecords.map((entry) =>
      entry.customerId === customer.id ? { ...entry, status: "paused" as const } : entry
    );
    const waiver = waivers.find((entry) => entry.id === customer.waiverId);
    const decision = evaluateCustomerAccess({
      customer,
      waiver,
      locationId: "loc_001",
      dayKey: "2026-05-20",
      accessRecords: paused,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(" ").toLowerCase()).toContain("paused");
  });

  it("missing waiver blocks check-in", () => {
    const customer = customers.find((entry) => entry.id === "cust_003")!;
    const decision = evaluateCustomerAccess({
      customer,
      waiver: undefined,
      locationId: "loc_002",
      dayKey: "2026-05-20",
      accessRecords,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(" ").toLowerCase()).toContain("waiver");
  });

  it("waiver expiring soon returns warning", () => {
    const customer = customers.find((entry) => entry.id === "cust_001")!;
    const waiver = { id: "wav_tmp", customerId: customer.id, status: "signed" as const, expiresAt: "2026-05-25" };
    const decision = evaluateCustomerAccess({
      customer,
      waiver,
      locationId: "loc_001",
      dayKey: "2026-05-20",
      accessRecords,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(true);
    expect(decision.warnings.join(" ").toLowerCase()).toContain("waiver expires");
  });

  it("punch pass decrements via check-in flow is validated by remaining > 0 and zero blocks", () => {
    const customer = customers.find((entry) => entry.id === "cust_002")!;
    const waiver = waivers.find((entry) => entry.id === customer.waiverId);
    const zeroed = accessRecords.map((entry) =>
      entry.customerId === customer.id ? { ...entry, remainingPunches: 0 } : entry
    );
    const decision = evaluateCustomerAccess({
      customer,
      waiver,
      locationId: "loc_001",
      dayKey: "2026-05-20",
      accessRecords: zeroed,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(" ").toLowerCase()).toContain("no punches remaining");
  });

  it("day pass expires after day", () => {
    const customer = customers.find((entry) => entry.id === "cust_005")!;
    const waiver = waivers.find((entry) => entry.id === customer.waiverId);
    const decision = evaluateCustomerAccess({
      customer,
      waiver,
      locationId: "loc_001",
      dayKey: "2026-05-21",
      accessRecords,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(false);
  });

  it("session registration grants temporary access", () => {
    const customer = customers.find((entry) => entry.id === "cust_001")!;
    const waiver = waivers.find((entry) => entry.id === customer.waiverId);
    const noDirectAccess = accessRecords.filter((entry) => entry.customerId !== customer.id);
    const sameDaySession = [{ ...classCampSessions[0], startsAt: "2026-05-20T11:00:00Z" }];
    const reg = [{ id: "r1", customerId: customer.id, sessionId: sameDaySession[0].id, status: "confirmed" as const }];
    const decision = evaluateCustomerAccess({
      customer,
      waiver,
      locationId: "loc_001",
      dayKey: "2026-05-20",
      accessRecords: noDirectAccess,
      registrations: reg,
      sessions: sameDaySession,
      programs
    });
    expect(decision.allowed).toBe(true);
    expect(decision.sessionAccess?.sessionTitle).toBeTruthy();
  });

  it("location restriction is enforced", () => {
    const customer = customers.find((entry) => entry.id === "cust_002")!;
    const waiver = waivers.find((entry) => entry.id === customer.waiverId);
    const decision = evaluateCustomerAccess({
      customer,
      waiver,
      locationId: "loc_002",
      dayKey: "2026-05-20",
      accessRecords,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(" ").toLowerCase()).toContain("location");
  });

  it("membership is preferred over day pass when both are active", () => {
    const customer = customers.find((entry) => entry.id === "cust_001")!;
    const waiver = waivers.find((entry) => entry.id === customer.waiverId);
    const dualAccess = [
      ...accessRecords,
      {
        id: "acc_dual_day",
        customerId: customer.id,
        type: "day-pass" as const,
        status: "active" as const,
        startDate: "2026-05-20",
        expirationDate: "2026-05-20",
        locationsAllowed: ["loc_001"],
        notes: "Day Pass"
      }
    ];
    const eligible = getEligibleAccess({
      customer,
      waiver,
      locationId: "loc_001",
      dayKey: "2026-05-20",
      accessRecords: dualAccess,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(eligible.eligible).toBe(true);
    expect(eligible.accessType).toBe("membership");
  });

  it("expired membership falls back to valid day pass", () => {
    const customer = customers.find((entry) => entry.id === "cust_004")!;
    const fallbackAccess = [
      ...accessRecords,
      {
        id: "acc_day_fallback",
        customerId: customer.id,
        type: "day-pass" as const,
        status: "active" as const,
        startDate: "2026-05-20",
        expirationDate: "2026-05-20",
        locationsAllowed: ["loc_001"],
        notes: "Day Pass"
      }
    ];
    const decision = evaluateCustomerAccess({
      customer,
      waiver: { id: "wav_fallback", customerId: customer.id, status: "signed", expiresAt: "2026-12-31" },
      locationId: "loc_001",
      dayKey: "2026-05-20",
      accessRecords: fallbackAccess,
      registrations,
      sessions: classCampSessions,
      programs
    });
    expect(decision.allowed).toBe(true);
    expect(decision.chosenAccess?.type).toBe("day-pass");
  });
});
