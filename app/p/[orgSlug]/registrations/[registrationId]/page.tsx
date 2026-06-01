"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canCustomerViewReceipt } from "@/lib/portal/receipts";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { getLocationName } from "@/lib/public-programs";
import { formatCurrency } from "@/lib/transactions";

export default function CustomerPortalRegistrationDetailPage() {
  const { orgSlug, registrationId } = useParams<{ orgSlug: string; registrationId: string }>();
  const {
    registrations,
    sessions,
    programs,
    visibleCustomerIds,
    customers,
    householdMembers,
    waivers,
    checkInRecords,
    transactions
  } = useCustomerPortalData();

  const registration = registrations.find((entry) => entry.id === registrationId);
  if (!registration || !visibleCustomerIds.includes(registration.customerId)) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Registration not available</h2>
        <p className="text-sm text-muted-foreground">This registration is not visible for your account.</p>
        <Link className="text-sm underline" href={`/p/${orgSlug}/registrations`}>Back to Registrations</Link>
      </section>
    );
  }

  const customer = customers.find((entry) => entry.id === registration.customerId);
  const session = sessions.find((entry) => entry.id === registration.sessionId);
  const program = session ? programs.find((entry) => entry.id === session.programId) : undefined;
  const householdMembership = householdMembers.find((entry) => entry.customerId === registration.customerId);
  const householdRows = householdMembership
    ? householdMembers
        .filter((entry) => entry.householdId === householdMembership.householdId && visibleCustomerIds.includes(entry.customerId))
        .map((entry) => customers.find((row) => row.id === entry.customerId))
        .filter(Boolean)
    : [];
  const waiver = waivers.find((entry) => entry.customerId === registration.customerId);

  const now = new Date();
  const allProgramSessions = session
    ? sessions
        .filter((entry) => entry.programId === session.programId)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    : [];
  const nextSession = allProgramSessions.find((entry) => new Date(entry.startsAt) >= now);
  const remainingSessions = allProgramSessions.filter((entry) => new Date(entry.startsAt) >= now);

  const attendanceHistory = allProgramSessions.map((entry) => {
    const checkin = checkInRecords.find((record) => record.customerId === registration.customerId && record.checkInTime.slice(0, 10) === entry.startsAt.slice(0, 10));
    const reg = registrations.find((row) => row.customerId === registration.customerId && row.sessionId === entry.id);
    return {
      session: entry,
      status: reg?.status ?? (checkin ? "checked_in" : "absent"),
      checkedInAt: checkin?.checkInTime
    };
  });

  const relatedReceipts = transactions
    .filter((entry) => canCustomerViewReceipt(entry, visibleCustomerIds))
    .filter(
      (entry) =>
        entry.customerId === registration.customerId ||
        entry.purchaserCustomerId === registration.customerId ||
        (entry.purchasedForCustomerIds ?? []).includes(registration.customerId)
    )
    .filter(
      (entry) =>
        entry.items.some((item) => {
          const name = item.productName.toLowerCase();
          return (
            item.type === "class" ||
            item.type === "camp" ||
            item.type === "registration" ||
            name.includes((program?.title ?? "").toLowerCase()) ||
            name.includes((session?.title ?? "").toLowerCase())
          );
        })
    );

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">{program?.title ?? session?.title ?? "Registration"}</h2>
        <p className="text-sm text-muted-foreground">Registration ID: {registration.id}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Registration Details</span>
            <Badge tone={registration.status === "confirmed" ? "success" : registration.status === "waitlisted" ? "warning" : "muted"}>
              {registration.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p><span className="text-muted-foreground">Program:</span> {program?.title ?? "Not set"}</p>
          <p><span className="text-muted-foreground">Instructor:</span> {session?.instructorName ?? "TBD"}</p>
          <p><span className="text-muted-foreground">Location:</span> {getLocationName(session?.locationId)}</p>
          <p><span className="text-muted-foreground">Schedule:</span> {session?.startsAt ? new Date(session.startsAt).toLocaleString("en-US") : "No schedule"}</p>
          <p><span className="text-muted-foreground">Waitlist status:</span> {registration.status === "waitlisted" ? `Position ${registration.waitlistPosition ?? "TBD"}` : "Not waitlisted"}</p>
          <p><span className="text-muted-foreground">Waiver status:</span> {waiver?.status ?? "missing"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upcoming</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Next session:</span> {nextSession ? new Date(nextSession.startsAt).toLocaleString("en-US") : "No upcoming session"}</p>
          <p><span className="text-muted-foreground">Remaining sessions:</span> {remainingSessions.length}</p>
          <div className="rounded-md border p-3">
            <p className="font-medium">Calendar view</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {remainingSessions.slice(0, 6).map((entry) => (
                <li key={entry.id}>{new Date(entry.startsAt).toLocaleDateString("en-US")} · {entry.title ?? program?.title}</li>
              ))}
              {remainingSessions.length === 0 ? <li>No remaining sessions</li> : null}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Completed</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Completion status:</span> {attendanceHistory.some((row) => row.status === "completed" || row.status === "attended") ? "In progress / completed sessions recorded" : "Not completed"}</p>
          <div className="space-y-2">
            {attendanceHistory.map((row) => (
              <div key={row.session.id} className="rounded-md border p-2">
                <p className="font-medium">{row.session.title ?? program?.title}</p>
                <p className="text-muted-foreground">{new Date(row.session.startsAt).toLocaleString("en-US")}</p>
                <p>Status: {row.status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Household + Waiver + Receipts</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="text-muted-foreground">Registered member:</span> {customer ? `${customer.firstName} ${customer.lastName}` : registration.customerId}</p>
          <p><span className="text-muted-foreground">Household members:</span> {householdRows.length ? householdRows.map((entry) => `${entry!.firstName} ${entry!.lastName}`).join(", ") : "None"}</p>
          <p><span className="text-muted-foreground">Active waiver:</span> {waiver?.templateName ?? "No waiver on file"} ({waiver?.status ?? "missing"})</p>
          <div className="space-y-2">
            <p className="font-medium">Related receipts</p>
            {relatedReceipts.length === 0 ? <p className="text-muted-foreground">No related receipt found.</p> : null}
            {relatedReceipts.map((entry) => (
              <div key={entry.id} className="rounded-md border p-2">
                <p className="font-medium">{entry.receiptNumber}</p>
                <p>{new Date(entry.completedAt).toLocaleString("en-US")} · {formatCurrency(entry.total)}</p>
                <Link href={`/p/${orgSlug}/purchases/${entry.id}`} className="inline-flex h-8 items-center rounded-md border px-3 text-xs">
                  View receipt
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary">Add to calendar (Soon)</Button>
        <Button variant="secondary">Request cancellation (Soon)</Button>
      </div>

      <Link href={`/p/${orgSlug}/registrations`} className="inline-flex text-sm underline">Back to Registrations</Link>
    </section>
  );
}

