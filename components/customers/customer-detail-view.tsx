"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerBadges } from "@/components/customers/customer-badges";
import { ActivityTimeline } from "@/components/customers/activity-timeline";
import { CustomerDetailActions } from "@/components/customers/customer-detail-actions";
import { CustomerSummaryCard } from "@/components/customers/customer-summary-card";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { filterCustomers } from "@/lib/data/customer-search";
import { formatCurrency } from "@/lib/transactions";

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
    addCustomerRelationship,
    removeCustomerRelationship,
    updateCustomerAccessRecord,
    updateCustomerWaiver,
    households,
    householdMembers,
    createHousehold,
    addHouseholdMember,
    removeHouseholdMember,
    updateHouseholdMember
  } = useCustomerState();
  const { activeStaff } = useWorkstationState();
  const [relationshipQuery, setRelationshipQuery] = useState("");
  const [relationshipType, setRelationshipType] = useState<"parent_guardian" | "child" | "spouse_partner" | "sibling" | "emergency_contact" | "other">("parent_guardian");
  const [relationshipNotes, setRelationshipNotes] = useState("");
  const [householdMemberQuery, setHouseholdMemberQuery] = useState("");
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [profileFeedback, setProfileFeedback] = useState("");
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
  const relationshipCandidates = useMemo(
    () =>
      relationshipQuery.trim().length === 0
        ? []
        : filterCustomers(customers.filter((entry) => entry.id !== customer.id), relationshipQuery).slice(0, 8),
    [customers, customer.id, relationshipQuery]
  );
  const displayedPronouns = customer.pronouns === "Custom" ? customer.customPronouns ?? "Custom" : customer.pronouns ?? "Not set";
  const notesPreview = customer.notes?.trim() ? customer.notes.trim() : "No notes on file.";
  const dobDate = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
  const hasValidDob = !!dobDate && !Number.isNaN(dobDate.getTime());
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
  const relatedRows = (customer.relatedCustomers ?? []).map((relationship) => ({
    ...relationship,
    related: customers.find((entry) => entry.id === relationship.relatedCustomerId)
  }));
  const householdMembership = householdMembers.find((entry) => entry.customerId === customer.id);
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
            <div className="space-y-3">
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
              <div className="grid gap-2 sm:grid-cols-2">
                <HeaderField label="Phone" value={customer.phone || "Not set"} warning={requiredMissing.phone} />
                <HeaderField label="Email" value={customer.email || "Not set"} />
                <HeaderField
                  label="Emergency Contact"
                  value={customer.emergencyContactName ? `${customer.emergencyContactName}${customer.emergencyContactPhone ? ` • ${customer.emergencyContactPhone}` : ""}` : "Not set"}
                  warning={requiredMissing.emergencyContactName || requiredMissing.emergencyContactPhone}
                  className="sm:col-span-2"
                />
              </div>
            </div>
            <CustomerDetailActions customerId={customer.id} />
          </div>
          <div className="mt-3">
            <CustomerBadges customer={customer} membership={membership} punchPass={pass} waiver={waiver} />
          </div>
        </CardContent>
      </Card>

      <Card aria-label="detail-jump-links" className="sticky top-4 z-20 border shadow-sm">
        <CardContent className="rounded-xl bg-card/95 p-3 backdrop-blur">
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
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
                {label}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      <section id="overview" aria-label="section-overview" className="scroll-mt-40">
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

      <section id="profile" aria-label="section-profile" className="scroll-mt-40">
        <Card aria-label="detail-profile-information">
          <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Address</p>
              <Field label="Address line 1" value={customer.addressLine1 || "Not set"} warning={requiredMissing.addressLine1} />
              <Field label="Address line 2" value={customer.addressLine2 || "Not set"} />
              <Field label="City" value={customer.city || "Not set"} warning={requiredMissing.city} />
              <Field label="State" value={customer.state || "Not set"} warning={requiredMissing.state} />
              <Field label="ZIP/postal code" value={customer.postalCode || "Not set"} warning={requiredMissing.postalCode} />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Emergency Contact</p>
              <Field label="Name" value={customer.emergencyContactName || "Not set"} warning={requiredMissing.emergencyContactName} />
              <Field label="Phone" value={customer.emergencyContactPhone || "Not set"} warning={requiredMissing.emergencyContactPhone} />
            </div>
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
            <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="text-sm">{notesPreview}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="access" aria-label="section-access" className="scroll-mt-40">
      <Card aria-label="detail-access-products">
        <CardHeader><CardTitle>Access Products</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {accessRecords.length === 0 ? <p className="text-muted-foreground">No access products yet.</p> : null}
          {accessRecords.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3">
              <p className="font-medium">{entry.notes ?? entry.type}</p>
              <p className="text-muted-foreground">Status: {entry.status}</p>
              <p className="text-muted-foreground">Expiration: {entry.expirationDate ?? "N/A"}</p>
              <p className="text-muted-foreground">Punches: {typeof entry.remainingPunches === "number" ? entry.remainingPunches : "N/A"}</p>
              <p className="text-muted-foreground">Locations: {entry.locationsAllowed?.join(", ") ?? "All"}</p>
              <p className="text-muted-foreground">Access source: {entry.notes ?? entry.type}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button className="h-9" variant="secondary" onClick={() => updateCustomerAccessRecord(entry.id, { status: "paused" })}>Pause</Button>
                <Button className="h-9" variant="destructive" onClick={() => updateCustomerAccessRecord(entry.id, { status: "cancelled" })}>Cancel</Button>
                <Button className="h-9" variant="secondary" onClick={() => updateCustomerAccessRecord(entry.id, { expirationDate: "2026-07-20" })}>Extend</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </section>

      <section id="household" aria-label="section-household" className="scroll-mt-40">
      <Card aria-label="detail-related-customers">
        <CardHeader><CardTitle>Related Customers</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {relatedRows.length === 0 ? <p className="text-muted-foreground">No related customers linked yet.</p> : null}
          {relatedRows.map((entry) => (
            <div key={entry.relatedCustomerId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <p className="font-medium">{entry.related ? `${entry.related.firstName} ${entry.related.lastName}` : "Unknown customer"}</p>
                <p className="text-muted-foreground">
                  {entry.relationshipType.replaceAll("_", "/")}
                  {entry.notes ? ` • ${entry.notes}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.related ? (
                  <Link href={`/customers/${entry.related.id}`}>
                    <Button variant="secondary" className="h-9">View</Button>
                  </Link>
                ) : null}
                <Button
                  variant="destructive"
                  className="h-9"
                  onClick={() => {
                    const result = removeCustomerRelationship(customer.id, entry.relatedCustomerId);
                    setProfileFeedback(result.message);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <div className="space-y-2 rounded-lg border p-3">
            <p className="font-medium">Add Related Customer</p>
            <CustomerSearchCombobox
              label="Search existing customer"
              placeholder="Search by name, member ID, phone, or email"
              query={relationshipQuery}
              onQueryChange={setRelationshipQuery}
              customers={relationshipCandidates}
              onSelect={(selectedId) => {
                const result = addCustomerRelationship(customer.id, {
                  relatedCustomerId: selectedId,
                  relationshipType,
                  notes: relationshipNotes
                });
                setProfileFeedback(result.message);
                if (result.ok) {
                  setRelationshipQuery("");
                  setRelationshipNotes("");
                }
              }}
              emptyMessage="No customers found"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Relationship type</span>
                <select
                  aria-label="Relationship type"
                  className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={relationshipType}
                  onChange={(event) => setRelationshipType(event.target.value as typeof relationshipType)}
                >
                  <option value="parent_guardian">Parent/guardian</option>
                  <option value="child">Child</option>
                  <option value="spouse_partner">Spouse/partner</option>
                  <option value="sibling">Sibling</option>
                  <option value="emergency_contact">Emergency contact</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Notes (optional)</span>
                <input
                  aria-label="Relationship notes"
                  className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={relationshipNotes}
                  onChange={(event) => setRelationshipNotes(event.target.value)}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <Button variant="secondary" className="h-10" onClick={() => setRelationshipType("parent_guardian")}>
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
                <p className="text-muted-foreground">
                  Default payment: {householdDefaultPayment
                    ? `${householdDefaultPayment.cardBrand} ending in ${householdDefaultPayment.last4}`
                    : "No household payment method"}
                </p>
              </div>
              <div className="space-y-2">
                {householdRows.map((member) => (
                  <div key={member.customerId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">
                        {member.customer ? `${member.customer.firstName} ${member.customer.lastName}` : "Unknown customer"}
                      </p>
                      <p className="text-muted-foreground">
                        {member.role} • {member.relationship}
                      </p>
                      <p className="text-muted-foreground">
                        {member.canCheckInOthers ? "Can check in dependents" : "Guardian approval required"} • {member.canPurchaseForOthers ? "Can purchase for others" : "Purchases limited"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.customerId !== customer.id ? (
                        <Button
                          variant="destructive"
                          className="h-9"
                          onClick={() => {
                            const result = removeHouseholdMember(household.id, member.customerId);
                            setProfileFeedback(result.message);
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        className="h-9"
                        onClick={() => {
                          const result = updateHouseholdMember(household.id, member.customerId, {
                            canCheckInOthers: !member.canCheckInOthers
                          });
                          setProfileFeedback(result.message);
                        }}
                      >
                        {member.canCheckInOthers ? "Require Guardian" : "Allow Check-in Others"}
                      </Button>
                    </div>
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

      <section id="payment" aria-label="section-payment" className="scroll-mt-40">
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
      {profileFeedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{profileFeedback}</p> : null}

      <section id="visits" aria-label="section-visits" className="scroll-mt-40">
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

      <section id="purchases" aria-label="section-purchases" className="scroll-mt-40">
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

      <section id="registrations" aria-label="section-registrations" className="scroll-mt-40">
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

      <section id="waiver" aria-label="section-waiver" className="scroll-mt-40">
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

      <section id="notes" aria-label="section-notes" className="scroll-mt-40">
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
  className
}: {
  label: string;
  value: string;
  warning?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-md bg-secondary/35 px-3 py-2 ${className ?? ""}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm ${warning ? "text-amber-700" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
