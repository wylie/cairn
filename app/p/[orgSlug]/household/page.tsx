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

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Household</h2>
      <Card>
        <CardHeader><CardTitle>{household?.householdName ?? "No Household Found"}</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Most active member" value={householdMetrics.mostActive ? `${householdMetrics.mostActive.name} (${householdMetrics.mostActive.visits})` : "No visits yet"} />
            <MetricCard label="Total visits this month" value={String(householdMetrics.totalVisitsThisMonth)} />
            <MetricCard label="Total programs attended" value={String(householdMetrics.totalProgramsAttended)} />
            <MetricCard label="Household spending this year" value={formatCurrency(householdMetrics.spendingThisYear)} />
          </div>
          <div className="rounded-md border bg-secondary/20 p-3">
            <p><span className="text-muted-foreground">Primary account holder:</span> {primaryAccountHolder ? `${primaryAccountHolder.customer.firstName} ${primaryAccountHolder.customer.lastName}` : "Not set"}</p>
            <p><span className="text-muted-foreground">Household members:</span> {memberRows.length}</p>
          </div>
          {memberRows.map((row) => (
            <div key={row.customer.id} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{row.customer.firstName} {row.customer.lastName}</p>
                <div className="flex flex-wrap gap-2">
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
          <p className="text-xs text-muted-foreground">Guardians only see members in their own household.</p>
        </CardContent>
      </Card>
    </section>
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
