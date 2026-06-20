"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ContextBackLink } from "@/components/shared/context-back-link";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { HouseholdAvatar } from "@/components/households/household-avatar";
import { DigitalMembershipCard } from "@/components/memberships/digital-membership-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { useCustomerState } from "@/lib/state/customer-state";
import { useSettingsState } from "@/lib/state/settings-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatCurrency } from "@/lib/transactions";
import { buildCustomerDetailHref, buildDetailHref } from "@/lib/navigation/detail-navigation";
import type { Household } from "@/types/domain";
import {
  formatHouseholdRelationship,
  formatHouseholdRole,
  getHouseholdHealthLabel,
  getHouseholdHealthStatus,
  type HouseholdHealthStatus
} from "@/lib/households/presentation";
import { buildMembershipCardRecord } from "@/lib/memberships/cards";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildHouseholdHref(householdId: string, pathname: string, currentSearch = "") {
  return buildDetailHref({
    destination: "household",
    entityId: householdId,
    currentPathname: pathname,
    currentSearch
  });
}

type HouseholdFocusFilter =
  | "missing-waivers"
  | "outstanding-balance"
  | "upcoming-renewals"
  | "top-visiting"
  | "recent-activity";

function buildHouseholdWorkspaceHref(focus?: HouseholdFocusFilter) {
  return focus ? `/households?focus=${focus}` : "/households";
}

export function HouseholdsWorkspace({
  initialHouseholdId,
  pathname = "/households",
  currentSearch = "",
  persistedHouseholds
}: {
  initialHouseholdId?: string;
  pathname?: string;
  currentSearch?: string;
  persistedHouseholds?: Household[];
}) {
  const {
    households,
    householdMembers,
    customers,
    customerAccessRecords,
    waivers,
    registrations,
    sessions,
    programs,
    checkInRecords,
    transactions,
    communications,
    operationsAlerts,
    operationsTasks,
    familyCheckIn,
    checkOutRecord,
    updateHouseholdPhoto
  } = useCustomerState();
  const { settings } = useSettingsState();
  const { activeStaff } = useWorkstationState();
  const isDetailPage = pathname.includes("/households/");
  const queryParams = useMemo(() => new URLSearchParams(currentSearch), [currentSearch]);
  const currentOrgSlug = pathname.match(/^\/o\/([^/]+)/)?.[1] ?? "summit";
  const focusFilter = (queryParams.get("focus") as HouseholdFocusFilter | null) ?? null;
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const displayHouseholds = persistedHouseholds ?? households;
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(initialHouseholdId ?? displayHouseholds[0]?.id ?? "");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const householdPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const householdRows = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return displayHouseholds.map((household) => {
      const members = householdMembers
        .filter((entry) => entry.householdId === household.id)
        .map((entry) => ({
          membership: entry,
          customer: customers.find((customer) => customer.id === entry.customerId)
        }))
        .filter((entry): entry is { membership: (typeof householdMembers)[number]; customer: NonNullable<typeof entry.customer> } => Boolean(entry.customer));
      const memberIds = members.map((entry) => entry.customer.id);
      const primaryContact = customers.find((entry) => entry.id === household.primaryContactCustomerId);
      const secondaryContact = customers.find((entry) => entry.id === household.secondaryContactCustomerId);
      const billingContact = customers.find((entry) => entry.id === household.billingCustomerId);
      const activeMemberships = customerAccessRecords.filter(
        (entry) =>
          (entry.householdId === household.id || memberIds.includes(entry.customerId)) &&
          (entry.type === "membership" || entry.type === "household-membership") &&
          entry.status === "active"
      );
      const waiverRows = members.map((member) => ({
        ...member,
        waiver: waivers.find((entry) => entry.customerId === member.customer.id)
      }));
      const missingWaivers = waiverRows.filter((entry) => entry.waiver?.status !== "valid");
      const expiringWaivers = waiverRows.filter((entry) => {
        const expiresAt = entry.waiver?.expiresAt;
        return Boolean(expiresAt && expiresAt >= todayKey && expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      });
      const expiredWaivers = waiverRows.filter((entry) => entry.waiver?.status === "expired");
      const upcomingRegistrations = registrations
        .filter((entry) => memberIds.includes(entry.customerId))
        .map((entry) => ({
          registration: entry,
          session: sessions.find((session) => session.id === entry.sessionId)
        }))
        .filter((entry) => entry.session)
        .sort((a, b) => (a.session?.startsAt ?? "").localeCompare(b.session?.startsAt ?? ""));
      const waitlists = upcomingRegistrations.filter((entry) => entry.registration.status === "waitlisted");
      const attendanceHistory = registrations.filter((entry) => memberIds.includes(entry.customerId) && ["attended", "completed", "checked_in"].includes(entry.status));
      const recentVisits = checkInRecords
        .filter((entry) => memberIds.includes(entry.customerId))
        .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
      const currentlyIn = recentVisits.filter((entry) => entry.status === "checked-in" && !entry.checkOutTime);
      const recentCheckedOut = recentVisits.filter((entry) => entry.status === "checked-out" || entry.checkOutTime);
      const recentPurchases = transactions
        .filter(
          (entry) =>
            entry.householdId === household.id ||
            (entry.purchaserCustomerId ? memberIds.includes(entry.purchaserCustomerId) : false) ||
            memberIds.includes(entry.customerId) ||
            (entry.purchasedForCustomerIds ?? []).some((id) => memberIds.includes(id))
        )
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
      const outstandingBalance = recentPurchases
        .filter((entry) => entry.receiptStatus === "pending")
        .reduce((sum, entry) => sum + entry.total, 0);
      const paymentMethods = members.flatMap((member) =>
        (member.customer.paymentMethods ?? []).map((method) => ({
          ...method,
          customerName: `${member.customer.firstName} ${member.customer.lastName}`
        }))
      );
      const expiredMemberships = customerAccessRecords.filter(
        (entry) =>
          (entry.householdId === household.id || memberIds.includes(entry.customerId)) &&
          (entry.type === "membership" || entry.type === "household-membership") &&
          entry.status === "expired"
      );
      const incompleteProfiles = members.filter(
        (entry) => !entry.customer.phone?.trim() || !entry.customer.email?.trim() || !entry.customer.dateOfBirth
      );
      const missingEmergencyContacts = members.filter(
        (entry) => !entry.customer.emergencyContactName?.trim() || !entry.customer.emergencyContactPhone?.trim()
      );
      const alerts = operationsAlerts.filter(
        (entry) =>
          memberIds.includes(entry.customerId ?? "") ||
          activeMemberships.some((membership) => membership.id === entry.membershipId) ||
          recentPurchases.some((purchase) => purchase.id === entry.transactionId)
      );
      const tasks = operationsTasks.filter(
        (entry) =>
          memberIds.includes(entry.customerId ?? "") ||
          activeMemberships.some((membership) => membership.id === entry.membershipId) ||
          recentPurchases.some((purchase) => purchase.id === entry.productId)
      );
      const communicationHistory = communications.filter(
        (entry) =>
          entry.householdId === household.id ||
          memberIds.includes(entry.customerId ?? "") ||
          activeMemberships.some((membership) => membership.id === entry.membershipId) ||
          upcomingRegistrations.some((registration) => registration.session?.id === entry.sessionId)
      );
      const topVisitor = members
        .map((member) => ({
          customer: member.customer,
          visits: recentVisits.filter((visit) => visit.customerId === member.customer.id && visit.checkInTime.startsWith(todayKey.slice(0, 7))).length
        }))
        .sort((a, b) => b.visits - a.visits)[0];
      const currentWaivers = waiverRows.filter((entry) => entry.waiver?.status === "valid");
      const healthStatus: HouseholdHealthStatus = getHouseholdHealthStatus({
        missingWaivers: missingWaivers.length,
        expiredMemberships: expiredMemberships.length,
        outstandingBalanceCents: outstandingBalance,
        incompleteProfiles: incompleteProfiles.length,
        missingEmergencyContacts: missingEmergencyContacts.length
      });
      const recentActivity = [
        ...recentVisits.slice(0, 4).map((visit) => ({
          id: `visit-${visit.id}`,
          title: `${visit.customerName} checked ${visit.checkOutTime ? "out" : "in"}`,
          occurredAt: visit.checkOutTime ?? visit.checkInTime
        })),
        ...recentPurchases.slice(0, 3).map((purchase) => ({
          id: `purchase-${purchase.id}`,
          title: `${purchase.receiptNumber} processed`,
          occurredAt: purchase.completedAt
        })),
        ...upcomingRegistrations.slice(0, 3).map((entry) => ({
          id: `registration-${entry.registration.id}`,
          title: `${customers.find((customer) => customer.id === entry.registration.customerId)?.firstName ?? "Member"} registered`,
          occurredAt: entry.session?.startsAt ?? todayKey
        })),
        ...alerts.slice(0, 2).map((alert) => ({
          id: `alert-${alert.id}`,
          title: alert.title,
          occurredAt: alert.createdAt ?? todayKey
        })),
        ...communicationHistory.slice(0, 3).map((entry) => ({
          id: `communication-${entry.id}`,
          title: entry.subject,
          occurredAt: entry.sentAt ?? entry.scheduledFor ?? entry.createdAt
        }))
      ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

      return {
        household,
        members,
        memberIds,
        primaryContact,
        secondaryContact,
        billingContact,
        activeMemberships,
        expiredMemberships,
        missingWaivers,
        currentWaivers,
        expiringWaivers,
        expiredWaivers,
        incompleteProfiles,
        missingEmergencyContacts,
        upcomingRegistrations,
        waitlists,
        attendanceHistory,
        recentVisits,
        currentlyIn,
        recentCheckedOut,
        recentPurchases,
        communicationHistory,
        outstandingBalance,
        paymentMethods,
        alerts,
        tasks,
        topVisitor,
        healthStatus,
        recentActivity
      };
    });
  }, [
    checkInRecords,
    customerAccessRecords,
    customers,
    displayHouseholds,
    householdMembers,
    operationsAlerts,
    operationsTasks,
    registrations,
    sessions,
    transactions,
    waivers
  ]);

  const filteredHouseholds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const focusFiltered = householdRows.filter((row) => {
      if (focusFilter === "missing-waivers") return row.missingWaivers.length > 0;
      if (focusFilter === "outstanding-balance") return row.outstandingBalance > 0;
      if (focusFilter === "upcoming-renewals") {
        return row.activeMemberships.some(
          (membership) =>
            Boolean(membership.expirationDate) &&
            membership.expirationDate! <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        );
      }
      if (focusFilter === "top-visiting") return row.recentVisits.length > 0;
      if (focusFilter === "recent-activity") return row.recentActivity.length > 0;
      return true;
    });
    if (!normalized) return focusFiltered;
    return focusFiltered.filter((row) => {
      const haystack = [
        row.household.householdName,
        row.primaryContact ? `${row.primaryContact.firstName} ${row.primaryContact.lastName}` : "",
        row.billingContact ? `${row.billingContact.firstName} ${row.billingContact.lastName}` : "",
        row.household.email ?? "",
        row.household.phone ?? "",
        row.household.defaultAddress ?? "",
        ...row.activeMemberships.flatMap((entry) => [entry.id, entry.productId, entry.type, entry.status]),
        ...row.members.flatMap((entry) => [
          `${entry.customer.firstName} ${entry.customer.lastName}`,
          entry.customer.memberId,
          entry.customer.email,
          entry.customer.phone
        ])
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [focusFilter, householdRows, query]);

  const selected = filteredHouseholds.find((row) => row.household.id === selectedHouseholdId) ?? filteredHouseholds[0];
  const householdHealthCards = selected
    ? [
        { label: "Household Members", value: `${selected.members.length}` },
        { label: "Active Memberships", value: `${selected.activeMemberships.length}` },
        { label: "Upcoming Programs", value: `${selected.upcomingRegistrations.length}` },
        { label: "Current Waivers", value: `${selected.currentWaivers.length}` },
        { label: "Outstanding Balance", value: formatCurrency(selected.outstandingBalance) },
        { label: "Recent Visits", value: `${selected.recentVisits.length}` }
      ]
    : [];

  const actingGuardian = selected?.members.find((entry) => entry.membership.canCheckInOthers);
  const selectedCheckInIds = selectedMemberIds.length > 0 ? selectedMemberIds : selected?.members.map((entry) => entry.customer.id) ?? [];
  const topVisitingHouseholds = [...householdRows]
    .sort((a, b) => (b.topVisitor?.visits ?? 0) - (a.topVisitor?.visits ?? 0))
    .slice(0, 4);
  const upcomingRenewals = householdRows.filter((row) =>
    row.activeMemberships.some((membership) => membership.expirationDate && membership.expirationDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  );
  const locationName = selected ? settings.locations.find((entry) => entry.id === selected.household.locationId)?.name ?? selected.household.locationId : "";
  const healthReasons = selected
    ? [
        selected.missingWaivers.length > 0 ? `${selected.missingWaivers.length} member${selected.missingWaivers.length === 1 ? "" : "s"} missing waivers` : null,
        selected.expiredMemberships.length > 0 ? `${selected.expiredMemberships.length} expired membership${selected.expiredMemberships.length === 1 ? "" : "s"}` : null,
        selected.outstandingBalance > 0 ? `Outstanding balance ${formatCurrency(selected.outstandingBalance)}` : null,
        selected.incompleteProfiles.length > 0 ? `${selected.incompleteProfiles.length} incomplete profile${selected.incompleteProfiles.length === 1 ? "" : "s"}` : null,
        selected.missingEmergencyContacts.length > 0
          ? `${selected.missingEmergencyContacts.length} member${selected.missingEmergencyContacts.length === 1 ? "" : "s"} missing emergency contacts`
          : null
      ].filter((entry): entry is string => Boolean(entry))
    : [];
  const jumpLinks = [
    { id: "household-members-section", label: "Members" },
    { id: "household-relationships-section", label: "Relationships" },
    { id: "household-memberships-section", label: "Memberships" },
    { id: "household-waivers-section", label: "Waivers" },
    { id: "household-registrations-section", label: "Programs" },
    { id: "household-checkin-section", label: "Check-In" },
    { id: "household-billing-section", label: "Billing" },
    { id: "household-purchases-section", label: "Purchases" },
    { id: "household-communications-section", label: "Communications" },
    { id: "household-timeline-section", label: "Timeline" }
  ];

  return (
    <section className="space-y-4" data-testid="households-workspace">
      {isDetailPage ? (
        currentSearch ? (
          <ContextBackLink
            fallbackHref="/households"
            fallbackLabel="Households"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          />
        ) : (
          <Link
            href="/households"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to Households
          </Link>
        )
      ) : null}
      <PageHeader
        title={isDetailPage && selected ? selected.household.householdName : "Households"}
        description={
          isDetailPage && selected
            ? "Household detail dashboard for memberships, waivers, registrations, billing, communications, check-ins, and shared activity."
            : "Manage family units, shared memberships, waivers, billing, registrations, check-ins, and communication from one operational workspace."
        }
      />

      {isDetailPage ? (
        <div className="flex flex-wrap gap-2" aria-label="household-jump-links">
          {jumpLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" aria-label="household-dashboard-widgets">
        <Link href={buildHouseholdWorkspaceHref("missing-waivers")}><SummaryCard label="Households Missing Waivers" value={`${householdRows.filter((row) => row.missingWaivers.length > 0).length}`} interactive /></Link>
        <Link href={buildHouseholdWorkspaceHref("outstanding-balance")}><SummaryCard label="Households With Outstanding Balance" value={`${householdRows.filter((row) => row.outstandingBalance > 0).length}`} interactive /></Link>
        <Link href={buildHouseholdWorkspaceHref("upcoming-renewals")}><SummaryCard label="Households With Upcoming Renewals" value={`${upcomingRenewals.length}`} interactive /></Link>
        <Link href={buildHouseholdWorkspaceHref("top-visiting")}><SummaryCard label="Top Visiting Households" value={topVisitingHouseholds[0]?.household.householdName ?? "No visit data"} interactive /></Link>
        <Link href={buildHouseholdWorkspaceHref("recent-activity")}><SummaryCard label="Recent Household Activity" value={householdRows.reduce((sum, row) => sum + row.recentActivity.length, 0).toString()} interactive /></Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card aria-label="household-list">
          <CardHeader>
            <CardTitle>Household Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SearchInput
              label="Search households"
              placeholder="Search household, member, or contact"
              value={query}
              onChange={setQuery}
            />
            {focusFilter ? (
              <p className="text-xs text-muted-foreground">
                Filter applied: {titleCase(focusFilter)}.
              </p>
            ) : null}
            <div className="space-y-2">
              {filteredHouseholds.map((row) => (
                <button
                  key={row.household.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition ${selected?.household.id === row.household.id ? "border-primary bg-primary/5" : "hover:bg-secondary/30"}`}
                  onClick={() => {
                    setSelectedHouseholdId(row.household.id);
                    setSelectedMemberIds(row.members.map((entry) => entry.customer.id));
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <HouseholdAvatar household={row.household} size="sm" />
                      <div>
                        <p className="font-medium">{row.household.householdName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.primaryContact ? `${row.primaryContact.firstName} ${row.primaryContact.lastName}` : "No primary contact"} · {row.members.length} members
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.household.phone ?? row.household.email ?? "No contact info"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.activeMemberships.length > 0 ? `${row.activeMemberships.length} active membership${row.activeMemberships.length === 1 ? "" : "s"}` : "No active memberships"}
                        </p>
                      </div>
                    </div>
                    <Badge tone={row.healthStatus === "critical" ? "danger" : row.healthStatus === "needs_attention" ? "warning" : "success"}>
                      {getHouseholdHealthLabel(row.healthStatus)}
                    </Badge>
                  </div>
                </button>
              ))}
              {filteredHouseholds.length === 0 ? <p className="text-sm text-muted-foreground">No households match this search. Try a household name, primary contact, phone, or email.</p> : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!selected ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Select a household to view the operational dashboard.</CardContent></Card>
          ) : (
            <>
              <Card aria-label="household-detail">
                <CardHeader>
                  <CardTitle>{selected.household.householdName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <input
                    ref={householdPhotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (!file) return;
                      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                        setFeedback("Unsupported file type. Use JPG, PNG, or WEBP.");
                        return;
                      }
                      if (file.size > 3 * 1024 * 1024) {
                        setFeedback("Image is too large. Max size is 3MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const url = typeof reader.result === "string" ? reader.result : "";
                        if (!url) return;
                        const result = updateHouseholdPhoto(selected.household.id, {
                          profilePhotoUrl: url,
                          updatedByStaffId: activeStaff?.id ?? "",
                          updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                        });
                        setFeedback(result.message);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                    <div className="flex items-start gap-4">
                      <HouseholdAvatar household={selected.household} size="xl" />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={selected.household.householdStatus === "archived" ? "danger" : selected.household.householdStatus === "inactive" ? "warning" : "success"}>
                            {titleCase(selected.household.householdStatus ?? "active")}
                          </Badge>
                          <Badge tone={selected.healthStatus === "critical" ? "danger" : selected.healthStatus === "needs_attention" ? "warning" : "success"}>
                            {getHouseholdHealthLabel(selected.healthStatus)}
                          </Badge>
                          <Badge tone="muted">{locationName}</Badge>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <InfoLine label="Primary Contact" value={selected.primaryContact ? `${selected.primaryContact.firstName} ${selected.primaryContact.lastName}` : "Not assigned"} />
                          <InfoLine label="Secondary Contact" value={selected.secondaryContact ? `${selected.secondaryContact.firstName} ${selected.secondaryContact.lastName}` : "Not assigned"} />
                          <InfoLine label="Preferred Contact" value={titleCase(selected.household.preferredCommunicationMethod ?? "email")} />
                          <InfoLine label="Created" value={formatDate(selected.household.createdAt)} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="h-9" onClick={() => householdPhotoInputRef.current?.click()}>
                        {selected.household.profilePhotoUrl ? "Replace Photo" : "Upload Photo"}
                      </Button>
                      {selected.household.profilePhotoUrl ? (
                        <Button
                          variant="destructiveSubtle"
                          className="h-9"
                          onClick={() => {
                            const result = updateHouseholdPhoto(selected.household.id, {
                              profilePhotoUrl: "",
                              updatedByStaffId: activeStaff?.id ?? "",
                              updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                            });
                            setFeedback(result.message);
                          }}
                        >
                          Remove Photo
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        if (!actingGuardian || !activeStaff?.id) {
                          setFeedback("Select active staff and a guardian-enabled household member to check in the household.");
                          return;
                        }
                        const result = familyCheckIn({
                          actingCustomerId: actingGuardian.customer.id,
                          memberIds: selectedCheckInIds,
                          staffUserId: activeStaff.id,
                          staffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                        });
                        setFeedback(result.message);
                      }}
                    >
                      Check In Household
                    </Button>
                    <Button variant="secondary">Register for Program</Button>
                    <Button variant="secondary">Sign Waivers</Button>
                    <Button variant="secondary">Renew Membership</Button>
                    <Button variant="secondary">Sell Access</Button>
                    <Button variant="secondary">View Receipts</Button>
                    <Button variant="secondary">Send Message</Button>
                    <Button variant="secondary">Add Member</Button>
                    <Link href={buildHouseholdHref(selected.household.id, pathname, currentSearch)}>
                      <Button variant="secondary">Open Detail Page</Button>
                    </Link>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {householdHealthCards.map((card) => (
                      <SummaryCard key={card.label} label={card.label} value={card.value} />
                    ))}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <InfoCard title="Household Profile">
                      <InfoLine label="Household Name" value={selected.household.householdName} />
                      <InfoLine label="Address" value={selected.household.defaultAddress ?? "Not set"} />
                      <InfoLine label="Phone" value={selected.household.phone ?? selected.primaryContact?.phone ?? "Not set"} />
                      <InfoLine label="Email" value={selected.household.email ?? selected.primaryContact?.email ?? "Not set"} />
                      <InfoLine
                        label="Emergency Contacts"
                        value={
                          selected.household.defaultEmergencyContactName
                            ? `${selected.household.defaultEmergencyContactName}${selected.household.defaultEmergencyContactPhone ? ` • ${selected.household.defaultEmergencyContactPhone}` : ""}`
                            : "Not set"
                        }
                      />
                      <InfoLine label="Notes" value={selected.household.notes ?? "No household notes"} />
                    </InfoCard>
                    <InfoCard title="Billing">
                      <InfoLine label="Billing Contact" value={selected.billingContact ? `${selected.billingContact.firstName} ${selected.billingContact.lastName}` : "Not assigned"} />
                      <InfoLine label="Outstanding Balance" value={formatCurrency(selected.outstandingBalance)} />
                      <InfoLine label="Recent Purchases" value={String(selected.recentPurchases.length)} />
                      <InfoLine label="Upcoming Renewals" value={String(selected.activeMemberships.filter((entry) => entry.expirationDate).length)} />
                    </InfoCard>
                    <InfoCard title="Household Health Score">
                      <InfoLine label="Status" value={getHouseholdHealthLabel(selected.healthStatus)} />
                      <InfoLine label="Missing Waivers" value={String(selected.missingWaivers.length)} />
                      <InfoLine label="Expired Memberships" value={String(selected.expiredMemberships.length)} />
                      <InfoLine label="Incomplete Profiles" value={String(selected.incompleteProfiles.length)} />
                      <InfoLine label="Missing Emergency Contacts" value={String(selected.missingEmergencyContacts.length)} />
                      <InfoLine label="Reasons" value={healthReasons.length > 0 ? healthReasons.join(" · ") : "No household issues detected"} />
                    </InfoCard>
                  </div>
                </CardContent>
              </Card>

              <div className="xl:columns-2 xl:gap-4">
                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Members" ariaLabel="household-members-section" id="household-members-section">
                  <div className="space-y-3">
                    {selected.members.map((entry) => {
                      const waiver = selected.missingWaivers.find((row) => row.customer.id === entry.customer.id)?.waiver ?? waivers.find((row) => row.customerId === entry.customer.id);
                      const membership = selected.activeMemberships.find((row) => row.customerId === entry.customer.id || row.coveredCustomerIds?.includes(entry.customer.id));
                      const nextProgram = selected.upcomingRegistrations.find((row) => row.registration.customerId === entry.customer.id);
                      const nextSession = nextProgram?.session;
                      const nextProgramTitle = nextSession
                        ? (programs.find((program) => program.id === nextSession.programId)?.title ?? nextSession.title ?? "Session")
                        : null;
                      const lastVisit = selected.recentVisits.find((row) => row.customerId === entry.customer.id);
                      const currentAccess = selected.activeMemberships.find(
                        (row) => row.customerId === entry.customer.id || row.coveredCustomerIds?.includes(entry.customer.id)
                      );
                      return (
                        <div key={entry.customer.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar customer={entry.customer} sizeClassName="h-10 w-10" />
                              <div>
                                <p className="font-medium">{entry.customer.firstName} {entry.customer.lastName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatHouseholdRole(entry.membership.role)} · {entry.customer.dateOfBirth ? formatDate(entry.customer.dateOfBirth) : "DOB not set"}
                                </p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              aria-label={`Select ${entry.customer.firstName} ${entry.customer.lastName} for household check-in`}
                              checked={selectedCheckInIds.includes(entry.customer.id)}
                              onChange={(event) =>
                                setSelectedMemberIds((prev) =>
                                  event.target.checked ? [...new Set([...prev, entry.customer.id])] : prev.filter((id) => id !== entry.customer.id)
                                )
                              }
                            />
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <p>Membership: {membership ? titleCase(membership.status) : "No active membership"}</p>
                            <p>Waiver: {waiver?.status ? titleCase(waiver.status) : "Missing"}</p>
                            <p>Current access: {currentAccess ? titleCase(currentAccess.status) : "Blocked"}</p>
                            <p>Upcoming program: {nextSession && nextProgramTitle ? `${nextProgramTitle} · ${formatDateTime(nextSession.startsAt)}` : "None"}</p>
                            <p>Recent visit: {lastVisit ? formatDateTime(lastVisit.checkInTime) : "No visits yet"}</p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link href={buildCustomerDetailHref({ customerId: entry.customer.id, currentPathname: pathname, currentSearch })}>
                              <Button variant="secondary" className="h-9">View Profile</Button>
                            </Link>
                            <Button variant="secondary" className="h-9" onClick={() => setFeedback(`Edit relationship controls live on the customer profile for ${entry.customer.firstName}.`)}>
                              Edit Relationship
                            </Button>
                            <Button variant="secondary" className="h-9" onClick={() => setFeedback(`Use the household detail actions on ${entry.customer.firstName}'s customer profile to remove this member.`)}>
                              Remove From Household
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Relationships" ariaLabel="household-relationships-section" id="household-relationships-section">
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3">
                      <p className="font-medium">{selected.primaryContact ? `${selected.primaryContact.firstName} ${selected.primaryContact.lastName}` : selected.household.householdName}</p>
                      <div className="mt-2 space-y-2 pl-4">
                        {selected.members
                          .filter((entry) => entry.customer.id !== selected.primaryContact?.id)
                          .map((entry) => (
                            <div key={entry.customer.id} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">├──</span>
                              <span>{entry.customer.firstName} {entry.customer.lastName}</span>
                              <span className="text-muted-foreground">· {formatHouseholdRelationship(entry.membership.relationship)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Access" ariaLabel="household-access-section" id="household-access-section">
                  <div className="space-y-3">
                    <p>Who can currently enter: {selected.activeMemberships.map((entry) => customers.find((customer) => customer.id === entry.customerId)?.firstName).filter(Boolean).join(", ") || "None"}</p>
                    <p>Who is blocked: {selected.members.filter((entry) => !selected.activeMemberships.some((row) => row.customerId === entry.customer.id || row.coveredCustomerIds?.includes(entry.customer.id))).map((entry) => `${entry.customer.firstName} ${entry.customer.lastName}`).join(", ") || "None"}</p>
                    <p>Missing waivers: {selected.missingWaivers.map((entry) => `${entry.customer.firstName} ${entry.customer.lastName}`).join(", ") || "None"}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="h-9">Sell Access</Button>
                      <Button variant="secondary" className="h-9">Renew Membership</Button>
                      <Button variant="secondary" className="h-9">Resolve Issues</Button>
                    </div>
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Memberships" ariaLabel="household-memberships-section" id="household-memberships-section">
                  <div className="space-y-3">
                    {selected.activeMemberships.length === 0 ? <p className="text-sm text-muted-foreground">No household memberships found. Sell or renew access from the household access section when this household is ready to join.</p> : null}
                    {selected.activeMemberships.map((membership) => (
                      <div key={membership.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {membership.type === "household-membership"
                              ? "Family Membership"
                              : membership.coveredCustomerIds?.length === 2
                                ? "Couple Membership"
                                : membership.coveredCustomerIds?.length === 1
                                  ? "Parent + Child"
                                  : "Custom Household Membership"}
                          </p>
                          <Badge tone={membership.status === "active" ? "success" : membership.status === "expired" ? "danger" : "warning"}>
                            {titleCase(membership.status)}
                          </Badge>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <p>Covered members: {(membership.coveredCustomerIds ?? []).map((id) => customers.find((entry) => entry.id === id)).filter(Boolean).map((entry) => `${entry!.firstName} ${entry!.lastName}`).join(", ") || "Primary member only"}</p>
                          <p>Start date: {formatDate(membership.startDate)}</p>
                          <p>Renewal date: {formatDate(membership.expirationDate)}</p>
                          <p>Membership health: {titleCase(membership.status)}</p>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          {(membership.coveredCustomerIds?.length ? membership.coveredCustomerIds : [membership.customerId])
                            .map((id) => customers.find((entry) => entry.id === id))
                            .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
                            .map((member) => (
                              <DigitalMembershipCard
                                key={`${membership.id}-${member.id}`}
                                variant="compact"
                                customer={member}
                                accessRecord={membership}
                                membershipName={
                                  membership.type === "household-membership"
                                    ? "Household Membership"
                                    : "Membership"
                                }
                                organizationName={settings.facilityProfile.facilityName}
                                organizationLogoUrl={settings.branding.logoUrl || undefined}
                                primaryColor={settings.branding.primaryColor}
                                secondaryColor={settings.branding.secondaryColor}
                                {...buildMembershipCardRecord(member, membership, currentOrgSlug)}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Waivers" ariaLabel="household-waivers-section" id="household-waivers-section">
                  <div className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <SummaryCard label="Current waivers" value={`${selected.members.length - selected.missingWaivers.length}`} compact />
                      <SummaryCard label="Missing waivers" value={`${selected.missingWaivers.length}`} compact />
                      <SummaryCard label="Expiring waivers" value={`${selected.expiringWaivers.length}`} compact />
                      <SummaryCard label="Expired waivers" value={`${selected.expiredWaivers.length}`} compact />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary">View Missing Waivers</Button>
                      <Button variant="secondary">Send Reminder</Button>
                      <Button variant="secondary">Request Signature</Button>
                    </div>
                    <div className="space-y-2">
                      {selected.members.map((entry) => {
                        const waiver = waivers.find((row) => row.customerId === entry.customer.id);
                        return (
                          <div key={entry.customer.id} className="rounded-lg border p-3">
                            <p className="font-medium">{entry.customer.firstName} {entry.customer.lastName}</p>
                            <p className="text-sm text-muted-foreground">
                              {waiver ? `${titleCase(waiver.status)} · ${waiver.expiresAt ? `Expires ${formatDate(waiver.expiresAt)}` : "No expiry"}` : "Missing waiver"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Check-In" ariaLabel="household-checkin-section" id="household-checkin-section">
                  <div className="space-y-3">
                    <p>Currently in facility: {selected.currentlyIn.length}</p>
                    <p>Already checked in: {selected.currentlyIn.map((entry) => entry.customerName).join(", ") || "No one currently in"}</p>
                    <p>Blocked: {selected.members.filter((entry) => !selectedCheckInIds.includes(entry.customer.id) && selected.missingWaivers.some((row) => row.customer.id === entry.customer.id)).map((entry) => `${entry.customer.firstName} ${entry.customer.lastName}`).join(", ") || "None"}</p>
                    <p>Missing waivers: {selected.missingWaivers.map((entry) => `${entry.customer.firstName} ${entry.customer.lastName}`).join(", ") || "None"}</p>
                    <p>Recently checked in: {selected.recentVisits.slice(0, 3).map((entry) => `${entry.customerName} (${formatDateTime(entry.checkInTime)})`).join(", ") || "None"}</p>
                    <p>Recently checked out: {selected.recentCheckedOut.slice(0, 3).map((entry) => `${entry.customerName} (${entry.checkOutTime ? formatDateTime(entry.checkOutTime) : "No check-out time"})`).join(", ") || "None"}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="h-9"
                        onClick={() => {
                          const checkedOut = selected.currentlyIn.map((entry) =>
                            checkOutRecord(entry.id, activeStaff?.id ?? "stf_002", activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined)
                          );
                          const successCount = checkedOut.filter((result) => result.ok).length;
                          setFeedback(successCount > 0 ? `Checked out ${successCount} household member${successCount === 1 ? "" : "s"}.` : "No household members were checked out.");
                        }}
                      >
                        Check Out Household
                      </Button>
                    </div>
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Registrations" ariaLabel="household-registrations-section" id="household-registrations-section">
                  <div className="space-y-3">
                    {selected.members.map((entry) => {
                      const rows = selected.upcomingRegistrations.filter((registration) => registration.registration.customerId === entry.customer.id);
                      return (
                        <div key={entry.customer.id} className="rounded-lg border p-3">
                          <p className="font-medium">{entry.customer.firstName} {entry.customer.lastName}</p>
                          <p className="text-xs text-muted-foreground">Upcoming sessions</p>
                          <ul className="mt-2 space-y-1 text-sm">
                            {rows.length === 0 ? <li>No current registrations.</li> : null}
                            {rows.map((row) => (
                              <li key={row.registration.id}>
                                {(programs.find((program) => program.id === row.session!.programId)?.title ?? row.session?.title ?? "Session")} · {formatDateTime(row.session!.startsAt)} · {titleCase(row.registration.status)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    <div className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">Attendance history</p>
                      <p className="text-muted-foreground">{selected.attendanceHistory.length} attended/completed registrations recorded.</p>
                    </div>
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Billing" ariaLabel="household-billing-section" id="household-billing-section">
                  <div className="space-y-3">
                    <p>Outstanding balances: {formatCurrency(selected.outstandingBalance)}</p>
                    <p>Upcoming renewals: {selected.activeMemberships.filter((entry) => entry.expirationDate).map((entry) => formatDate(entry.expirationDate)).join(", ") || "None"}</p>
                    <p>Auto-renew settings: Follow household membership renewal policy.</p>
                    <div className="space-y-2">
                      {selected.paymentMethods.length === 0 ? <p className="text-sm text-muted-foreground">No stored payment methods.</p> : null}
                      {selected.paymentMethods.map((method) => (
                        <div key={method.paymentMethodId} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{method.cardBrand} ending in {method.last4}</p>
                          <p className="text-muted-foreground">{method.customerName}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {selected.recentPurchases.slice(0, 5).map((purchase) => (
                        <div key={purchase.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{purchase.receiptNumber}</p>
                          <p className="text-muted-foreground">{formatDateTime(purchase.completedAt)} · {formatCurrency(purchase.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Purchase History" ariaLabel="household-purchases-section" id="household-purchases-section">
                  <div className="space-y-2">
                    {selected.recentPurchases.length === 0 ? <p className="text-sm text-muted-foreground">No household purchases yet.</p> : null}
                    {selected.recentPurchases.slice(0, 8).map((purchase) => (
                      <div key={purchase.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{purchase.receiptNumber}</p>
                          <Badge tone={purchase.receiptStatus === "paid" ? "success" : purchase.receiptStatus === "pending" ? "warning" : "muted"}>
                            {titleCase(purchase.receiptStatus ?? "paid")}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {formatDateTime(purchase.completedAt)} · {formatCurrency(purchase.total)} · {purchase.items.map((item) => item.productName).join(", ")}
                        </p>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="h-9">Export Purchase History</Button>
                      <Button variant="secondary" className="h-9">View Receipts</Button>
                    </div>
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Communications" ariaLabel="household-communications-section" id="household-communications-section">
                  <div className="space-y-3">
                    <p>Emails, SMS reminders, alerts, tasks, and internal notes are tracked in one household timeline.</p>
                    <div className="space-y-2">
                      {selected.communicationHistory.slice(0, 6).map((entry) => (
                        <div key={entry.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{entry.subject}</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(entry.sentAt ?? entry.scheduledFor ?? entry.createdAt)} · {titleCase(entry.channel)} · {titleCase(entry.status)}
                          </p>
                        </div>
                      ))}
                      {selected.tasks.slice(0, 4).map((task) => (
                        <div key={task.id} className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-muted-foreground">{titleCase(task.status)} · Due {task.dueDate ? formatDate(task.dueDate) : "not set"}</p>
                        </div>
                      ))}
                      {selected.household.notes ? (
                        <div className="rounded-lg border p-3 text-sm">
                          <p className="font-medium">Household note</p>
                          <p className="text-muted-foreground">{selected.household.notes}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>
                </div>

                <div className="mb-4 break-inside-avoid">
                <SectionCard title="Household Timeline" ariaLabel="household-timeline-section" id="household-timeline-section">
                  <div className="space-y-2">
                    {selected.recentActivity.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-muted-foreground">{formatDateTime(entry.occurredAt)}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  compact = false,
  interactive = false
}: {
  label: string;
  value: string;
  compact?: boolean;
  interactive?: boolean;
}) {
  return (
    <div className={`rounded-md border bg-card ${compact ? "p-3" : "p-4"} ${interactive ? "transition hover:bg-secondary/30 cursor-pointer" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`${compact ? "mt-1 text-base" : "mt-2 text-2xl"} font-semibold`}>{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
  ariaLabel,
  id
}: {
  title: string;
  children: React.ReactNode;
  ariaLabel: string;
  id?: string;
}) {
  return (
    <Card aria-label={ariaLabel} id={id} className="scroll-mt-36">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="mb-2 font-medium">{title}</p>
      <div className="space-y-1 text-muted-foreground">{children}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
