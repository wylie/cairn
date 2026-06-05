"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClassCampSession } from "@/types/domain";
import { canCustomerViewReceipt } from "@/lib/portal/receipts";
import { formatCurrency } from "@/lib/transactions";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { HouseholdAvatar } from "@/components/households/household-avatar";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatHouseholdRelationship, formatHouseholdRole, getHouseholdHealthLabel, getHouseholdHealthStatus } from "@/lib/households/presentation";

export default function CustomerPortalHouseholdPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const {
    primaryCustomerId,
    households,
    householdMembers,
    customers,
    waivers,
    customerAccessRecords,
    registrations,
    sessions,
    programs,
    checkInRecords,
    transactions,
    visibleCustomerIds
  } = useCustomerPortalData();
  const membership = householdMembers.find((entry) => entry.customerId === primaryCustomerId);
  const household = membership ? households.find((entry) => entry.id === membership.householdId) : undefined;
  const members = household
    ? householdMembers.filter((entry) => entry.householdId === household.id && visibleCustomerIds.includes(entry.customerId))
    : [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const memberRows = useMemo(
    () =>
      members
        .map((member) => {
          const customer = customers.find((entry) => entry.id === member.customerId);
          if (!customer) return null;
          const waiver = waivers.find((entry) => entry.customerId === customer.id);
          const access = customerAccessRecords.find((entry) => entry.customerId === customer.id && entry.type === "membership");
          const upcomingSessions = registrations
            .filter((entry) => entry.customerId === customer.id && ["confirmed", "waitlisted", "checked_in"].includes(entry.status))
            .map((entry) => sessions.find((session) => session.id === entry.sessionId))
            .filter((entry): entry is ClassCampSession => Boolean(entry))
            .filter((entry) => new Date(entry.startsAt) >= now);
          const upcomingProgramTitles = upcomingSessions
            .map((session) => programs.find((program) => program.id === session.programId)?.title ?? session.title ?? "Session")
            .slice(0, 3);
          const recentVisits = checkInRecords
            .filter((entry) => entry.customerId === customer.id)
            .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))
            .slice(0, 3);
          const visitCountThisMonth = checkInRecords.filter((entry) => {
            if (entry.customerId !== customer.id) return false;
            const date = new Date(entry.checkInTime);
            return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
          }).length;
          const programsAttended = registrations.filter((entry) => {
            if (entry.customerId !== customer.id) return false;
            return ["attended", "completed", "checked_in"].includes(entry.status);
          }).length;
          const dob = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
          const age = dob && !Number.isNaN(dob.getTime()) ? Math.max(0, Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425))) : null;
          return {
            member,
            customer,
            waiver,
            access,
            upcomingProgramTitles,
            recentVisits,
            visitCountThisMonth,
            programsAttended,
            age
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    [members, customers, waivers, customerAccessRecords, registrations, sessions, programs, checkInRecords, now, currentYear, currentMonth]
  );

  const householdMetrics = useMemo(() => {
    const mostActive = memberRows.reduce<{ name: string; visits: number } | null>((best, row) => {
      if (!best || row.visitCountThisMonth > best.visits) {
        return { name: `${row.customer.firstName} ${row.customer.lastName}`, visits: row.visitCountThisMonth };
      }
      return best;
    }, null);
    const totalVisitsThisMonth = memberRows.reduce((sum, row) => sum + row.visitCountThisMonth, 0);
    const totalProgramsAttended = memberRows.reduce((sum, row) => sum + row.programsAttended, 0);
    const spendingThisYear = transactions
      .filter((entry) => canCustomerViewReceipt(entry, visibleCustomerIds))
      .filter((entry) => {
        const completed = new Date(entry.completedAt);
        return completed.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + entry.total, 0);
    return { mostActive, totalVisitsThisMonth, totalProgramsAttended, spendingThisYear };
  }, [memberRows, transactions, visibleCustomerIds, currentYear]);
  const primaryAccountHolder = memberRows.find((row) => row.member.role === "primary-adult");
  const missingWaivers = memberRows.filter((row) => row.waiver?.status !== "valid");
  const expiredMemberships = memberRows.filter((row) => row.access?.status === "expired");
  const missingEmergencyContacts = memberRows.filter((row) => !row.customer.emergencyContactName || !row.customer.emergencyContactPhone);
  const incompleteProfiles = memberRows.filter((row) => !row.customer.email || !row.customer.phone || !row.customer.dateOfBirth);
  const outstandingBalance = transactions
    .filter((entry) => canCustomerViewReceipt(entry, visibleCustomerIds))
    .filter((entry) => entry.receiptStatus === "pending")
    .reduce((sum, entry) => sum + entry.total, 0);
  const householdHealth = getHouseholdHealthStatus({
    missingWaivers: missingWaivers.length,
    expiredMemberships: expiredMemberships.length,
    outstandingBalanceCents: outstandingBalance,
    incompleteProfiles: incompleteProfiles.length,
    missingEmergencyContacts: missingEmergencyContacts.length
  });
  const recentPurchases = transactions
    .filter((entry) => canCustomerViewReceipt(entry, visibleCustomerIds))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);
  const recentActivity = [
    ...checkInRecords
      .filter((entry) => visibleCustomerIds.includes(entry.customerId))
      .slice(0, 4)
      .map((entry) => ({
        id: `visit-${entry.id}`,
        title: `${entry.customerName} checked ${entry.checkOutTime ? "out" : "in"}`,
        occurredAt: entry.checkOutTime ?? entry.checkInTime
      })),
    ...recentPurchases.map((entry) => ({
      id: `receipt-${entry.id}`,
      title: `${entry.receiptNumber} processed`,
      occurredAt: entry.completedAt
    }))
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const activeMembershipRows = memberRows.filter((row) => row.access);
  const waiverIssues = memberRows.filter((row) => row.waiver?.status !== "valid");
  const healthReasons = [
    waiverIssues.length > 0 ? `${waiverIssues.length} member${waiverIssues.length === 1 ? "" : "s"} need waiver attention` : null,
    expiredMemberships.length > 0 ? `${expiredMemberships.length} expired membership${expiredMemberships.length === 1 ? "" : "s"}` : null,
    outstandingBalance > 0 ? `${formatCurrency(outstandingBalance)} outstanding balance` : null,
    missingEmergencyContacts.length > 0 ? `${missingEmergencyContacts.length} missing emergency contact${missingEmergencyContacts.length === 1 ? "" : "s"}` : null
  ].filter((entry): entry is string => Boolean(entry));

  return (
    <CustomerPortalContainer>
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Household</h2>
      <Card>
        <CardHeader><CardTitle>{household?.householdName ?? "No Household Found"}</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {household ? (
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
              <div className="flex items-start gap-4">
                <HouseholdAvatar household={household} size="lg" />
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={household.householdStatus === "archived" ? "danger" : household.householdStatus === "inactive" ? "warning" : "success"}>
                      {household.householdStatus ?? "active"}
                    </Badge>
                    <Badge tone={householdHealth === "critical" ? "danger" : householdHealth === "needs_attention" ? "warning" : "success"}>
                      {getHouseholdHealthLabel(householdHealth)}
                    </Badge>
                  </div>
                  <p><span className="text-muted-foreground">Primary account holder:</span> {primaryAccountHolder ? `${primaryAccountHolder.customer.firstName} ${primaryAccountHolder.customer.lastName}` : "Not set"}</p>
                  <p><span className="text-muted-foreground">Preferred communication:</span> {household.preferredCommunicationMethod ?? "email"}</p>
                  <p><span className="text-muted-foreground">Address:</span> {household.defaultAddress ?? "Not set"}</p>
                  <p><span className="text-muted-foreground">Created:</span> {formatDate(household.createdAt)}</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <MetricCard label="Household members" value={String(memberRows.length)} />
                <MetricCard label="Active memberships" value={String(memberRows.filter((row) => row.access?.status === "active").length)} />
                <MetricCard label="Upcoming programs" value={String(memberRows.reduce((sum, row) => sum + row.upcomingProgramTitles.length, 0))} />
                <MetricCard label="Current waivers" value={String(memberRows.filter((row) => row.waiver?.status === "valid").length)} />
                <MetricCard label="Outstanding balance" value={formatCurrency(outstandingBalance)} />
                <MetricCard label="Recent visits" value={String(householdMetrics.totalVisitsThisMonth)} />
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Most active member" value={householdMetrics.mostActive ? `${householdMetrics.mostActive.name} (${householdMetrics.mostActive.visits})` : "No visits yet"} />
            <MetricCard label="Total visits this month" value={String(householdMetrics.totalVisitsThisMonth)} />
            <MetricCard label="Total programs attended" value={String(householdMetrics.totalProgramsAttended)} />
            <MetricCard label="Household spending this year" value={formatCurrency(householdMetrics.spendingThisYear)} />
          </div>
          <div className="rounded-md border bg-secondary/20 p-3">
            <p className="font-medium">Household health</p>
            <p className="text-sm text-muted-foreground">
              {getHouseholdHealthLabel(householdHealth)}{healthReasons.length > 0 ? ` · ${healthReasons.join(" · ")}` : ""}
            </p>
          </div>
          <div className="rounded-md border bg-secondary/20 p-3">
            <p><span className="text-muted-foreground">Primary account holder:</span> {primaryAccountHolder ? `${primaryAccountHolder.customer.firstName} ${primaryAccountHolder.customer.lastName}` : "Not set"}</p>
            <p><span className="text-muted-foreground">Household members:</span> {memberRows.length}</p>
          </div>
          {memberRows.map((row) => (
            <div key={row.customer.id} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CustomerAvatar customer={row.customer} sizeClassName="h-10 w-10" />
                  <p className="font-medium">{row.customer.firstName} {row.customer.lastName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="muted">{formatHouseholdRole(row.member.role)}</Badge>
                  <Badge tone={row.access?.status === "active" ? "success" : row.access?.status === "expired" ? "danger" : "warning"}>
                    {row.access?.status === "active" ? "Membership Active" : row.access?.status === "expired" ? "Membership Expired" : "No Membership"}
                  </Badge>
                  <Badge tone={row.waiver?.status === "valid" ? "success" : row.waiver?.status === "expired" ? "danger" : "warning"}>
                    {row.waiver?.status === "valid" ? "Waiver Valid" : row.waiver?.status === "expired" ? "Waiver Expired" : "Waiver Missing"}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <p>Name: {row.customer.firstName} {row.customer.lastName}</p>
                <p>Age: {row.age ?? "Unknown"}</p>
                <p>Relationship: {formatHouseholdRelationship(row.member.relationship)}</p>
                <p>Membership status: {row.access?.status ?? "none"}</p>
                <p>Waiver status: {row.waiver?.status ?? "missing"}</p>
                <p>Upcoming programs: {row.upcomingProgramTitles.length ? row.upcomingProgramTitles.join(", ") : "None"}</p>
                <p>Recent visits: {row.recentVisits.length}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/p/${orgSlug}/account/dashboard`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm">View member profile</Link>
                <Link href={`/p/${orgSlug}/waivers`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm">Sign waiver</Link>
                <Link href={`/p/${orgSlug}/programs`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm">Register for program</Link>
                <Link href={`/p/${orgSlug}/memberships`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm">Purchase membership</Link>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="h-9">Add household member (Soon)</Button>
            <Button variant="secondary" className="h-9">Remove household member (Soon)</Button>
            <Button variant="secondary" className="h-9">Invite guardian (Soon)</Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Membership Coverage</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {activeMembershipRows.length === 0 ? <p className="text-muted-foreground">No memberships attached to this household.</p> : null}
                {activeMembershipRows.map((row) => (
                  <div key={row.customer.id} className="rounded-md border p-3">
                    <p className="font-medium">{row.customer.firstName} {row.customer.lastName}</p>
                    <p className="text-muted-foreground">
                      {row.access?.type === "household-membership" ? "Household membership" : "Individual membership"} · {row.access?.status ?? "No status"}
                    </p>
                    <p className="text-muted-foreground">
                      Renewal {row.access?.expirationDate ? formatDate(row.access.expirationDate) : "Not set"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Waiver Dashboard</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {memberRows.map((row) => (
                  <div key={row.customer.id} className="rounded-md border p-3">
                    <p className="font-medium">{row.customer.firstName} {row.customer.lastName}</p>
                    <p className="text-muted-foreground">
                      {row.waiver?.status ? row.waiver.status.replaceAll("_", " ") : "missing"}{row.waiver?.expiresAt ? ` · Expires ${formatDate(row.waiver.expiresAt)}` : ""}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Upcoming Programs</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {memberRows.every((row) => row.upcomingProgramTitles.length === 0) ? <p className="text-muted-foreground">No upcoming programs for this household.</p> : null}
              {memberRows.map((row) => (
                <div key={row.customer.id} className="rounded-md border p-3">
                  <p className="font-medium">{row.customer.firstName} {row.customer.lastName}</p>
                  <p className="text-muted-foreground">{row.upcomingProgramTitles.length ? row.upcomingProgramTitles.join(", ") : "No upcoming programs"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Purchases</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {recentPurchases.length === 0 ? <p className="text-muted-foreground">No household purchases yet.</p> : null}
              {recentPurchases.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <p className="font-medium">{entry.receiptNumber}</p>
                  <p className="text-muted-foreground">{formatDateTime(entry.completedAt)} · {formatCurrency(entry.total)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Household Activity</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {recentActivity.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <p className="font-medium">{entry.title}</p>
                  <p className="text-muted-foreground">{formatDateTime(entry.occurredAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">Guardians only see members in their own household.</p>
        </CardContent>
      </Card>
    </section>
    </CustomerPortalContainer>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
