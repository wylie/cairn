"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mockAuthUsers } from "@/lib/auth/mock-users";
import { getSessionFromCookieClient } from "@/lib/tenant/client";
import { buildSeedProvisionedOrganizations } from "@/lib/platform-admin/registry";
import { customers as seededCustomers } from "@/lib/mocks/customers";
import { clearSupportSessionCookie, getSupportSessionFromCookieClient, writeSupportSessionCookie } from "@/lib/support/session";
import type {
  SupportAuditEvent,
  SupportImpersonationSession,
  SupportRequestCategory,
  SupportRequestPriority,
  SupportRequestRecord,
  SupportRequestStatus,
  SupportStaffMember
} from "@/types/domain";

const SUPPORT_REQUESTS_STORAGE_KEY = "cairn_support_requests_v1";
const SUPPORT_AUDIT_STORAGE_KEY = "cairn_support_audit_v1";
const SUPPORT_IMPERSONATION_STORAGE_KEY = "cairn_support_impersonation_sessions_v1";

function normalizeCategory(category: unknown): SupportRequestCategory {
  if (
    category === "bug_report" ||
    category === "feature_request" ||
    category === "confusing_workflow" ||
    category === "question" ||
    category === "general_feedback"
  ) {
    return category;
  }
  if (category === "product_feedback") return "general_feedback";
  if (category === "training_request" || category === "general_support") return "question";
  return "general_feedback";
}

function normalizeStatus(status: unknown): SupportRequestStatus {
  if (status === "new" || status === "in_review" || status === "planned" || status === "resolved") return status;
  if (status === "open") return "new";
  if (status === "archived") return "resolved";
  return "new";
}

function normalizeSupportRequests(requests: SupportRequestRecord[]): SupportRequestRecord[] {
  return requests.map((request) => ({
    ...request,
    category: normalizeCategory(request.category),
    status: normalizeStatus(request.status)
  }));
}

function seedSupportStaffMembers(): SupportStaffMember[] {
  return mockAuthUsers
    .filter((entry) => entry.kind === "support_staff")
    .map((entry) => ({
      id: entry.id,
      firstName: entry.firstName,
      lastName: entry.lastName,
      email: entry.email,
      role: "support_staff",
      active: true
    }));
}

const seededRequests: SupportRequestRecord[] = [
  {
    id: "support_req_001",
    createdAt: "2026-06-06T14:10:00Z",
    updatedAt: "2026-06-06T14:10:00Z",
    status: "new",
    category: "bug_report",
    priority: "high",
    name: "Maya Lopez",
    email: "maya@summitrec.co",
    organizationSlug: "summit",
    organizationName: "Summit Rec Collective",
    facilityName: "Summit Downtown",
    pageUrl: "/o/summit/check-in",
    title: "Check-in roster needs a clearer blocked reason",
    description: "Front desk needs the exact waiver or membership issue without opening the full profile.",
    workflowAffected: "Check-In",
    businessImpact: "Slows down guest recovery at the front desk."
  },
  {
    id: "support_req_002",
    createdAt: "2026-06-05T16:35:00Z",
    updatedAt: "2026-06-05T16:35:00Z",
    status: "in_review",
    category: "feature_request",
    priority: "normal",
    name: "Avery Morgan",
    email: "owner@riverbend.example",
    organizationSlug: "riverbend",
    organizationName: "Riverstone Nature Center",
    facilityName: "Riverstone Outdoor Center",
    pageUrl: "/o/riverbend/registrations",
    title: "Staff-friendly camp session transfer workflow",
    description: "Moving a child between camp weeks should retain waiver and guardian context.",
    workflowAffected: "Registrations",
    businessImpact: "Reduces manual admin work during camp season."
  },
  {
    id: "support_req_003",
    createdAt: "2026-06-04T18:00:00Z",
    updatedAt: "2026-06-04T18:00:00Z",
    status: "new",
    category: "question",
    priority: "normal",
    name: "Taylor Nguyen",
    email: "taylor@summitrec.co",
    organizationSlug: "summit",
    organizationName: "Summit Rec Collective",
    facilityName: "Summit Downtown",
    pageUrl: "/o/summit/dashboard",
    title: "Front desk onboarding question",
    description: "Need a workflow review for new front desk staff before summer rush.",
    requestedDate: "2026-06-14",
    estimatedAttendees: 8,
    topicsRequested: "Check-in, POS, household recovery"
  }
];

type SupportStateContextValue = {
  supportStaffMembers: SupportStaffMember[];
  supportRequests: SupportRequestRecord[];
  supportAuditLog: SupportAuditEvent[];
  impersonationSessions: SupportImpersonationSession[];
  activeImpersonationSession: SupportImpersonationSession | null;
  unresolvedRequests: SupportRequestRecord[];
  recentProductFeedback: SupportRequestRecord[];
  globalCustomers: typeof seededCustomers;
  submitSupportRequest: (input: {
    name: string;
    email: string;
    organizationSlug?: string;
    organizationName?: string;
    facilityName?: string;
    pageUrl?: string;
    userRole?: string;
    category: SupportRequestCategory;
    priority: SupportRequestPriority;
    title?: string;
    description: string;
    workflowAffected?: string;
    businessImpact?: string;
    requestedDate?: string;
    estimatedAttendees?: number;
    topicsRequested?: string;
    screenshotName?: string;
  }) => { ok: boolean; message: string; requestId?: string };
  updateSupportRequestStatus: (requestId: string, status: SupportRequestStatus) => { ok: boolean; message: string };
  startImpersonation: (input: {
    organizationSlug: string;
    organizationName: string;
    facilityName?: string;
    reason: string;
  }) => { ok: boolean; message: string; session?: SupportImpersonationSession };
  endImpersonation: (reason?: string) => { ok: boolean; message: string };
  logSupportEvent: (input: Omit<SupportAuditEvent, "id" | "timestamp">) => void;
  markImpersonationNotified: (sessionId: string) => void;
};

const SupportStateContext = createContext<SupportStateContextValue | null>(null);

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getAuthenticatedSupportStaff(supportStaffMembers: SupportStaffMember[]) {
  const session = getSessionFromCookieClient();
  if (!session || session.kind !== "support_staff") return null;
  return supportStaffMembers.find((entry) => entry.id === session.userId) ?? null;
}

export function SupportStateProvider({ children }: { children: React.ReactNode }) {
  const [supportStaffMembers] = useState<SupportStaffMember[]>(seedSupportStaffMembers());
  const [supportRequests, setSupportRequests] = useState<SupportRequestRecord[]>(() => normalizeSupportRequests(readStorage(SUPPORT_REQUESTS_STORAGE_KEY, seededRequests)));
  const [supportAuditLog, setSupportAuditLog] = useState<SupportAuditEvent[]>(() => readStorage(SUPPORT_AUDIT_STORAGE_KEY, []));
  const [impersonationSessions, setImpersonationSessions] = useState<SupportImpersonationSession[]>(() => readStorage(SUPPORT_IMPERSONATION_STORAGE_KEY, []));
  const [activeImpersonationSession, setActiveImpersonationSession] = useState<SupportImpersonationSession | null>(null);

  useEffect(() => {
    setActiveImpersonationSession(getSupportSessionFromCookieClient());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SUPPORT_REQUESTS_STORAGE_KEY, JSON.stringify(supportRequests));
  }, [supportRequests]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SUPPORT_AUDIT_STORAGE_KEY, JSON.stringify(supportAuditLog));
  }, [supportAuditLog]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SUPPORT_IMPERSONATION_STORAGE_KEY, JSON.stringify(impersonationSessions));
  }, [impersonationSessions]);

  const logSupportEvent: SupportStateContextValue["logSupportEvent"] = (input) => {
    const event: SupportAuditEvent = {
      id: `support_audit_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...input
    };
    setSupportAuditLog((prev) => [event, ...prev].slice(0, 500));
  };

  const submitSupportRequest: SupportStateContextValue["submitSupportRequest"] = (input) => {
    const name = input.name.trim() || "Anonymous tester";
    const email = input.email.trim() || "Not provided";
    const description = input.description.trim();
    if (!description) {
      return { ok: false, message: "Description is required." };
    }
    const now = new Date().toISOString();
    const request: SupportRequestRecord = {
      id: `support_req_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      status: "new",
      category: input.category,
      priority: input.priority,
      name,
      email,
      organizationSlug: input.organizationSlug,
      organizationName: input.organizationName,
      facilityName: input.facilityName,
      pageUrl: input.pageUrl,
      userRole: input.userRole,
      title: input.title?.trim() || undefined,
      description,
      workflowAffected: input.workflowAffected?.trim() || undefined,
      businessImpact: input.businessImpact?.trim() || undefined,
      requestedDate: input.requestedDate,
      estimatedAttendees: input.estimatedAttendees,
      topicsRequested: input.topicsRequested?.trim() || undefined,
      screenshotName: input.screenshotName
    };
    setSupportRequests((prev) => [request, ...prev]);
    logSupportEvent({
      supportStaffId: "facility_self_service",
      supportStaffName: name,
      supportStaffEmail: email,
      organizationSlug: input.organizationSlug,
      organizationName: input.organizationName,
      facilityName: input.facilityName,
      actionTaken: "support_request_submitted",
      reasonProvided: input.category.replaceAll("_", " ")
    });
    return { ok: true, message: "Feedback submitted. Cairn support has received it.", requestId: request.id };
  };

  const updateSupportRequestStatus: SupportStateContextValue["updateSupportRequestStatus"] = (requestId, status) => {
    let found = false;
    setSupportRequests((prev) =>
      prev.map((entry) => {
        if (entry.id !== requestId) return entry;
        found = true;
        return { ...entry, status, updatedAt: new Date().toISOString() };
      })
    );
    const supportUser = getAuthenticatedSupportStaff(supportStaffMembers);
    const updatedRequest = supportRequests.find((entry) => entry.id === requestId);
    if (found && supportUser) {
      logSupportEvent({
        supportStaffId: supportUser.id,
        supportStaffName: `${supportUser.firstName} ${supportUser.lastName}`,
        supportStaffEmail: supportUser.email,
        organizationSlug: updatedRequest?.organizationSlug,
        organizationName: updatedRequest?.organizationName,
        facilityName: updatedRequest?.facilityName,
        actionTaken: "data_edit",
        reasonProvided: `Support request marked ${status}`,
        metadata: { requestId }
      });
    }
    return { ok: found, message: found ? "Support request updated." : "Support request not found." };
  };

  const startImpersonation: SupportStateContextValue["startImpersonation"] = (input) => {
    const reason = input.reason.trim();
    if (!reason) return { ok: false, message: "A reason is required before starting support mode." };
    const session = getSessionFromCookieClient();
    if (!session || session.kind !== "support_staff") {
      return { ok: false, message: "Support staff authentication is required." };
    }
    const supportUser = supportStaffMembers.find((entry) => entry.id === session.userId);
    if (!supportUser) return { ok: false, message: "Support staff profile not found." };

    const nextSession: SupportImpersonationSession = {
      id: `support_session_${Math.random().toString(36).slice(2, 9)}`,
      supportStaffId: supportUser.id,
      supportStaffName: `${supportUser.firstName} ${supportUser.lastName}`,
      supportStaffEmail: supportUser.email,
      organizationSlug: input.organizationSlug,
      organizationName: input.organizationName,
      facilityName: input.facilityName,
      reason,
      startedAt: new Date().toISOString(),
      status: "active"
    };
    writeSupportSessionCookie(nextSession);
    setActiveImpersonationSession(nextSession);
    setImpersonationSessions((prev) => [nextSession, ...prev.filter((entry) => entry.status === "ended" || entry.id !== nextSession.id)]);
    logSupportEvent({
      supportStaffId: supportUser.id,
      supportStaffName: `${supportUser.firstName} ${supportUser.lastName}`,
      supportStaffEmail: supportUser.email,
      organizationSlug: input.organizationSlug,
      organizationName: input.organizationName,
      facilityName: input.facilityName,
      actionTaken: "organization_access",
      reasonProvided: reason
    });
    logSupportEvent({
      supportStaffId: supportUser.id,
      supportStaffName: `${supportUser.firstName} ${supportUser.lastName}`,
      supportStaffEmail: supportUser.email,
      organizationSlug: input.organizationSlug,
      organizationName: input.organizationName,
      facilityName: input.facilityName,
      actionTaken: "facility_access",
      reasonProvided: reason
    });
    logSupportEvent({
      supportStaffId: supportUser.id,
      supportStaffName: `${supportUser.firstName} ${supportUser.lastName}`,
      supportStaffEmail: supportUser.email,
      organizationSlug: input.organizationSlug,
      organizationName: input.organizationName,
      facilityName: input.facilityName,
      actionTaken: "impersonation_start",
      reasonProvided: reason
    });
    return { ok: true, message: `Support session started for ${input.organizationName}.`, session: nextSession };
  };

  const endImpersonation: SupportStateContextValue["endImpersonation"] = (reason) => {
    const active = getSupportSessionFromCookieClient() ?? activeImpersonationSession;
    if (!active) return { ok: false, message: "No active support session." };
    clearSupportSessionCookie();
    setActiveImpersonationSession(null);
    const endedAt = new Date().toISOString();
    setImpersonationSessions((prev) =>
      prev.map((entry) => (entry.id === active.id ? { ...entry, status: "ended", endedAt } : entry))
    );
    logSupportEvent({
      supportStaffId: active.supportStaffId,
      supportStaffName: active.supportStaffName,
      supportStaffEmail: active.supportStaffEmail,
      organizationSlug: active.organizationSlug,
      organizationName: active.organizationName,
      facilityName: active.facilityName,
      actionTaken: "impersonation_end",
      reasonProvided: reason?.trim() || active.reason
    });
    return { ok: true, message: "Support session ended." };
  };

  const markImpersonationNotified: SupportStateContextValue["markImpersonationNotified"] = (sessionId) => {
    setImpersonationSessions((prev) =>
      prev.map((entry) =>
        entry.id === sessionId && !entry.notificationDeliveredAt
          ? { ...entry, notificationDeliveredAt: new Date().toISOString() }
          : entry
      )
    );
  };

  useEffect(() => {
    const session = getSessionFromCookieClient();
    if (session?.kind === "support_staff") {
      const supportUser = supportStaffMembers.find((entry) => entry.id === session.userId);
      if (supportUser) {
        const alreadyLogged = supportAuditLog.some(
          (entry) =>
            entry.actionTaken === "support_login" &&
            entry.supportStaffId === supportUser.id &&
            entry.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10)
        );
        if (!alreadyLogged) {
          logSupportEvent({
            supportStaffId: supportUser.id,
            supportStaffName: `${supportUser.firstName} ${supportUser.lastName}`,
            supportStaffEmail: supportUser.email,
            actionTaken: "support_login",
            reasonProvided: "Authenticated into support console"
          });
        }
      }
    }
  }, [supportAuditLog, supportStaffMembers]);

  const value = useMemo<SupportStateContextValue>(() => ({
    supportStaffMembers,
    supportRequests,
    supportAuditLog,
    impersonationSessions,
    activeImpersonationSession,
    unresolvedRequests: supportRequests.filter((entry) => entry.status === "new" || entry.status === "in_review" || entry.status === "planned"),
    recentProductFeedback: supportRequests.filter((entry) => entry.category === "feature_request" || entry.category === "confusing_workflow" || entry.category === "general_feedback"),
    globalCustomers: seededCustomers,
    submitSupportRequest,
    updateSupportRequestStatus,
    startImpersonation,
    endImpersonation,
    logSupportEvent,
    markImpersonationNotified
  }), [supportStaffMembers, supportRequests, supportAuditLog, impersonationSessions, activeImpersonationSession]);

  return <SupportStateContext.Provider value={value}>{children}</SupportStateContext.Provider>;
}

export function useSupportState() {
  const context = useContext(SupportStateContext);
  if (!context) throw new Error("useSupportState must be used within SupportStateProvider");
  return context;
}

export function getSupportFacilityHealthSnapshot() {
  const organizations = buildSeedProvisionedOrganizations();
  return organizations.map((organization) => {
    const customerCount = seededCustomers.filter((entry) => entry.organizationId === organization.id).length;
    return {
      organizationSlug: organization.slug,
      organizationName: organization.name,
      facilityCount: organization.stats.locations,
      customerCount,
      supportTier: organization.supportTier ?? "standard",
      trialStatus: organization.status === "trial" ? "Trial" : "Live",
      lastActivityAt: organization.lastActivityAt ?? organization.createdAt
    };
  });
}
