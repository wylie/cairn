"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CustomerBadges } from "@/components/customers/customer-badges";
import { ActivityTimeline } from "@/components/customers/activity-timeline";
import { CustomerDetailActions } from "@/components/customers/customer-detail-actions";
import { CustomerSummaryCard } from "@/components/customers/customer-summary-card";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModalShell } from "@/components/ui/modal-shell";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { filterCustomers } from "@/lib/data/customer-search";
import { formatCurrency } from "@/lib/transactions";
import { ROLE_LABELS } from "@/lib/staff/capabilities";
import { PERMISSION_LABELS } from "@/lib/staff/permissions";
import type { StaffRole } from "@/types/domain";

export function CustomerDetailView({ customerId }: { customerId: string }) {
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
    households,
    householdMembers,
    createHousehold,
    addHouseholdMember,
    removeHouseholdMember,
    updateHouseholdMember,
    familyCheckIn,
    updateStaffProfileForCustomer
  } = useCustomerState();
  const {
    activeStaff,
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
  const customer = customers.find((entry) => entry.id === customerId);

  if (!customer) {
    return <p className="text-sm text-muted-foreground">Customer not found.</p>;
  }

  const membership = customer.membershipId ? memberships.find((entry) => entry.id === customer.membershipId) : undefined;
  const waiver = customer.waiverId ? waivers.find((entry) => entry.id === customer.waiverId) : undefined;
  const pass = customer.punchPassId ? punchPasses.find((entry) => entry.id === customer.punchPassId) : undefined;
  const recentCheckIns = checkInRecords
    .filter((entry) => entry.customerId === customer.id)
    .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))
    .slice(0, 6);
  const recentPurchases = transactions
    .filter((entry) => entry.customerId === customer.id)
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
    .filter((registration) => registration.status === "registered" || registration.status === "waitlisted")
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
    .filter((transaction) =>
      transaction.customerId
        ? householdRows.some((row) => row.customerId === transaction.customerId)
        : false
    )
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 6);
  const alerts: Array<{ id: string; tone: "warning" | "danger" | "success"; message: string }> = [];
  if (!waiver || waiver.status !== "valid") alerts.push({ id: "waiver", tone: "danger", message: waiver?.status === "expired" ? "Waiver expired" : "Waiver missing" });
  if (membership && membership.status === "expired") alerts.push({ id: "membership", tone: "danger", message: "Membership expired" });
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
      staff: entry.soldByStaffName ?? "Staff not recorded"
    })),
    ...(waiver
      ? [
          {
            id: `waiver-${waiver.id}`,
            occurredAt: waiver.signedAt ?? waiver.expiresAt ?? "2026-05-20",
            title: "Waiver Update",
            detail: `Status: ${waiver.status}`,
            staff: waiver.updatedByStaffName ?? "Staff not recorded"
          }
        ]
      : []),
    ...customerSessionHistory.slice(0, 4).map((entry) => ({
      id: `registration-${entry.registration.id}`,
      occurredAt: entry.session?.startsAt ?? "2026-05-20",
      title: "Session Registration",
      detail: `${entry.session?.title ?? entry.program?.title ?? "Session"} • ${entry.registration.status}`,
      staff: "Staff not recorded"
    })),
    ...accessRecords.slice(0, 4).map((entry) => ({
      id: `access-${entry.id}`,
      occurredAt: entry.startDate ?? "2026-05-20",
      title: "Access Change",
      detail: `${entry.notes ?? entry.type} • ${entry.status}`,
      staff: entry.grantedByStaffName ?? "Staff not recorded"
    })),
    ...(customer.updatedAt
      ? [
          {
            id: `profile-update-${customer.id}`,
            occurredAt: customer.updatedAt,
            title: "Profile Update",
            detail: "Customer profile details updated",
            staff: customer.updatedByStaffName ?? "Staff not recorded"
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
        staff: entry.checkedInByStaffName ?? "Staff not recorded"
      }))
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

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
    if (!showHouseholdDetail) return;
    if (selectedHouseholdCheckInIds.length > 0) return;
    setSelectedHouseholdCheckInIds(householdRows.map((member) => member.customerId));
  }, [showHouseholdDetail, selectedHouseholdCheckInIds.length, householdRows]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/customers" className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Back to Customers
        </Link>
      </div>
      <Card aria-label="detail-header">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 flex-1 min-w-[320px]">
              <div className="flex items-start gap-3">
              {customer.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customer.profilePhotoUrl}
                  alt={`${customer.firstName} ${customer.lastName} profile`}
                  className="h-14 w-14 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-secondary text-sm font-semibold text-muted-foreground">
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-semibold">{customer.firstName} {customer.lastName}</h2>
                <p className="text-sm text-muted-foreground">{customer.memberId}</p>
                {customer.preferredName?.trim() && customer.preferredName.trim().toLowerCase() !== customer.firstName.toLowerCase() ? (
                  <p className="text-sm text-muted-foreground">Preferred: {customer.preferredName}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{displayedPronouns || "Not set"}</span>
                  <span>•</span>
                  <span>{hasValidDob ? `${(dobDate as Date).toLocaleDateString("en-US")} (${age})` : "DOB not set"}</span>
                </div>
                {isBirthdayToday ? (
                  <p className="mt-2 inline-flex items-center rounded-full bg-amber-100/80 px-2.5 py-1 text-xs font-semibold text-amber-900">🎂 Birthday today</p>
                ) : null}
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
            <CustomerDetailActions customerId={customer.id} />
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
        </CardContent>
      </Card>

      <Card aria-label="detail-jump-links" className="sticky top-4 z-20 border border-border/80 bg-background/95 shadow-md backdrop-blur">
        <CardContent className="rounded-xl p-4">
          <nav aria-label="Customer detail sections" className="flex flex-wrap gap-2">
            {[
              ["overview", "Overview"],
              ["profile", "Profile"],
              ["access", "Access"],
              ["waiver", "Waiver"],
              ["visits", "Visits"],
              ["purchases", "Purchases"],
              ["registrations", "Registrations"],
              ["household", "Household"],
              ["notes", "Notes"],
              ["payment", "Payment"]
            ]
              .concat(customerStaffProfile ? [["staff-profile", "Staff Profile"] as [string, string]] : [])
              .map(([id, label]) => (
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="detail-summary-cards">
          <CustomerSummaryCard
            title="Access Status"
            value={activeAccessCount > 0 ? `${activeAccessCount} active` : "No active access"}
            detail={membership?.planName ?? pass?.title ?? customer.dayPassProductName ?? "No current plan or pass"}
          />
          <CustomerSummaryCard
            title="Waiver Status"
            value={waiver?.status === "valid" ? "Valid" : waiver?.status === "expired" ? "Expired" : "Missing"}
            detail={waiver?.expiresAt ? `Expires ${waiver.expiresAt}` : "No waiver on file"}
          />
          <CustomerSummaryCard
            title="Current Access"
            value={currentAccessLabel}
            detail={currentAccessDetail}
          />
          <CustomerSummaryCard
            title="Upcoming Registration"
            value={latestUpcomingSession ? latestUpcomingSession.session?.title ?? "Scheduled Session" : "No upcoming session"}
            detail={latestUpcomingSession?.session?.startsAt ? new Date(latestUpcomingSession.session.startsAt).toLocaleString("en-US") : "No upcoming registrations"}
          />
        </div>
      </section>

      <section id="profile" aria-label="section-profile" className="scroll-mt-40 space-y-4">
        <Card aria-label="detail-profile-information">
          <CardHeader><CardTitle>Full Profile Metadata</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Photo & Profile Metadata</p>
              {customer.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customer.profilePhotoUrl} alt="Profile" className="mt-2 h-20 w-20 rounded-lg border object-cover" />
              ) : (
                <p className="text-xs text-muted-foreground">Profile photo not set</p>
              )}
              <Field label="Profile photo URL" value={customer.profilePhotoUrl || "Not set"} />
              <Field label="Updated by" value={customer.updatedByStaffName || "Not set"} />
              <Field label="Last updated" value={customer.updatedAt ? new Date(customer.updatedAt).toLocaleString("en-US") : "Not set"} />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Data Completeness</p>
              <Field label="Preferred name" value={customer.preferredName || "Not set"} warning={requiredMissing.preferredName} />
              <Field label="Pronouns" value={displayedPronouns || "Not set"} warning={requiredMissing.pronouns} />
              <Field label="DOB" value={hasValidDob ? (dobDate as Date).toLocaleDateString("en-US") : "Not set"} warning={requiredMissing.dateOfBirth} />
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
              <p className="text-muted-foreground">Expiration: {entry.expirationDate ?? "N/A"}</p>
              <p className="text-muted-foreground">Punches: {typeof entry.remainingPunches === "number" ? entry.remainingPunches : "N/A"}</p>
              <p className="text-muted-foreground">Locations: {entry.locationsAllowed?.join(", ") ?? "All"}</p>
              <p className="text-muted-foreground">Waiver requirement: {accessProducts.find((product) => product.id === entry.productId)?.waiverRequired ? "Required" : "Not required"}</p>
              <p className="text-muted-foreground">Access source: {entry.notes ?? entry.type}</p>
              <p className="text-muted-foreground">
                Eligibility preview: {decision.allowed ? "✓ Can use now" : `✕ ${decision.reasons[0] ?? "Blocked"}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated: {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString("en-US") : "—"}{entry.updatedByStaffName ? ` • ${entry.updatedByStaffName}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {entry.status === "active" ? (
                  <Button
                    className="h-9"
                    variant="secondary"
                    onClick={() =>
                      updateCustomerAccessRecord(entry.id, {
                        status: "paused",
                        pausedAt: new Date().toISOString(),
                        updatedByStaffId: activeStaff?.id,
                        updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                      })
                    }
                  >
                    Pause
                  </Button>
                ) : null}
                {entry.status === "paused" ? (
                  <Button
                    className="h-9"
                    variant="secondary"
                    onClick={() =>
                      updateCustomerAccessRecord(entry.id, {
                        status: "active",
                        updatedByStaffId: activeStaff?.id,
                        updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                      })
                    }
                  >
                    Resume
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
              </div>
            </div>
          ))}
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
              <Field label="Last active" value={customerStaffProfile.lastActive ? new Date(customerStaffProfile.lastActive).toLocaleString("en-US") : "No recent activity"} />
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

      <section id="household" aria-label="section-household" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-household">
        <CardHeader><CardTitle>Household</CardTitle></CardHeader>
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
                <Button variant="secondary" className="h-10" onClick={() => setProfileFeedback("Search a member below and add to an existing household from their profile.")}>
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
                  label="Search customer"
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
                    <p className="text-muted-foreground">{entry.session?.startsAt ? new Date(entry.session.startsAt).toLocaleString("en-US") : "Date pending"} · {entry.registration.status}</p>
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
      <Card aria-label="detail-timeline">
        <CardHeader><CardTitle>Customer Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {timelineEvents.length === 0 ? <p className="text-muted-foreground">No activity recorded yet.</p> : null}
          {timelineEvents.slice(0, 12).map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3">
              <p className="font-medium">{entry.title}</p>
              <p className="text-muted-foreground">{entry.detail}</p>
              <p className="text-muted-foreground">{new Date(entry.occurredAt).toLocaleString("en-US")}</p>
              <p className="text-muted-foreground">Staff: {entry.staff}</p>
            </div>
          ))}
        </CardContent>
      </Card>

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
                <p className="font-medium">{new Date(entry.completedAt).toLocaleDateString()}</p>
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
              </div>
            ))
          )}
          {purchaseHistoryEntries.length > 3 ? <p className="text-xs text-muted-foreground">Showing recent purchases only.</p> : null}
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
                {entry.session?.title ?? entry.program?.title ?? "Session"} • {new Date(entry.session?.startsAt ?? "").toLocaleString("en-US")} • {entry.registration.status}
              </p>
            ))}
          </div>
          <div>
            <p className="font-medium">Past Sessions</p>
            {pastSessions.length === 0 ? <p className="text-muted-foreground">No past sessions.</p> : null}
            {pastSessions.slice(0, 4).map((entry) => (
              <p key={entry.registration.id} className="text-muted-foreground">
                {entry.session?.title ?? entry.program?.title ?? "Session"} • {new Date(entry.session?.startsAt ?? "").toLocaleString("en-US")} • {(entry.session?.status ?? entry.registration.status)}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
      </section>

      <section id="waiver" aria-label="section-waiver" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-waiver-history">
        <CardHeader><CardTitle>Waiver History</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {waiver ? (
            <div className="rounded-lg border p-3">
              <p className={waiver.status === "valid" ? "font-medium text-emerald-800" : "font-medium text-amber-800"}>
                {waiver.status === "valid" ? "Valid waiver on file" : waiver.status === "expired" ? "Waiver expired" : "Waiver missing"}
              </p>
              <p className="text-muted-foreground">Signed: {waiver.signedAt ? new Date(waiver.signedAt).toLocaleDateString() : "N/A"}</p>
              <p className="text-muted-foreground">Expires: {waiver.expiresAt ?? "N/A"}</p>
              <p className="text-muted-foreground">Updated by: {waiver.updatedByStaffName ?? "Staff not recorded"}</p>
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
      </section>

      <section id="notes" aria-label="section-notes" className="scroll-mt-40 space-y-4">
      <Card aria-label="detail-notes">
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{customer.notes ?? "No internal notes yet."}</p></CardContent>
      </Card>
      </section>
    </div>
  );
}

function Field({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm ${warning ? "text-amber-700" : "text-foreground"}`}>{value}</p>
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
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm ${warning ? "text-amber-700" : "text-foreground"} break-words ${wrapAnywhere ? "[overflow-wrap:anywhere]" : ""}`}>{value}</p>
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
