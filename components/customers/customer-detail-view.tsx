"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ContextBackLink } from "@/components/shared/context-back-link";
import { CustomerBadges } from "@/components/customers/customer-badges";
import { ActivityTimeline } from "@/components/customers/activity-timeline";
import { CustomerDetailActions } from "@/components/customers/customer-detail-actions";
import { CustomerSummaryCard } from "@/components/customers/customer-summary-card";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModalShell } from "@/components/ui/modal-shell";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { DigitalMembershipCard } from "@/components/memberships/digital-membership-card";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSettingsState } from "@/lib/state/settings-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { filterCustomers } from "@/lib/data/customer-search";
import { formatDate, formatDateTime, formatDateWithAge, formatShortDate, formatTime } from "@/lib/format/date";
import { formatCurrency } from "@/lib/transactions";
import { buildDetailHref } from "@/lib/navigation/detail-navigation";
import { buildMembershipCardRecord } from "@/lib/memberships/cards";
import { ROLE_LABELS } from "@/lib/staff/capabilities";
import { PERMISSION_LABELS } from "@/lib/staff/permissions";
import type { CommunicationRecord, Customer, StaffRole } from "@/types/domain";

type CustomerDocumentType =
  | "waiver"
  | "medical"
  | "incident_report"
  | "membership"
  | "consent_form"
  | "general_document"
  | "photo";

type CustomerDocumentRecord = {
  id: string;
  customerId: string;
  name: string;
  type: CustomerDocumentType;
  uploadedBy: string;
  uploadedAt: string;
  status: "active" | "archived";
};

export function CustomerDetailView({
  customerId,
  persistedCustomer
}: {
  customerId: string;
  persistedCustomer?: Customer;
}) {
  const pathname = usePathname() ?? "";
  const {
    customers,
    memberships,
    punchPasses,
    checkInRecords,
    transactions,
    accessProducts,
    waivers,
    registrations,
    sessions,
    programs,
    evaluateCustomerEntry,
    customerAccessRecords,
    updateCustomerAccessRecord,
    updateCustomerWaiver,
    signWaiverForCustomer,
    getWaiverStatusForCustomer,
    getSignedWaiverRecordsForCustomer,
    operationsAlerts,
    createOperationsAlert,
    resolveOperationsAlert,
    archiveOperationsAlert,
    households,
    householdMembers,
    communications,
    createCommunication,
    updateCustomerCommunicationPreferences,
    createHousehold,
    addHouseholdMember,
    removeHouseholdMember,
    updateHouseholdMember,
    familyCheckIn,
    updateStaffProfileForCustomer,
    updateCustomerPhoto
  } = useCustomerState();
  const { settings } = useSettingsState();
  const currentOrgSlug = pathname.match(/^\/o\/([^/]+)/)?.[1] ?? "summit";
  const {
    activeStaff,
    hasPermission,
    resetStaffPin,
    resetPasswordPlaceholder,
    suspendStaffMember,
    activateStaffMember,
    updateStaffMember
  } = useWorkstationState();
  const [householdMemberQuery, setHouseholdMemberQuery] = useState("");
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [profileFeedback, setProfileFeedback] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showEditStaffProfile, setShowEditStaffProfile] = useState(false);
  const [staffProfileDraft, setStaffProfileDraft] = useState<{
    role: StaffRole;
    status: "active" | "inactive" | "on_leave";
    locations: string[];
    startDate: string;
    staffNotes: string;
  } | null>(null);
  const [showHouseholdDetail, setShowHouseholdDetail] = useState(false);
  const [selectedHouseholdCheckInIds, setSelectedHouseholdCheckInIds] = useState<string[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [draftMember, setDraftMember] = useState<{
    memberType: "adult" | "child";
    relationship: string;
    emergencyContactPriority?: number;
    canCheckInOthers: boolean;
    canPurchaseForOthers: boolean;
    canSignWaivers: boolean;
  } | null>(null);
  const [activeSignedWaiverId, setActiveSignedWaiverId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "profile" | "access" | "waivers" | "registrations" | "visits" | "purchases" | "communications" | "staff_actions"
  >("all");
  const [communicationFilter, setCommunicationFilter] = useState<"all" | CommunicationRecord["channel"]>("all");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const customer = persistedCustomer ?? customers.find((entry) => entry.id === customerId);
  const usesPersistedCustomer = Boolean(persistedCustomer);

  if (!customer) {
    return <p className="text-sm text-muted-foreground">Customer not found.</p>;
  }

  const membership = customer.membershipId ? memberships.find((entry) => entry.id === customer.membershipId) : undefined;
  const waiver = customer.waiverId ? waivers.find((entry) => entry.id === customer.waiverId) : undefined;
  const signedWaiverRecords = getSignedWaiverRecordsForCustomer(customer.id);
  const activeSignedWaiver = activeSignedWaiverId
    ? signedWaiverRecords.find((entry) => entry.id === activeSignedWaiverId)
    : undefined;
  const generalWaiverStatus = getWaiverStatusForCustomer(customer.id, "wtpl_general");
  const pass = customer.punchPassId ? punchPasses.find((entry) => entry.id === customer.punchPassId) : undefined;
  const [documents, setDocuments] = useState<CustomerDocumentRecord[]>([
    {
      id: `doc-waiver-${customer.id}`,
      customerId: customer.id,
      name: "Signed General Facility Waiver",
      type: "waiver",
      uploadedBy: "System",
      uploadedAt: "2026-03-02T11:22:00Z",
      status: "active"
    },
    {
      id: `doc-membership-${customer.id}`,
      customerId: customer.id,
      name: "Membership Agreement",
      type: "membership",
      uploadedBy: "Maya Lopez",
      uploadedAt: "2026-02-15T09:10:00Z",
      status: "active"
    }
  ]);
  const customerCommunications = communications.filter((entry) => entry.customerId === customer.id);
  const recentCheckIns = checkInRecords
    .filter((entry) => entry.customerId === customer.id)
    .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))
    .slice(0, 6);
  const recentPurchases = transactions
    .filter(
      (entry) =>
        entry.customerId === customer.id ||
        entry.purchaserCustomerId === customer.id ||
        (entry.purchasedForCustomerIds ?? []).includes(customer.id)
    )
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 6);
  const customerSessionHistory = registrations
    .filter((entry) => entry.customerId === customer.id)
    .map((entry) => {
      const session = sessions.find((item) => item.id === entry.sessionId);
      const program = session ? programs.find((item) => item.id === session.programId) : undefined;
      return { registration: entry, session, program };
    })
    .filter((entry) => entry.session)
    .sort((a, b) => (b.session?.startsAt ?? "").localeCompare(a.session?.startsAt ?? ""));
  const accessRecords = customerAccessRecords
    .filter((entry) => entry.customerId === customer.id)
    .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  const derivedAccessPurchases = accessRecords
    .filter((entry) => entry.type === "membership" || entry.type === "day-pass" || entry.type === "punch-pass" || entry.type === "comp")
    .map((entry) => ({
      id: `access-purchase-${entry.id}`,
      completedAt: `${entry.startDate}T12:00:00Z`,
      soldByStaffName: entry.grantedByStaffName ?? "Staff not recorded",
      receiptNumber: `ACCESS-${entry.id.slice(-4).toUpperCase()}`,
      items: [
        {
          productId: entry.productId ?? entry.id,
          productName:
            accessProducts.find((product) => product.id === entry.productId)?.name ??
            entry.notes ??
            (entry.type === "day-pass"
              ? "Day Pass"
              : entry.type === "punch-pass"
                ? "Punch Pass"
                : entry.type === "membership"
                  ? "Membership"
                  : "Comp Access"),
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0
        }
      ],
      total: 0
    }));
  const purchaseHistoryEntries = [...recentPurchases, ...derivedAccessPurchases]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 8);
  const upcomingSessions = customerSessionHistory.filter((entry) => {
    const startsAt = entry.session?.startsAt ?? "";
    return startsAt >= "2026-05-22" && (entry.session?.status ?? "scheduled") !== "cancelled";
  });
  const pastSessions = customerSessionHistory.filter((entry) => {
    const startsAt = entry.session?.startsAt ?? "";
    return startsAt < "2026-05-22" || (entry.session?.status ?? "scheduled") === "cancelled";
  });
  const latestUpcomingSession = upcomingSessions[0];
  const activeAccessCount = accessRecords.filter((entry) => entry.status === "active").length;
  const decision = evaluateCustomerEntry(customer.id);
  const currentAccessLabel = decision.chosenAccess
    ? decision.chosenAccess.type === "membership"
      ? "Membership"
      : decision.chosenAccess.type === "day-pass"
        ? "Day Pass"
        : decision.chosenAccess.type === "punch-pass"
          ? "Punch Pass"
          : "Comp"
    : decision.sessionAccess
      ? "Session Registration"
      : "No Eligible Access";
  const currentAccessDetail = decision.chosenAccess
    ? decision.chosenAccess.type === "membership"
      ? `Expires ${decision.chosenAccess.expirationDate ?? "N/A"}`
      : decision.chosenAccess.type === "punch-pass"
        ? `${decision.chosenAccess.remainingPunches ?? 0} punches remaining`
        : decision.chosenAccess.type === "day-pass"
          ? `Valid ${decision.chosenAccess.expirationDate ?? "today"}`
          : "Manual comp access"
    : decision.sessionAccess
      ? `Registered for ${decision.sessionAccess.sessionTitle}`
      : decision.reasons[0] ?? "No valid access found";
  const displayedPronouns = customer.pronouns === "Custom" ? customer.customPronouns ?? "Custom" : customer.pronouns ?? "Not set";
  const notesPreview = customer.notes?.trim() ? customer.notes.trim() : "No notes on file.";
  const shortNotesPreview = notesPreview.length > 140 ? `${notesPreview.slice(0, 140).trim()}…` : notesPreview;
  const dobDate = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
  const hasValidDob = !!dobDate && !Number.isNaN(dobDate.getTime());
  const todayDateKey = new Date().toISOString().slice(0, 10);
  const age = hasValidDob
    ? Math.max(0, Math.floor((Date.now() - (dobDate as Date).getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
    : null;
  const isBirthdayToday = hasValidDob
    ? (() => {
        const now = new Date();
        return now.getUTCMonth() === (dobDate as Date).getUTCMonth() && now.getUTCDate() === (dobDate as Date).getUTCDate();
      })()
    : false;
  const requiredMissing = {
    preferredName: !customer.preferredName?.trim(),
    pronouns: !displayedPronouns?.trim() || displayedPronouns === "Not set",
    dateOfBirth: !hasValidDob,
    phone: !customer.phone?.trim(),
    addressLine1: !customer.addressLine1?.trim(),
    city: !customer.city?.trim(),
    state: !customer.state?.trim(),
    postalCode: !customer.postalCode?.trim(),
    emergencyContactName: !customer.emergencyContactName?.trim(),
    emergencyContactPhone: !customer.emergencyContactPhone?.trim()
  };
  const householdMembership = householdMembers.find((entry) => entry.customerId === customer.id);
  const customerStaffProfile = customer.staffProfile?.isStaff ? customer.staffProfile : null;
  const photoUpdatedBy =
    customer.profilePhotoUpdatedBy ||
    (customer.profilePhotoUpdatedByStaffId
      ? `${activeStaff?.id === customer.profilePhotoUpdatedByStaffId ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff member"}`
      : "Not recorded");
  const openEditStaffProfile = () => {
    if (!customerStaffProfile) return;
    setStaffProfileDraft({
      role: customerStaffProfile.role,
      status: customerStaffProfile.status,
      locations: [...customerStaffProfile.locations],
      startDate: customerStaffProfile.startDate ?? "",
      staffNotes: customerStaffProfile.staffNotes ?? ""
    });
    setShowEditStaffProfile(true);
  };
  const household = householdMembership ? households.find((entry) => entry.id === householdMembership.householdId) : undefined;
  const householdRows = household
    ? householdMembers
        .filter((entry) => entry.householdId === household.id)
        .map((entry) => ({
          ...entry,
          customer: customers.find((customerEntry) => customerEntry.id === entry.customerId)
        }))
        .sort((a, b) => (a.emergencyContactPriority ?? 999) - (b.emergencyContactPriority ?? 999))
    : [];
  const householdCustomerIdSet = new Set(householdRows.map((row) => row.customerId));
  const householdPrimaryContact = household
    ? customers.find((entry) => entry.id === household.primaryContactCustomerId)
    : undefined;
  const householdBillingCustomer = household
    ? customers.find((entry) => entry.id === household.billingCustomerId)
    : undefined;
  const householdDefaultPayment = householdBillingCustomer?.paymentMethods?.find((method) => method.isDefault);
  const householdCheckInRows = householdRows.filter((row) => row.customer);
  const householdActiveCheckIns = householdCheckInRows.filter((row) => row.customer?.checkInStatus === "in").length;
  const householdWaiverIssues = householdCheckInRows.filter((row) => {
    const rowCustomer = row.customer;
    if (!rowCustomer) return false;
    const rowWaiver = rowCustomer.waiverId ? waivers.find((entry) => entry.id === rowCustomer.waiverId) : undefined;
    return !rowWaiver || rowWaiver.status !== "valid";
  }).length;
  const householdActiveAccess = householdCheckInRows.filter((row) => {
    const rowCustomer = row.customer;
    if (!rowCustomer) return false;
    return customerAccessRecords.some((entry) => entry.customerId === rowCustomer.id && entry.status === "active");
  }).length;
  const householdUpcomingPrograms = registrations
    .filter((registration) => householdRows.some((row) => row.customerId === registration.customerId))
    .filter((registration) => registration.status === "confirmed" || registration.status === "waitlisted")
    .map((registration) => {
      const session = sessions.find((entry) => entry.id === registration.sessionId);
      const program = session ? programs.find((entry) => entry.id === session.programId) : undefined;
      return {
        registration,
        session,
        program,
        customer: customers.find((entry) => entry.id === registration.customerId)
      };
    })
    .filter((entry) => entry.session)
    .sort((a, b) => (a.session?.startsAt ?? "").localeCompare(b.session?.startsAt ?? ""))
    .slice(0, 6);
  const householdPurchases = transactions
    .filter((transaction) => {
      if (transaction.customerId && householdCustomerIdSet.has(transaction.customerId)) return true;
      if (transaction.purchaserCustomerId && householdCustomerIdSet.has(transaction.purchaserCustomerId)) return true;
      return (transaction.purchasedForCustomerIds ?? []).some((id) => householdCustomerIdSet.has(id));
    })
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 6);
  const alerts: Array<{ id: string; tone: "warning" | "danger" | "success"; message: string }> = [];
  const customerOperationsAlerts = operationsAlerts.filter((entry) => entry.customerId === customer.id);
  const openCustomerOperationsAlerts = customerOperationsAlerts.filter((entry) => entry.status === "open");
  if (!waiver || waiver.status !== "valid") alerts.push({ id: "waiver", tone: "danger", message: waiver?.status === "expired" ? "Waiver expired" : "Waiver missing" });
  if (membership && membership.status === "inactive") alerts.push({ id: "membership", tone: "danger", message: "Membership expired" });
  if (decision.chosenAccess?.type === "punch-pass" && (decision.chosenAccess.remainingPunches ?? 0) <= 2) {
    alerts.push({ id: "punch", tone: "warning", message: `Punch pass low (${decision.chosenAccess.remainingPunches ?? 0} remaining)` });
  }
  if (isBirthdayToday) alerts.push({ id: "birthday", tone: "success", message: "Birthday today" });
  if (requiredMissing.emergencyContactName || requiredMissing.emergencyContactPhone) alerts.push({ id: "emergency", tone: "warning", message: "Emergency contact missing" });
  if (decision.reasons.some((reason) => reason.toLowerCase().includes("guardian"))) alerts.push({ id: "guardian", tone: "warning", message: "Guardian required" });
  if (decision.reasons.some((reason) => reason.toLowerCase().includes("balance due") || reason.toLowerCase().includes("unpaid"))) alerts.push({ id: "balance", tone: "warning", message: "Balance due" });
  if (latestUpcomingSession?.session?.startsAt?.slice(0, 10) === todayDateKey) alerts.push({ id: "registration", tone: "warning", message: "Upcoming registration today" });
  const householdCandidates = useMemo(
    () =>
      householdMemberQuery.trim().length === 0
        ? []
        : filterCustomers(
            customers.filter((entry) => !householdRows.some((member) => member.customerId === entry.id)),
            householdMemberQuery
          ).slice(0, 8),
    [customers, householdRows, householdMemberQuery]
  );
  const sectionLinks = useMemo(() => {
    const links: Array<{ id: string; label: string }> = [
      { id: "overview", label: "Overview" },
      { id: "profile", label: "Profile" },
      { id: "access", label: "Access" }
    ];
    if (customerStaffProfile) links.push({ id: "staff-profile", label: "Staff Profile" });
    links.push(
      { id: "relationships", label: "Relationships" },
      { id: "payment", label: "Payment" },
      { id: "visits", label: "Visits" },
      { id: "purchases", label: "Purchases" },
      { id: "documents", label: "Documents" },
      { id: "communications", label: "Communications" },
      { id: "registrations", label: "Registrations" },
      { id: "waiver", label: "Waivers" },
      { id: "notes", label: "Notes" },
      { id: "timeline", label: "Activity Timeline" }
    );
    return links;
  }, [customerStaffProfile]);

  const beginEditHouseholdMember = (member: (typeof householdRows)[number]) => {
    setEditingMemberId(member.customerId);
    setDraftMember({
      memberType: member.memberType,
      relationship: member.relationship,
      emergencyContactPriority: member.emergencyContactPriority,
      canCheckInOthers: member.canCheckInOthers,
      canPurchaseForOthers: member.canPurchaseForOthers,
      canSignWaivers: member.canSignWaivers
    });
  };

  const cancelEditHouseholdMember = () => {
    setEditingMemberId(null);
    setDraftMember(null);
  };
  const timelineEvents = [
    ...recentPurchases.map((entry) => ({
      id: `purchase-${entry.id}`,
      occurredAt: entry.completedAt,
      title: "POS Purchase",
      detail: `${(entry.items ?? []).map((item) => item.productName ?? "Unknown item").join(", ") || "Unknown item"} • ${formatCurrency(entry.total)}`,
      staff: entry.soldByStaffName ?? "Staff not recorded",
      category: "purchases" as const
    })),
    ...(waiver
      ? [
          {
            id: `waiver-${waiver.id}`,
            occurredAt: waiver.signedAt ?? waiver.expiresAt ?? "2026-05-20",
            title: "Waiver Update",
            detail: `Status: ${waiver.status}`,
            staff: waiver.updatedByStaffName ?? "Staff not recorded",
            category: "waivers" as const
          }
        ]
      : []),
    ...customerOperationsAlerts.map((entry) => ({
      id: `operations-alert-${entry.id}`,
      occurredAt: entry.createdAt,
      title: entry.title,
      detail: `${titleCase(entry.type)} alert • ${entry.description ?? titleCase(entry.status)}`,
      staff: entry.createdByStaffName ?? "System",
      category: "staff_actions" as const
    })),
    ...customerSessionHistory.slice(0, 4).map((entry) => ({
      id: `registration-${entry.registration.id}`,
      occurredAt: entry.session?.startsAt ?? "2026-05-20",
      title: "Session Registration",
      detail: `${entry.session?.title ?? entry.program?.title ?? "Session"} • ${entry.registration.status}`,
      staff: "Staff not recorded",
      category: "registrations" as const
    })),
    ...accessRecords.slice(0, 4).map((entry) => ({
      id: `access-${entry.id}`,
      occurredAt: entry.startDate ?? "2026-05-20",
      title: "Access Change",
      detail: `${entry.notes ?? entry.type} • ${entry.status}`,
      staff: entry.grantedByStaffName ?? "Staff not recorded",
      category: "access" as const
    })),
    ...(customer.updatedAt
      ? [
          {
            id: `profile-update-${customer.id}`,
            occurredAt: customer.updatedAt,
            title: "Profile Update",
            detail: "Customer profile details updated",
            staff: customer.updatedByStaffName ?? "Staff not recorded",
            category: "profile" as const
          }
        ]
      : []),
    ...recentCheckIns
      .filter((entry) => Boolean(entry.overrideReason))
      .map((entry) => ({
        id: `override-${entry.id}`,
        occurredAt: entry.checkInTime,
        title: "Manager Override",
        detail: entry.overrideReason ?? "Override applied",
        staff: entry.checkedInByStaffName ?? "Staff not recorded",
        category: "staff_actions" as const
      }))
    ,
    ...documents.map((entry) => ({
      id: `document-${entry.id}`,
      occurredAt: entry.uploadedAt,
      title: "Document Uploaded",
      detail: `${entry.name} • ${titleCase(entry.type)}`,
      staff: entry.uploadedBy,
      category: "profile" as const
    })),
    ...customerCommunications.map((entry) => ({
      id: `communication-${entry.id}`,
      occurredAt: entry.sentAt ?? entry.scheduledFor ?? entry.createdAt,
      title: "Communication Logged",
      detail: `${entry.subject} • ${titleCase(entry.channel)}`,
      staff: entry.createdByStaffName ?? "System",
      category: "communications" as const
    })),
    ...customerOperationsAlerts.map((entry) => ({
      id: `alert-${entry.id}`,
      occurredAt: entry.createdAt,
      title: "Alert Updated",
      detail: `${entry.title} • ${titleCase(entry.status)}`,
      staff: entry.createdByStaffName ?? "System",
      category: "staff_actions" as const
    }))
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const filteredTimelineEvents = timelineFilter === "all"
    ? timelineEvents
    : timelineEvents.filter((entry) => entry.category === timelineFilter);
  const filteredCommunications = communicationFilter === "all"
    ? customerCommunications
    : customerCommunications.filter((entry) => entry.channel === communicationFilter);
  const openAlerts = openCustomerOperationsAlerts;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncHash = () => {
      const id = window.location.hash.replace("#", "").trim();
      if (id) setActiveSection(id);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const sectionIds = sectionLinks.map((entry) => entry.id);
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top) return;
        const nextId = top.target.id;
        if (!nextId || nextId === activeSection) return;
        setActiveSection(nextId);
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75]
      }
    );
    sections.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sectionLinks, activeSection]);

  useEffect(() => {
    if (!showHouseholdDetail) return;
    if (selectedHouseholdCheckInIds.length > 0) return;
    setSelectedHouseholdCheckInIds(householdRows.map((member) => member.customerId));
  }, [showHouseholdDetail, selectedHouseholdCheckInIds.length, householdRows]);

  return (
    <div className="space-y-4">
      <div>
        <ContextBackLink className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" />
      </div>
      <Card aria-label="detail-header">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 flex-1 min-w-[320px]">
              <div className="flex items-start gap-3">
              <CustomerAvatar customer={customer} sizeClassName="h-32 w-32" />
              <div>
                <h2 className="text-2xl font-semibold">{customer.firstName} {customer.lastName}</h2>
                <p className="text-sm text-muted-foreground">{customer.memberId}</p>
                {customer.preferredName?.trim() && customer.preferredName.trim().toLowerCase() !== customer.firstName.toLowerCase() ? (
                  <p className="text-sm text-muted-foreground">Preferred: {customer.preferredName}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{displayedPronouns || "Not set"}</span>
                  <span>•</span>
                  <span>{hasValidDob ? `${formatShortDate(dobDate)} (${age})` : "DOB not set"}</span>
                </div>
                {isBirthdayToday ? (
                  <p className="mt-2 inline-flex items-center rounded-full bg-amber-100/80 px-2.5 py-1 text-xs font-semibold text-amber-900">🎂 Birthday today</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (!file) return;
                      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                        setProfileFeedback("Unsupported file type. Use JPG, PNG, or WEBP.");
                        return;
                      }
                      if (file.size > 3 * 1024 * 1024) {
                        setProfileFeedback("Image is too large. Max size is 3MB.");
                        return;
                      }
                      const applyPhoto = (url: string) => {
                        if (!url) return;
                        const result = updateCustomerPhoto({
                          customerId: customer.id,
                          profilePhotoUrl: url,
                          updatedByStaffId: activeStaff?.id ?? "",
                          updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                        });
                        setProfileFeedback(result.message);
                      };
                      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
                        applyPhoto(URL.createObjectURL(file));
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const url = typeof reader.result === "string" ? reader.result : "";
                        applyPhoto(url);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button variant="secondary" className="h-9" onClick={() => photoInputRef.current?.click()}>
                    {customer.profilePhotoUrl ? "Replace Photo" : "Upload Photo"}
                  </Button>
                  {customer.profilePhotoUrl ? (
                    <Button
                      variant="destructiveSubtle"
                      className="h-9"
                      onClick={() => {
                        const result = updateCustomerPhoto({
                          customerId: customer.id,
                          profilePhotoUrl: "",
                          updatedByStaffId: activeStaff?.id ?? "",
                          updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                        });
                        setProfileFeedback(result.message);
                      }}
                    >
                      Remove Photo
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Photo updated: {customer.profilePhotoUpdatedAt ? formatDateTime(customer.profilePhotoUpdatedAt) : "Never"} • {photoUpdatedBy}
                </p>
              </div>
            </div>
              <div className="grid min-w-0 gap-2 md:grid-cols-2">
                <HeaderField label="Phone" value={customer.phone || "Not set"} warning={requiredMissing.phone} />
                <HeaderField label="Email" value={customer.email || "Not set"} wrapAnywhere />
                <HeaderField
                  label="Address"
                  value={
                    customer.addressLine1 && customer.city && customer.state && customer.postalCode
                      ? `${customer.addressLine1}${customer.addressLine2 ? `, ${customer.addressLine2}` : ""}, ${customer.city}, ${customer.state} ${customer.postalCode}`
                      : "Not set"
                  }
                  warning={requiredMissing.addressLine1 || requiredMissing.city || requiredMissing.state || requiredMissing.postalCode}
                  className="min-w-0"
                />
                <HeaderField
                  label="Emergency Contact"
                  value={customer.emergencyContactName ? `${customer.emergencyContactName}${customer.emergencyContactPhone ? ` • ${customer.emergencyContactPhone}` : ""}` : "Not set"}
                  warning={requiredMissing.emergencyContactName || requiredMissing.emergencyContactPhone}
                  wrapAnywhere
                />
                <div className="rounded-md bg-secondary/40 p-2 md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="text-sm">{shortNotesPreview}</p>
                  {notesPreview.length > shortNotesPreview.length ? (
                    <a href="#notes" className="mt-1 inline-flex text-xs font-medium text-muted-foreground underline">View full notes</a>
                  ) : null}
                </div>
              </div>
            </div>
            <CustomerDetailActions customerId={customer.id} persistedCustomer={persistedCustomer} />
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <CustomerBadges customer={customer} membership={membership} punchPass={pass} waiver={waiver} />
              {customerStaffProfile ? (
                <Badge tone="muted">Staff: {ROLE_LABELS[customerStaffProfile.role]}</Badge>
              ) : null}
            </div>
          </div>
          {alerts.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="detail-alert-summary">
              {alerts.map((alert) => (
                <Badge
                  key={alert.id}
                  tone={alert.tone === "danger" ? "danger" : alert.tone === "success" ? "success" : "warning"}
                >
                  {alert.message}
                </Badge>
              ))}
            </div>
          ) : null}
          {openAlerts.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2" aria-label="detail-customer-flags">
              {openAlerts.map((alert) => (
                <Badge
                  key={alert.id}
                  tone={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "muted"}
                >
                  {alert.title}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card aria-label="detail-jump-links" className="sticky top-4 z-20 border border-border/80 bg-background/95 shadow-md backdrop-blur">
        <CardContent className="rounded-xl p-4">
          <nav aria-label="Customer detail sections" className="flex flex-wrap gap-2">
            {sectionLinks.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setActiveSection(id)}
                className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                  activeSection === id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      <section id="overview" aria-label="section-overview" className="scroll-mt-40 space-y-4">
        <Card aria-label="detail-operational-alerts">
          <CardHeader><CardTitle>Alerts & Status</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {alerts.length === 0 ? (
              <p className="text-emerald-700">No active alerts.</p>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-2 rounded-md border border-border/70 bg-secondary/30 p-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      alert.tone === "danger" ? "bg-rose-500" : alert.tone === "success" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    aria-hidden
                  />
                  <span>{alert.message}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card aria-label="detail-alerts">
          <CardHeader><CardTitle>Alerts & Flags</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-9"
                variant="secondary"
                onClick={() => {
                  const result = createOperationsAlert({
                    title: "Staff Attention Required",
                    description: `Created from ${customer.firstName} ${customer.lastName}'s profile.`,
                    severity: "warning",
                    type: "customer",
                    customerId: customer.id,
                    createdByStaffId: activeStaff?.id,
                    createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff"
                  });
                  setProfileFeedback(result.message);
                }}
              >
                Create Alert
              </Button>
            </div>
            {customerOperationsAlerts.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3">
                <p className="font-medium">{entry.title}</p>
                <p className="text-muted-foreground">
                  {titleCase(entry.severity)} • {titleCase(entry.status)} • {(entry.createdByStaffName ?? "System")} • {formatDateTime(entry.createdAt)}
                </p>
                {entry.description ? <p className="mt-1 text-muted-foreground">{entry.description}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    className="h-8"
                    variant="secondary"
                    onClick={() => setProfileFeedback(resolveOperationsAlert(entry.id).message)}
                  >
                    Resolve Alert
                  </Button>
                  <Button
                    className="h-8"
                    variant="secondary"
                    onClick={() => setProfileFeedback(archiveOperationsAlert(entry.id).message)}
                  >
                    Archive Alert
                  </Button>
                </div>
              </div>
            ))}
            {customerOperationsAlerts.length === 0 ? <p className="text-muted-foreground">No alerts on this customer record yet.</p> : null}
          </CardContent>
        </Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="detail-summary-cards">
          <CustomerSummaryCard
            title="Access Status"
            value={activeAccessCount > 0 ? `${activeAccessCount} active` : "No active access"}
            detail={membership?.planName ?? pass?.title ?? customer.dayPassProductName ?? "No current plan or pass"}
          />
          <CustomerSummaryCard
            title="Waiver Status"
            value={waiver?.status === "valid" ? "Valid" : waiver?.status === "expired" ? "Expired" : "Missing"}
            detail={waiver?.expiresAt ? `Expires ${formatDate(waiver.expiresAt)}` : "No waiver on file"}
          />
          <CustomerSummaryCard
            title="Current Access"
            value={currentAccessLabel}
            detail={currentAccessDetail}
          />
          <CustomerSummaryCard
            title="Upcoming Registration"
            value={latestUpcomingSession ? latestUpcomingSession.session?.title ?? "Scheduled Session" : "No upcoming session"}
            detail={latestUpcomingSession?.session?.startsAt ? formatDateTime(latestUpcomingSession.session.startsAt) : "No upcoming registrations"}
          />
          <CustomerSummaryCard
            title="Alerts"
            value={`${openAlerts.length}`}
            detail={openAlerts.length ? "Needs attention" : "No open alerts"}
          />
          <CustomerSummaryCard
            title="Documents"
            value={`${documents.length}`}
            detail={documents.filter((entry) => entry.status === "archived").length ? "Includes archived files" : "All active"}
          />
        </div>
      </section>

      <section id="profile" aria-label="section-profile" className="scroll-mt-40 space-y-4">
        <Card aria-label="detail-profile-information">
          <CardHeader><CardTitle>Full Profile Metadata</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Photo & Profile Metadata</p>
              <CustomerAvatar customer={customer} sizeClassName="h-24 w-24" />
              <Field label="Profile photo" value={customer.profilePhotoUrl ? "Uploaded" : "Not set"} />
              <Field label="Photo updated by" value={photoUpdatedBy} />
              <Field label="Photo updated at" value={customer.profilePhotoUpdatedAt ? formatDateTime(customer.profilePhotoUpdatedAt) : "Not set"} />
              <Field label="Updated by" value={customer.updatedByStaffName || "Not set"} />
              <Field label="Last updated" value={customer.updatedAt ? formatDateTime(customer.updatedAt) : "Not set"} />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Data Completeness</p>
              <Field label="Preferred name" value={customer.preferredName || "Not set"} warning={requiredMissing.preferredName} />
              <Field label="Pronouns" value={displayedPronouns || "Not set"} warning={requiredMissing.pronouns} />
              <Field label="DOB / Age" value={hasValidDob ? formatDateWithAge(dobDate) : "Not set"} warning={requiredMissing.dateOfBirth} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="access" aria-label="section-access" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-access-products">
        <CardHeader><CardTitle>Access Products</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {accessRecords.length === 0 ? <p className="text-muted-foreground">No access products yet.</p> : null}
          {accessRecords.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{entry.notes ?? entry.type}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  entry.status === "active"
                    ? "bg-emerald-100 text-emerald-800"
                    : entry.status === "paused"
                      ? "bg-amber-100 text-amber-900"
                      : entry.status === "cancelled"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-700"
                }`}>
                  {entry.status}
                </span>
              </div>
              <p className="text-muted-foreground">Expiration: {entry.expirationDate ? formatDate(entry.expirationDate) : "N/A"}</p>
              <p className="text-muted-foreground">Punches: {typeof entry.remainingPunches === "number" ? entry.remainingPunches : "N/A"}</p>
              {entry.freezeStartDate || entry.freezeEndDate ? (
                <p className="text-muted-foreground">
                  Freeze: {entry.freezeStartDate ? formatDate(entry.freezeStartDate) : "—"} to {entry.freezeEndDate ? formatDate(entry.freezeEndDate) : "—"}{entry.freezeReason ? ` • ${entry.freezeReason}` : ""}
                </p>
              ) : null}
              <p className="text-muted-foreground">Locations: {entry.locationsAllowed?.join(", ") ?? "All"}</p>
              <p className="text-muted-foreground">Waiver requirement: {accessProducts.find((product) => product.id === entry.productId)?.waiverRequired ? "Required" : "Not required"}</p>
              <p className="text-muted-foreground">Access source: {entry.notes ?? entry.type}</p>
              <p className="text-muted-foreground">
                Eligibility preview: {decision.allowed ? "✓ Can use now" : `✕ ${decision.reasons[0] ?? "Blocked"}`}
              </p>
              {entry.type === "membership" || entry.type === "household-membership" ? (
                <div className="mt-3">
                  <DigitalMembershipCard
                    variant="compact"
                    customer={customer}
                    accessRecord={entry}
                    membershipName={accessProducts.find((product) => product.id === entry.productId)?.name ?? entry.notes ?? "Membership"}
                    organizationName={settings.facilityProfile.facilityName}
                    organizationLogoUrl={settings.branding.logoUrl || undefined}
                    primaryColor={settings.branding.primaryColor}
                    secondaryColor={settings.branding.secondaryColor}
                    {...buildMembershipCardRecord(customer, entry, currentOrgSlug)}
                  />
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Updated: {entry.updatedAt ? formatDateTime(entry.updatedAt) : "—"}{entry.updatedByStaffName ? ` • ${entry.updatedByStaffName}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(entry.type === "membership" || entry.type === "household-membership") ? (
                  <Link href={`/memberships?membershipId=${entry.id}`} className="inline-flex">
                    <Button className="h-9" variant="secondary">Open in Memberships</Button>
                  </Link>
                ) : null}
                {entry.status === "active" ? (
                  <Button
                    className="h-9"
                    variant="secondary"
                    onClick={() =>
                      updateCustomerAccessRecord(entry.id, {
                        status: "frozen",
                        freezeStartDate: new Date().toISOString().slice(0, 10),
                        freezeEndDate: (() => {
                          const end = new Date();
                          end.setDate(end.getDate() + 14);
                          return end.toISOString().slice(0, 10);
                        })(),
                        freezeReason: "Temporary freeze",
                        freezeStaffNotes: "Frozen from customer profile",
                        updatedByStaffId: activeStaff?.id,
                        updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                      })
                    }
                  >
                    Freeze
                  </Button>
                ) : null}
                {entry.status === "frozen" || entry.status === "paused" ? (
                  <Button
                    className="h-9"
                    variant="secondary"
                    onClick={() =>
                      updateCustomerAccessRecord(entry.id, {
                        status: "active",
                        freezeStartDate: undefined,
                        freezeEndDate: undefined,
                        freezeReason: undefined,
                        freezeStaffNotes: undefined,
                        updatedByStaffId: activeStaff?.id,
                        updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                      })
                    }
                  >
                    Reactivate
                  </Button>
                ) : null}
                {entry.status !== "cancelled" ? (
                  <Button
                    className="h-9"
                    variant="secondary"
                    onClick={() => {
                      const base = new Date(entry.expirationDate ?? "2026-05-20T00:00:00Z");
                      base.setDate(base.getDate() + 30);
                      updateCustomerAccessRecord(entry.id, {
                        expirationDate: base.toISOString().slice(0, 10),
                        updatedByStaffId: activeStaff?.id,
                        updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                      });
                    }}
                  >
                    Extend +30d
                  </Button>
                ) : null}
                {entry.status !== "cancelled" ? (
                  <Button
                    className="h-9"
                    variant="destructive"
                    onClick={() =>
                      updateCustomerAccessRecord(entry.id, {
                        status: "cancelled",
                        cancelledAt: new Date().toISOString(),
                        updatedByStaffId: activeStaff?.id,
                        updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                      })
                    }
                  >
                    Cancel
                  </Button>
                ) : null}
                {entry.type === "punch-pass" ? (
                  <>
                    <Button
                      className="h-9"
                      variant="secondary"
                      onClick={() =>
                        updateCustomerAccessRecord(entry.id, {
                          remainingPunches: Math.max(0, (entry.remainingPunches ?? 0) - 1),
                          status: Math.max(0, (entry.remainingPunches ?? 0) - 1) <= 0 ? "expired" : entry.status,
                          updatedByStaffId: activeStaff?.id,
                          updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                        })
                      }
                    >
                      Use 1 Punch
                    </Button>
                    <Button
                      className="h-9"
                      variant="secondary"
                      onClick={() =>
                        updateCustomerAccessRecord(entry.id, {
                          remainingPunches: (entry.remainingPunches ?? 0) + 1,
                          status: entry.status === "expired" ? "active" : entry.status,
                          updatedByStaffId: activeStaff?.id,
                          updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                        })
                      }
                    >
                      Add 1 Punch
                    </Button>
                  </>
                ) : null}
              </div>
              {entry.type === "punch-pass" ? (
                <div className="mt-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  {recentCheckIns
                    .filter((record) => record.customerId === customer.id && record.entryMethod === "multi_visit_pass" && typeof record.punchesUsed === "number")
                    .slice(0, 5)
                    .map((record) => (
                      <p key={record.id}>
                        {formatDate(record.checkInTime)} Visit Used ({record.punchesRemaining ?? 0} remaining)
                      </p>
                    ))}
                  {recentCheckIns.filter((record) => record.customerId === customer.id && record.entryMethod === "multi_visit_pass").length === 0 ? (
                    <p>No punch usage history yet.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card aria-label="detail-membership-timeline">
        <CardHeader><CardTitle>Membership Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {accessRecords.filter((entry) => entry.type === "membership" || entry.type === "household-membership").length === 0 ? (
            <p className="text-muted-foreground">No membership timeline events yet.</p>
          ) : (
            accessRecords
              .filter((entry) => entry.type === "membership" || entry.type === "household-membership")
              .flatMap((entry) => [
                { id: `${entry.id}-purchased`, date: entry.purchaseDate ?? entry.startDate, label: "Purchased", detail: entry.notes ?? "Membership" },
                entry.updatedAt ? { id: `${entry.id}-updated`, date: entry.updatedAt.slice(0, 10), label: "Updated", detail: entry.status } : null,
                entry.freezeStartDate ? { id: `${entry.id}-frozen`, date: entry.freezeStartDate, label: "Frozen", detail: entry.freezeReason ?? "Membership freeze" } : null,
                entry.cancelledAt ? { id: `${entry.id}-cancelled`, date: entry.cancelledAt.slice(0, 10), label: "Cancelled", detail: entry.notes ?? "Membership cancelled" } : null
              ])
              .filter((event): event is { id: string; date: string; label: string; detail: string } => Boolean(event))
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((event) => (
                <div key={event.id} className="rounded-md border p-2">
                  <p className="font-medium">{event.label}</p>
                  <p className="text-muted-foreground">{event.date} • {event.detail}</p>
                </div>
              ))
          )}
        </CardContent>
      </Card>
      </section>

      {customerStaffProfile ? (
        <section id="staff-profile" aria-label="section-staff-profile" className="scroll-mt-40 space-y-4">
          <Card>
            <CardHeader><CardTitle>Staff Profile</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                Login password is used to sign into Cairn. Staff PIN is used for quick workstation switching and manager approval.
              </p>
              <Field label="Role" value={ROLE_LABELS[customerStaffProfile.role]} />
              <Field label="Status" value={customerStaffProfile.status} />
              <Field label="Locations" value={customerStaffProfile.locations.join(", ") || "Not set"} />
              <Field label="Assigned programs" value={customerStaffProfile.assignedPrograms.join(", ") || "None assigned"} />
              <Field
                label="Permissions"
                value={customerStaffProfile.permissions.map((permission) => PERMISSION_LABELS[permission]).join(", ") || "None"}
              />
              <Field label="Last active" value={customerStaffProfile.lastActive ? formatDateTime(customerStaffProfile.lastActive) : "No recent activity"} />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="h-10"
                  onClick={openEditStaffProfile}
                >
                  Edit Staff Profile
                </Button>
                <Button
                  variant="secondary"
                  className="h-10"
                  onClick={() => {
                    const result = resetStaffPin(customerStaffProfile.staffId);
                    setProfileFeedback(result.ok ? `${result.message} New PIN: ${result.pin}` : result.message);
                  }}
                >
                  Reset Staff PIN
                </Button>
                <Button
                  variant="secondary"
                  className="h-10"
                  onClick={() => {
                    const result = resetPasswordPlaceholder(customerStaffProfile.staffId);
                    setProfileFeedback(result.message);
                  }}
                >
                  Reset Password
                </Button>
                <Button
                  variant={customerStaffProfile.status === "active" ? "destructive" : "secondary"}
                  className="h-10"
                  onClick={() => {
                    if (customerStaffProfile.status === "active") {
                      setShowSuspendConfirm(true);
                      return;
                    }
                    const result = activateStaffMember(customerStaffProfile.staffId);
                    if (!result.ok) {
                      setProfileFeedback(result.message);
                      return;
                    }
                    updateStaffProfileForCustomer({
                      customerId: customer.id,
                      role: customerStaffProfile.role,
                      status: "active",
                      staffPin: customerStaffProfile.staffPin,
                      locations: customerStaffProfile.locations,
                      assignedPrograms: customerStaffProfile.assignedPrograms,
                      permissions: customerStaffProfile.permissions,
                      startDate: customerStaffProfile.startDate,
                      certifications: customerStaffProfile.certifications,
                      staffNotes: customerStaffProfile.staffNotes
                    });
                    setProfileFeedback(result.message);
                  }}
                >
                  {customerStaffProfile.status === "active" ? "Suspend Staff" : "Reactivate Staff"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section id="relationships" aria-label="section-relationships" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-household">
        <CardHeader><CardTitle>Relationships</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!household ? (
            <>
              <p className="text-muted-foreground">No household assigned</p>
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  aria-label="Household name"
                  className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                  placeholder="Household name (for example: Rivera Family)"
                  value={newHouseholdName}
                  onChange={(event) => setNewHouseholdName(event.target.value)}
                />
                <Button
                  className="h-11"
                  onClick={() => {
                    const result = createHousehold({
                      householdName: newHouseholdName || `${customer.lastName} Family`,
                      primaryContactCustomerId: customer.id,
                      billingCustomerId: customer.id,
                      locationId: customer.locationId
                    });
                    setProfileFeedback(result.message);
                    if (result.ok) setNewHouseholdName("");
                  }}
                >
                  Create Household
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" className="h-10" onClick={() => setProfileFeedback(usesPersistedCustomer ? "Household assignment is managed on the Households page for Neon-backed customers." : "Search a member below and add to an existing household from their profile.")}>
                  Join Household
                </Button>
                <Button variant="secondary" className="h-10" onClick={() => setProfileFeedback("Use member relationship controls below to mark parent/guardian links.")}>
                  Link Guardian
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border p-3">
                <p className="font-semibold">{household.householdName}</p>
                <p className="text-muted-foreground">Primary contact: {householdPrimaryContact ? `${householdPrimaryContact.firstName} ${householdPrimaryContact.lastName}` : "Unknown"}</p>
                <p className="text-muted-foreground">Billing customer: {householdBillingCustomer ? `${householdBillingCustomer.firstName} ${householdBillingCustomer.lastName}` : "Unknown"}</p>
                <p className="text-muted-foreground">Default address: {household.defaultAddress ?? `${customer.addressLine1 ?? "Not set"}, ${customer.city ?? ""} ${customer.state ?? ""}`.trim()}</p>
                <p className="text-muted-foreground">
                  Default emergency contact: {household.defaultEmergencyContactName ?? customer.emergencyContactName ?? "Not set"}
                  {household.defaultEmergencyContactPhone || customer.emergencyContactPhone ? ` • ${household.defaultEmergencyContactPhone ?? customer.emergencyContactPhone}` : ""}
                </p>
                {household.notes ? <p className="text-muted-foreground">Shared notes: {household.notes}</p> : null}
                <p className="text-muted-foreground">
                  Default payment: {householdDefaultPayment
                    ? `${householdDefaultPayment.cardBrand} ending in ${householdDefaultPayment.last4}`
                    : "No household payment method"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={buildDetailHref({ destination: "household", entityId: household.id, currentPathname: `/customers/${customer.id}`, sourceOverride: "customers" })}>
                    <Button variant="secondary" className="h-9">Open Household Dashboard</Button>
                  </Link>
                  <Button variant="secondary" className="h-9" onClick={() => {
                    setSelectedHouseholdCheckInIds(householdRows.map((member) => member.customerId));
                    setShowHouseholdDetail(true);
                  }}>
                    View Household
                  </Button>
                  <Button
                    className="h-9"
                    onClick={() => {
                      const result = familyCheckIn({
                        actingCustomerId: customer.id,
                        memberIds: householdRows.map((row) => row.customerId),
                        staffUserId: activeStaff?.id ?? "stf_002",
                        staffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Maya Lopez"
                      });
                      setProfileFeedback(result.message);
                    }}
                  >
                    Check In Household
                  </Button>
                  <Link href={`/pos?household=${household.id}`}>
                    <Button variant="secondary" className="h-9">Sell to Household</Button>
                  </Link>
                  <a href="#registrations">
                    <Button variant="secondary" className="h-9">Register Household Member</Button>
                  </a>
                  <Button variant="secondary" className="h-9" onClick={() => setProfileFeedback("Waiver update available in Waiver section below.")}>
                    Mark Waiver Signed
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {householdRows.map((member) => (
                  <div key={member.customerId} className="space-y-3 rounded-lg border p-3" aria-label={`household-member-${member.customerId}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {member.customer ? `${member.customer.firstName} ${member.customer.lastName}` : "Unknown customer"}
                        </p>
                        <p className="text-muted-foreground">
                          {member.memberType === "adult" ? "Adult" : "Child"} · {formatHouseholdRelationship(member.relationship)} · Priority {member.emergencyContactPriority ?? "—"}
                          {household?.primaryContactCustomerId === member.customerId ? " · Primary Adult" : ""}
                        </p>
                        <p className="text-muted-foreground">
                          {member.customer?.phone ?? "No phone"} • {member.customer?.email ?? "No email"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {member.canCheckInOthers ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Check-in others</span> : null}
                          {member.canPurchaseForOthers ? <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-800">Purchases</span> : null}
                          {member.canSignWaivers ? <span className="rounded-full bg-violet-100 px-2 py-1 text-xs text-violet-800">Waivers</span> : null}
                          {!member.canCheckInOthers && !member.canPurchaseForOthers && !member.canSignWaivers ? (
                            <span className="text-xs text-muted-foreground">No household permissions</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="h-9"
                          onClick={() => beginEditHouseholdMember(member)}
                        >
                          Edit
                        </Button>
                        {member.customerId !== customer.id ? (
                          <Button
                            variant="ghost"
                            className="h-9 text-destructive hover:text-destructive"
                            onClick={() => {
                              const result = removeHouseholdMember(household.id, member.customerId);
                              setProfileFeedback(result.message);
                              if (editingMemberId === member.customerId) cancelEditHouseholdMember();
                            }}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {editingMemberId === member.customerId && draftMember ? (
                      <div className="space-y-3 rounded-md border border-border/70 bg-secondary/30 p-3">
                        <div className="grid gap-2 md:grid-cols-3">
                          <label className="space-y-1 text-xs">
                            <span className="text-muted-foreground">Member type</span>
                            <select
                              aria-label={`Member type for ${member.customer?.firstName ?? member.customerId}`}
                              className="h-10 w-full rounded-md border border-input bg-white px-2 text-sm"
                              value={draftMember.memberType}
                              onChange={(event) => setDraftMember((prev) => prev ? { ...prev, memberType: event.target.value as "adult" | "child" } : prev)}
                            >
                              <option value="adult">Adult</option>
                              <option value="child">Child</option>
                            </select>
                          </label>
                          <label className="space-y-1 text-xs">
                            <span className="text-muted-foreground">Relationship</span>
                            <select
                              aria-label={`Relationship for ${member.customer?.firstName ?? member.customerId}`}
                              className="h-10 w-full rounded-md border border-input bg-white px-2 text-sm"
                              value={draftMember.relationship}
                              onChange={(event) => setDraftMember((prev) => prev ? { ...prev, relationship: event.target.value } : prev)}
                            >
                              <option value="parent_guardian">Parent/guardian</option>
                              <option value="child">Child</option>
                              <option value="spouse_partner">Spouse/partner</option>
                              <option value="dependent">Dependent</option>
                              <option value="emergency_contact_only">Emergency contact only</option>
                              <option value="other">Other</option>
                            </select>
                          </label>
                          <label className="space-y-1 text-xs">
                            <span className="text-muted-foreground">Emergency priority</span>
                            <input
                              aria-label={`Emergency priority for ${member.customer?.firstName ?? member.customerId}`}
                              type="number"
                              min={1}
                              className="h-10 w-full rounded-md border border-input bg-white px-2 text-sm"
                              value={draftMember.emergencyContactPriority ?? ""}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setDraftMember((prev) => (prev ? { ...prev, emergencyContactPriority: Number.isFinite(value) ? value : undefined } : prev));
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex w-full flex-wrap gap-3 text-xs text-muted-foreground">
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={draftMember.canCheckInOthers}
                              onChange={(event) => setDraftMember((prev) => prev ? { ...prev, canCheckInOthers: event.target.checked } : prev)}
                            />
                            Can check in others
                          </label>
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={draftMember.canPurchaseForOthers}
                              onChange={(event) => setDraftMember((prev) => prev ? { ...prev, canPurchaseForOthers: event.target.checked } : prev)}
                            />
                            Can purchase for others
                          </label>
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={draftMember.canSignWaivers}
                              onChange={(event) => setDraftMember((prev) => prev ? { ...prev, canSignWaivers: event.target.checked } : prev)}
                            />
                            Can sign waivers
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="h-9"
                            onClick={() => {
                              const result = updateHouseholdMember(household.id, member.customerId, {
                                memberType: draftMember.memberType,
                                relationship: draftMember.relationship as typeof member.relationship,
                                emergencyContactPriority: draftMember.emergencyContactPriority,
                                canCheckInOthers: draftMember.canCheckInOthers,
                                canPurchaseForOthers: draftMember.canPurchaseForOthers,
                                canSignWaivers: draftMember.canSignWaivers
                              });
                              setProfileFeedback(result.message);
                              if (result.ok) cancelEditHouseholdMember();
                            }}
                          >
                            Save
                          </Button>
                          <Button variant="secondary" className="h-9" onClick={cancelEditHouseholdMember}>
                            Cancel
                          </Button>
                          {member.customerId !== customer.id ? (
                            <Button
                              variant="destructive"
                              className="h-9"
                              onClick={() => {
                                const result = removeHouseholdMember(household.id, member.customerId);
                                setProfileFeedback(result.message);
                                cancelEditHouseholdMember();
                              }}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="font-medium">Add Household Member</p>
                <CustomerSearchCombobox
                  label="Search household members"
                  placeholder="Search by name, member ID, phone, or email"
                  query={householdMemberQuery}
                  onQueryChange={setHouseholdMemberQuery}
                  customers={householdCandidates}
                  onSelect={(selectedId) => {
                    const result = addHouseholdMember({
                      householdId: household.id,
                      customerId: selectedId,
                      memberType: "child",
                      role: "dependent",
                      relationship: "dependent",
                      canCheckInOthers: false,
                      canPurchaseForOthers: false,
                      canSignWaivers: false,
                      emergencyContactPriority: householdRows.length + 1
                    });
                    setProfileFeedback(result.message);
                    if (result.ok) setHouseholdMemberQuery("");
                  }}
                  emptyMessage="No customers found"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </section>

      <section id="payment" aria-label="section-payment" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-payment-methods">
        <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(customer.paymentMethods ?? []).length === 0 ? <p className="text-muted-foreground">No saved payment methods on file.</p> : null}
          {(customer.paymentMethods ?? []).map((method) => (
            <div key={method.paymentMethodId} className="rounded-lg border p-3">
              <p className="font-medium">{method.cardBrand} ending in {method.last4}</p>
              <p className="text-muted-foreground">Expires {String(method.expirationMonth).padStart(2, "0")}/{method.expirationYear}</p>
              <p className="text-muted-foreground">{method.isDefault ? "Default" : "Secondary"}</p>
            </div>
          ))}
          <Button
            variant="secondary"
            className="h-10"
            onClick={() => setProfileFeedback("Saved payment methods will be handled through a secure payment processor.")}
          >
            Add Payment Method
          </Button>
        </CardContent>
      </Card>
      </section>
      {household ? (
        <ModalShell
          open={showHouseholdDetail}
          ariaLabel="Household detail"
          title={household.householdName}
          description="Household summary, memberships, registrations, and quick actions."
          onClose={() => setShowHouseholdDetail(false)}
          maxWidthClassName="max-w-5xl"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowHouseholdDetail(false)}>Close</Button>
              <Button
                onClick={() => {
                  const result = familyCheckIn({
                    actingCustomerId: customer.id,
                    memberIds: selectedHouseholdCheckInIds,
                    staffUserId: activeStaff?.id ?? "stf_002",
                    staffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Maya Lopez"
                  });
                  setProfileFeedback(result.message);
                  if (result.ok) setShowHouseholdDetail(false);
                }}
              >
                Check In Selected
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Primary adult" value={householdPrimaryContact ? `${householdPrimaryContact.firstName} ${householdPrimaryContact.lastName}` : "Not set"} />
              <Field label="Billing contact" value={householdBillingCustomer ? `${householdBillingCustomer.firstName} ${householdBillingCustomer.lastName}` : "Not set"} />
              <Field label="Active access" value={`${householdActiveAccess}/${householdRows.length}`} />
              <Field label="Waiver issues" value={householdWaiverIssues ? `${householdWaiverIssues} member(s)` : "None"} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-3">
                <p className="font-medium">Members</p>
                {householdRows.map((member) => {
                  const person = member.customer;
                  if (!person) return null;
                  const memberWaiver = person.waiverId ? waivers.find((entry) => entry.id === person.waiverId) : undefined;
                  return (
                    <label key={member.customerId} className="flex items-start justify-between gap-2 rounded-md border p-2">
                      <span>
                        <span className="font-medium">{person.firstName} {person.lastName}</span>
                        <span className="block text-muted-foreground">{member.memberType === "adult" ? "Adult" : "Child"} · {formatHouseholdRelationship(member.relationship)}</span>
                        <span className="block text-muted-foreground">
                          {person.checkInStatus === "in" ? "Checked in" : "Checked out"} · {memberWaiver?.status === "valid" ? "Waiver valid" : "Waiver missing"}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={selectedHouseholdCheckInIds.includes(member.customerId)}
                        onChange={(event) => {
                          setSelectedHouseholdCheckInIds((prev) =>
                            event.target.checked ? [...new Set([...prev, member.customerId])] : prev.filter((id) => id !== member.customerId)
                          );
                        }}
                        aria-label={`Select ${person.firstName} ${person.lastName} for household check-in`}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="font-medium">Household programs</p>
                {householdUpcomingPrograms.length === 0 ? <p className="text-muted-foreground">No upcoming registrations.</p> : null}
                {householdUpcomingPrograms.map((entry) => (
                  <div key={entry.registration.id} className="rounded-md border p-2">
                    <p className="font-medium">{entry.customer?.firstName} {entry.customer?.lastName}</p>
                    <p className="text-muted-foreground">{entry.program?.title ?? entry.session?.title ?? "Session"}</p>
                    <p className="text-muted-foreground">{entry.session?.startsAt ? formatDateTime(entry.session.startsAt) : "Date pending"} · {entry.registration.status}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="font-medium">Household purchases</p>
              {householdPurchases.length === 0 ? <p className="text-muted-foreground">No household purchases yet.</p> : null}
              {householdPurchases.map((entry) => (
                <div key={entry.id} className="rounded-md border p-2">
                  <p className="font-medium">Receipt #{entry.receiptNumber}</p>
                  <p className="text-muted-foreground">
                    Purchaser: {customers.find((customerEntry) => customerEntry.id === entry.customerId)?.firstName ?? "Unknown"} · {formatCurrency(entry.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ModalShell>
      ) : null}
      {customerStaffProfile ? (
        <ModalShell
          open={showEditStaffProfile}
          ariaLabel="Edit staff profile"
          title="Edit Staff Profile"
          description="Update role, status, and location access for this staff profile."
          onClose={() => setShowEditStaffProfile(false)}
          maxWidthClassName="max-w-2xl"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditStaffProfile(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!customerStaffProfile || !staffProfileDraft) return;
                  const staffUpdate = updateStaffMember({
                    id: customerStaffProfile.staffId,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    role: staffProfileDraft.role,
                    email: customer.email,
                    phone: customer.phone,
                    pronouns: customer.pronouns,
                    locationIds: staffProfileDraft.locations,
                    status: staffProfileDraft.status,
                    startDate: staffProfileDraft.startDate || undefined,
                    notes: staffProfileDraft.staffNotes || undefined
                  });
                  if (!staffUpdate.ok) {
                    setProfileFeedback(staffUpdate.message);
                    return;
                  }
                  const profileResult = updateStaffProfileForCustomer({
                    customerId: customer.id,
                    role: staffProfileDraft.role,
                    status: staffProfileDraft.status,
                    staffPin: customerStaffProfile.staffPin,
                    locations: staffProfileDraft.locations,
                    assignedPrograms: customerStaffProfile.assignedPrograms,
                    permissions: customerStaffProfile.permissions,
                    startDate: staffProfileDraft.startDate || undefined,
                    certifications: customerStaffProfile.certifications,
                    staffNotes: staffProfileDraft.staffNotes || undefined
                  });
                  setProfileFeedback(profileResult.ok ? "Staff profile updated." : profileResult.message);
                  if (profileResult.ok) setShowEditStaffProfile(false);
                }}
              >
                Save Staff Profile
              </Button>
            </div>
          }
        >
          {staffProfileDraft ? (
            <div className="space-y-4">
              <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                Login password is used to sign into Cairn. Staff PIN is used for quick workstation switching and manager approval.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Role</span>
                <select
                  className="h-11 w-full rounded-md border border-input bg-white px-3"
                  value={staffProfileDraft.role}
                  onChange={(event) => setStaffProfileDraft((prev) => (prev ? { ...prev, role: event.target.value as StaffRole } : prev))}
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="front_desk">Front Desk</option>
                  <option value="instructor">Instructor</option>
                  <option value="volunteer_limited">Volunteer</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Status</span>
                <select
                  className="h-11 w-full rounded-md border border-input bg-white px-3"
                  value={staffProfileDraft.status}
                  onChange={(event) =>
                    setStaffProfileDraft((prev) =>
                      prev ? { ...prev, status: event.target.value as "active" | "inactive" | "on_leave" } : prev
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Suspended</option>
                  <option value="on_leave">On leave</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Start date</span>
                <input
                  type="date"
                  className="h-11 w-full rounded-md border border-input bg-white px-3"
                  value={staffProfileDraft.startDate}
                  onChange={(event) => setStaffProfileDraft((prev) => (prev ? { ...prev, startDate: event.target.value } : prev))}
                />
              </label>
              <div className="text-sm">
                <span className="mb-1 block text-muted-foreground">Locations</span>
                <div className="space-y-2 rounded-md border border-input bg-white p-3">
                  {["loc_001", "loc_002"].map((locationId) => (
                    <label key={locationId} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={staffProfileDraft.locations.includes(locationId)}
                        onChange={(event) => {
                          setStaffProfileDraft((prev) => {
                            if (!prev) return prev;
                            const next = event.target.checked
                              ? [...prev.locations, locationId]
                              : prev.locations.filter((entry) => entry !== locationId);
                            return { ...prev, locations: Array.from(new Set(next)) };
                          });
                        }}
                      />
                      <span>{locationId === "loc_001" ? "Summit Downtown" : "Summit Uptown"}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-muted-foreground">Staff notes</span>
                <textarea
                  className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                  value={staffProfileDraft.staffNotes}
                  onChange={(event) => setStaffProfileDraft((prev) => (prev ? { ...prev, staffNotes: event.target.value } : prev))}
                />
              </label>
              <div className="md:col-span-2">
                <p className="mb-2 text-sm text-muted-foreground">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {customerStaffProfile.permissions.map((permission) => (
                    <Badge key={permission} tone="muted">{PERMISSION_LABELS[permission]}</Badge>
                  ))}
                </div>
              </div>
              </div>
            </div>
          ) : null}
        </ModalShell>
      ) : null}
      {customerStaffProfile ? (
        <ModalShell
          open={showSuspendConfirm}
          ariaLabel="Suspend staff confirmation"
          title="Suspend staff member?"
          description={`${customer.firstName} ${customer.lastName} will lose access to staff tools and permissions. Their customer profile and visit history will remain available.`}
          onClose={() => setShowSuspendConfirm(false)}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowSuspendConfirm(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (customerStaffProfile.role === "owner") {
                    setProfileFeedback(`${customer.firstName} ${customer.lastName} is an Owner and cannot be suspended from this screen.`);
                    setShowSuspendConfirm(false);
                    return;
                  }
                  const result = suspendStaffMember(customerStaffProfile.staffId);
                  if (!result.ok) {
                    setProfileFeedback(result.message);
                    setShowSuspendConfirm(false);
                    return;
                  }
                  updateStaffProfileForCustomer({
                    customerId: customer.id,
                    role: customerStaffProfile.role,
                    status: "inactive",
                    staffPin: customerStaffProfile.staffPin,
                    locations: customerStaffProfile.locations,
                    assignedPrograms: customerStaffProfile.assignedPrograms,
                    permissions: customerStaffProfile.permissions,
                    startDate: customerStaffProfile.startDate,
                    certifications: customerStaffProfile.certifications,
                    staffNotes: customerStaffProfile.staffNotes
                  });
                  setProfileFeedback(result.message);
                  setShowSuspendConfirm(false);
                }}
              >
                Suspend Staff
              </Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            This action can be reversed later by reactivating staff.
          </p>
        </ModalShell>
      ) : null}
      {profileFeedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{profileFeedback}</p> : null}

      <section id="visits" aria-label="section-visits" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-visit-history">
        <CardHeader><CardTitle>Visit History</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ActivityTimeline visits={recentCheckIns} />
          {recentCheckIns.length > 3 ? <p className="text-xs text-muted-foreground">Showing recent visits only.</p> : null}
        </CardContent>
      </Card>
      </section>

      <section id="purchases" aria-label="section-purchases" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-purchases">
        <CardHeader><CardTitle>Purchase History</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {purchaseHistoryEntries.length === 0 ? (
            <p className="text-muted-foreground">No purchases recorded yet.</p>
          ) : (
            purchaseHistoryEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3">
                <p className="font-medium">{formatDate(entry.completedAt)}</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {(entry.items ?? []).map((item, index) => (
                    <li key={`${entry.id}-${item.productId}-${index}`}>
                      {(item.productName ?? "Unknown item")} x{item.quantity ?? 1} — {formatCurrency(item.unitPrice)} ({formatCurrency(item.lineTotal)})
                    </li>
                  ))}
                  {(entry.items ?? []).length === 0 ? <li>Unknown item</li> : null}
                </ul>
                <p>Total: {formatCurrency(entry.total)}</p>
                <p className="text-muted-foreground">Sold by {entry.soldByStaffName ?? "Staff not recorded"}</p>
                <p className="text-muted-foreground">Receipt #{entry.receiptNumber}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {"transactionType" in entry ? (
                    <Link href={`/pos/receipts/${entry.id}`} className="inline-flex h-8 items-center rounded-md border px-3 text-xs">
                      View Receipt
                    </Link>
                  ) : null}
                  <Button variant="secondary" className="h-8 text-xs" onClick={() => window.print()}>
                    Print Receipt
                  </Button>
                  <Button variant="secondary" className="h-8 text-xs">
                    Email Receipt (Soon)
                  </Button>
                  {"transactionType" in entry && hasPermission("refundTransaction") ? (
                    <Button variant="destructiveSubtle" className="h-8 text-xs">
                      Refund (Soon)
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {purchaseHistoryEntries.length > 3 ? <p className="text-xs text-muted-foreground">Showing recent purchases only.</p> : null}
        </CardContent>
      </Card>
      </section>

      <section id="documents" aria-label="section-documents" className="scroll-mt-40 space-y-4">
        <Card aria-label="detail-documents">
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-9"
                onClick={() => {
                  const now = new Date().toISOString();
                  setDocuments((prev) => [
                    {
                      id: `doc_${Math.random().toString(36).slice(2, 9)}`,
                      customerId: customer.id,
                      name: "Uploaded Document",
                      type: "general_document",
                      uploadedBy: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff",
                      uploadedAt: now,
                      status: "active"
                    },
                    ...prev
                  ]);
                }}
              >
                Upload Document
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Document Name</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">Uploaded By</th>
                    <th className="px-2 py-2 font-medium">Upload Date</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-b-0">
                      <td className="px-2 py-2">{entry.name}</td>
                      <td className="px-2 py-2">{titleCase(entry.type)}</td>
                      <td className="px-2 py-2">{entry.uploadedBy}</td>
                      <td className="px-2 py-2">{formatDateTime(entry.uploadedAt)}</td>
                      <td className="px-2 py-2">{titleCase(entry.status)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button className="h-8" variant="secondary" onClick={() => setProfileFeedback(`Viewing ${entry.name}`)}>View</Button>
                          <Button className="h-8" variant="secondary" onClick={() => setProfileFeedback(`${entry.name} download queued for pilot review.`)}>Download</Button>
                          <Button
                            className="h-8"
                            variant="secondary"
                            onClick={() => setDocuments((prev) => prev.map((doc) => doc.id === entry.id ? { ...doc, status: doc.status === "archived" ? "active" : "archived" } : doc))}
                          >
                            {entry.status === "archived" ? "Restore" : "Archive"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="communications" aria-label="section-communications" className="scroll-mt-40 space-y-4">
        <Card aria-label="detail-communications">
          <CardHeader><CardTitle>Communications</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Communication filter"
                className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                value={communicationFilter}
                onChange={(event) => setCommunicationFilter(event.target.value as typeof communicationFilter)}
              >
                <option value="all">All</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="in_app_notification">In-app</option>
                <option value="system_notification">System</option>
                <option value="internal_staff_note">Staff Notes</option>
              </select>
              <Button
                className="h-9"
                variant="secondary"
                onClick={() => {
                  createCommunication({
                    channel: "internal_staff_note",
                    status: "sent",
                    recipientType: "customer",
                    recipientLabel: `${customer.firstName} ${customer.lastName}`,
                    customerId: customer.id,
                    subject: "Manual communication log",
                    message: "Communication logged manually.",
                    createdByStaffId: activeStaff?.id,
                    createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff"
                  });
                }}
              >
                Log Communication
              </Button>
            </div>
            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-5">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Email Opt-In</span>
                <input
                  aria-label="Email communications"
                  type="checkbox"
                  checked={customer.communicationPreferences?.email ?? true}
                  onChange={(event) => updateCustomerCommunicationPreferences(customer.id, { email: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>SMS Opt-In</span>
                <input
                  aria-label="SMS communications"
                  type="checkbox"
                  checked={customer.communicationPreferences?.sms ?? true}
                  onChange={(event) => updateCustomerCommunicationPreferences(customer.id, { sms: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Marketing</span>
                <input
                  type="checkbox"
                  checked={customer.communicationPreferences?.marketing ?? false}
                  onChange={(event) => updateCustomerCommunicationPreferences(customer.id, { marketing: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Transactional</span>
                <input
                  aria-label="Transactional communications"
                  type="checkbox"
                  checked={customer.communicationPreferences?.transactional ?? true}
                  onChange={(event) => updateCustomerCommunicationPreferences(customer.id, { transactional: event.target.checked })}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Preferred Method</span>
                <select
                  aria-label="Preferred contact method"
                  className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={customer.communicationPreferences?.preferredContactMethod ?? "email"}
                  onChange={(event) =>
                    updateCustomerCommunicationPreferences(customer.id, {
                      preferredContactMethod: event.target.value as "email" | "sms" | "in_app_notification"
                    })
                  }
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="in_app_notification">In-app</option>
                </select>
              </label>
            </div>
            <div className="space-y-2">
              {filteredCommunications.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <p className="font-medium">{entry.subject}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(entry.sentAt ?? entry.scheduledFor ?? entry.createdAt)} • {titleCase(entry.channel)} • {titleCase(entry.status)} • {entry.createdByStaffName ?? "System"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button className="h-8" variant="secondary" onClick={() => setProfileFeedback(entry.message)}>View Message</Button>
                    <Button className="h-8" variant="secondary" onClick={() => setProfileFeedback("Message queued for resend.")}>Resend</Button>
                  </div>
                </div>
              ))}
              {filteredCommunications.length === 0 ? <p className="text-muted-foreground">No communications found.</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="registrations" aria-label="section-registrations" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-registrations">
        <CardHeader><CardTitle>Registrations</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Upcoming Sessions</p>
            {upcomingSessions.length === 0 ? <p className="text-muted-foreground">No upcoming sessions.</p> : null}
            {upcomingSessions.slice(0, 4).map((entry) => (
              <p key={entry.registration.id} className="text-muted-foreground">
                {entry.session?.title ?? entry.program?.title ?? "Session"} • {formatDateTime(entry.session?.startsAt)} • {entry.registration.status}
              </p>
            ))}
          </div>
          <div>
            <p className="font-medium">Past Sessions</p>
            {pastSessions.length === 0 ? <p className="text-muted-foreground">No past sessions.</p> : null}
            {pastSessions.slice(0, 4).map((entry) => (
              <p key={entry.registration.id} className="text-muted-foreground">
                {entry.session?.title ?? entry.program?.title ?? "Session"} • {formatDateTime(entry.session?.startsAt)} • {(entry.session?.status ?? entry.registration.status)}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
      </section>

      <section id="waiver" aria-label="section-waiver" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-waiver-history">
        <CardHeader><CardTitle>Waivers</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-md border bg-secondary/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current status</p>
            <p className="font-medium">
              {generalWaiverStatus === "valid"
                ? "Valid"
                : generalWaiverStatus === "expiring_soon"
                  ? "Expires Soon"
                  : generalWaiverStatus === "outdated_version"
                    ? "Outdated Version"
                    : generalWaiverStatus === "expired"
                      ? "Expired"
                    : "Missing"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Updated by: {waiver?.updatedByStaffName ?? "Staff not recorded"}</p>
          </div>
          {signedWaiverRecords.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Waiver</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Signed</th>
                    <th className="px-2 py-2 font-medium">Expires</th>
                    <th className="px-2 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {signedWaiverRecords.map((record) => (
                    <tr key={record.id} className="border-b last:border-b-0">
                      <td className="px-2 py-2">{record.templateName}</td>
                      <td className="px-2 py-2">{titleCase(record.status)}</td>
                      <td className="px-2 py-2">{formatDate(record.signedAt)}</td>
                      <td className="px-2 py-2">{record.expiresAt ? formatDate(record.expiresAt) : "Never"}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button className="h-8" variant="secondary" onClick={() => setActiveSignedWaiverId(record.id)}>View Signed Waiver</Button>
                          <Button className="h-8" variant="secondary" onClick={() => setProfileFeedback("Waiver copy queued for printing.")}>Print</Button>
                          <Button className="h-8" variant="secondary" onClick={() => setProfileFeedback("Waiver copy queued for email.")}>Email Copy</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">No waiver history yet.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-9"
              variant="outline"
              onClick={() => {
                if (!activeStaff) return;
                const result = signWaiverForCustomer({
                  customerId: customer.id,
                  templateId: "wtpl_general",
                  typedName: `${customer.firstName} ${customer.lastName}`,
                  signedByName: `${customer.firstName} ${customer.lastName}`,
                  signedByCustomerId: customer.id,
                  signedByRelationship: "self",
                  signedByStaffId: activeStaff.id,
                  updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                });
                setProfileFeedback(result.message);
              }}
            >
              Re-sign
            </Button>
            <Button
              className="h-9"
              variant="outline"
              onClick={() => {
                if (!activeStaff) return;
                updateCustomerWaiver(customer.id, {
                  status: "valid",
                  signedAt: `${new Date().toISOString()}`,
                  expiresAt: "2027-05-20",
                  signedByStaffId: activeStaff.id,
                  updatedByStaffId: activeStaff.id,
                  updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                });
              }}
            >
              Mark Waiver Signed
            </Button>
            <Button
              className="h-9"
              variant="outline"
              onClick={() => {
                if (!activeStaff) return;
                updateCustomerWaiver(customer.id, {
                  status: "expired",
                  updatedByStaffId: activeStaff.id,
                  updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                });
              }}
            >
              Mark Waiver Expired
            </Button>
            <Button
              className="h-9"
              variant="outline"
              onClick={() => {
                if (!activeStaff) return;
                updateCustomerWaiver(customer.id, {
                  status: "missing",
                  signedAt: null,
                  expiresAt: null,
                  signedByStaffId: null,
                  updatedByStaffId: activeStaff.id,
                  updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                });
              }}
            >
              Clear Waiver
            </Button>
          </div>
        </CardContent>
      </Card>
      {activeSignedWaiver ? (
        <ModalShell
          open
          ariaLabel="Signed waiver detail"
          onClose={() => setActiveSignedWaiverId(null)}
          title={`${activeSignedWaiver.templateName} v${activeSignedWaiver.templateVersion}`}
          description="Read-only signed waiver record."
          footer={
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setActiveSignedWaiverId(null)}>Close</Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="Signed by" value={activeSignedWaiver.signedByName} />
              <Field label="Relationship" value={titleCase(activeSignedWaiver.signedByRelationship ?? "self")} />
              <Field label="Signed for" value={`${customer.firstName} ${customer.lastName}`} />
              <Field label="Signed" value={formatDateTime(activeSignedWaiver.signedAt)} />
              <Field label="Expires" value={activeSignedWaiver.expiresAt ? formatDate(activeSignedWaiver.expiresAt) : "Never"} />
              <Field label="Status" value={titleCase(activeSignedWaiver.status)} />
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Waiver content snapshot</p>
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border bg-white p-3">
                {activeSignedWaiver.contentSnapshot.map((block) => (
                  <p key={block.id} className={block.type === "heading" ? "font-semibold" : "text-muted-foreground"}>
                    {block.content || block.label}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Acknowledgement checkboxes</p>
              <ul className="space-y-1 rounded-md border bg-white p-3">
                {activeSignedWaiver.acknowledgementChecks.map((entry, index) => (
                  <li key={`${entry.label}-${index}`} className="text-muted-foreground">[{entry.accepted ? "x" : " "}] {entry.label}</li>
                ))}
              </ul>
            </div>
            <Field label="Typed signature" value={activeSignedWaiver.typedSignature} />
            <Field label="Signature timestamp" value={formatDateTime(activeSignedWaiver.createdAt)} />
          </div>
        </ModalShell>
      ) : null}
      </section>

      <section id="notes" aria-label="section-notes" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-notes">
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{customer.notes ?? "No internal notes yet."}</p></CardContent>
      </Card>
      </section>

      <section id="timeline" aria-label="section-timeline" className="scroll-mt-40 space-y-4">
        <Card aria-label="detail-timeline">
          <CardHeader><CardTitle>Customer Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["profile", "Profile"],
                ["access", "Access"],
                ["waivers", "Waivers"],
                ["registrations", "Registrations"],
                ["visits", "Visits"],
                ["purchases", "Purchases"],
                ["communications", "Communications"],
                ["staff_actions", "Staff Actions"]
              ].map(([value, label]) => (
                <Button
                  key={value}
                  className="h-8"
                  variant={timelineFilter === value ? "default" : "secondary"}
                  onClick={() => setTimelineFilter(value as typeof timelineFilter)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {filteredTimelineEvents.length === 0 ? <p className="text-muted-foreground">No activity recorded yet.</p> : null}
            {filteredTimelineEvents.slice(0, 20).map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3">
                <p className="font-medium">{entry.title}</p>
                <p className="text-muted-foreground">{entry.detail}</p>
                <p className="text-muted-foreground">{formatDateTime(entry.occurredAt)}</p>
                <p className="text-muted-foreground">Staff: {entry.staff}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\\b\\w/g, (char) => char.toUpperCase());
}

function Field({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`break-words text-sm font-medium leading-5 ${warning ? "text-amber-700" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function HeaderField({
  label,
  value,
  warning,
  className,
  wrapAnywhere
}: {
  label: string;
  value: string;
  warning?: boolean;
  className?: string;
  wrapAnywhere?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-md bg-secondary/35 px-3 py-2 ${className ?? ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`break-words text-sm font-medium leading-5 ${warning ? "text-amber-700" : "text-foreground"} ${wrapAnywhere ? "[overflow-wrap:anywhere]" : ""}`}>{value}</p>
    </div>
  );
}

function formatHouseholdRelationship(value: string) {
  if (value === "parent_guardian") return "Parent/guardian";
  if (value === "spouse_partner") return "Spouse/partner";
  if (value === "emergency_contact_only") return "Emergency contact only";
  if (value === "child") return "Child";
  if (value === "dependent") return "Dependent";
  if (value === "guardian") return "Parent/guardian";
  return value.replaceAll("_", " ");
}
