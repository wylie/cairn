"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { canCustomerViewReceipt } from "@/lib/portal/receipts";
import { formatDateTime } from "@/lib/format/date";
import { getLocationName } from "@/lib/public-programs";
import { formatCurrency } from "@/lib/transactions";

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CustomerPortalMembershipDetailPage() {
  const params = useParams<{ orgSlug: string; membershipId: string }>();
  const orgSlug = params?.orgSlug ?? "summit";
  const membershipId = params?.membershipId ?? "";
  const {
    memberships,
    customerAccessRecords,
    accessProducts,
    customers,
    visibleCustomerIds,
    householdMembers,
    transactions,
    registrations,
    sessions,
    programs,
    punchPasses
  } = useCustomerPortalData();

  const membership = memberships.find((entry) => entry.id === membershipId);
  const accessRecord = customerAccessRecords.find(
    (entry) => entry.id === membershipId || (membership ? entry.customerId === membership.customerId && entry.type === "membership" : false)
  );

  const customerId = membership?.customerId ?? accessRecord?.customerId;
  const customer = customers.find((entry) => entry.id === customerId);
  if (!customerId || !visibleCustomerIds.includes(customerId) || !customer) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Membership not available</h2>
        <p className="text-sm text-muted-foreground">This membership is not visible for your account.</p>
        <Link className="text-sm underline" href={`/p/${orgSlug}/memberships`}>Back to Memberships</Link>
      </section>
    );
  }

  const product = accessProducts.find((entry) => entry.id === accessRecord?.productId);
  const startDate = toDate(membership?.startDate ?? accessRecord?.startDate ?? membership?.purchaseDate);
  const expirationDate = toDate(membership?.expirationDate ?? accessRecord?.expirationDate ?? membership?.renewalDate);
  const today = new Date();
  const totalDays = startDate && expirationDate ? Math.max(1, daysBetween(startDate, expirationDate)) : null;
  const remainingDays = expirationDate ? daysBetween(today, expirationDate) : null;
  const elapsedDays = totalDays && remainingDays !== null ? Math.max(0, totalDays - Math.max(remainingDays, 0)) : null;
  const progressPercent = totalDays && elapsedDays !== null ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100)) : 0;
  const renewalDate = membership?.renewalDate ?? membership?.expirationDate ?? accessRecord?.expirationDate;
  const autoRenew = product?.expirationBehavior === "monthly" && !["cancelled", "expired", "suspended"].includes(membership?.status ?? accessRecord?.status ?? "");
  const billingFrequency =
    product?.expirationBehavior === "monthly"
      ? "Monthly"
      : product?.expirationBehavior === "rolling_30_days"
      ? "Every 30 days"
      : product?.expirationBehavior === "fixed_date"
      ? "Fixed term"
      : "One-time";
  const upcomingPayment = autoRenew ? formatCurrency((product?.priceCents ?? 0) / 100) : "—";
  const householdMembership = householdMembers.find((entry) => entry.customerId === customerId);
  const associatedMembers = householdMembership
    ? householdMembers
        .filter((entry) => entry.householdId === householdMembership.householdId)
        .map((entry) => customers.find((row) => row.id === entry.customerId))
        .filter(Boolean)
    : [customer];
  const includedLocations = accessRecord?.locationsAllowed?.map((id) => getLocationName(id)) ?? ["All locations"];
  const includedPrograms = useMemo(() => {
    const relatedRegs = registrations
      .filter((entry) => entry.customerId === customerId && ["confirmed", "waitlisted", "checked_in", "attended", "completed"].includes(entry.status))
      .slice(0, 8);
    const labels = relatedRegs
      .map((entry) => {
        const session = sessions.find((s) => s.id === entry.sessionId);
        const program = session ? programs.find((p) => p.id === session.programId) : undefined;
        return program?.title;
      })
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(labels));
  }, [customerId, registrations, sessions, programs]);

  const relatedReceipts = transactions
    .filter((entry) => canCustomerViewReceipt(entry, visibleCustomerIds))
    .filter(
      (entry) =>
        entry.customerId === customerId ||
        entry.purchaserCustomerId === customerId ||
        (entry.purchasedForCustomerIds ?? []).includes(customerId)
    )
    .filter(
      (entry) =>
        entry.items.some(
          (item) =>
            item.type === "membership" ||
            item.category === "memberships" ||
            (accessRecord?.productId ? item.productId === accessRecord.productId : false)
        ) ||
        entry.transactionType === "return"
    )
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 12);

  const relatedPunchPass = customer.punchPassId ? punchPasses.find((entry) => entry.id === customer.punchPassId) : undefined;
  const status = membership?.status ?? accessRecord?.status ?? "inactive";

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">{product?.name ?? membership?.planName ?? "Membership"}</h2>
        <p className="text-sm text-muted-foreground">Member: {customer.firstName} {customer.lastName}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Membership Overview</span>
            <Badge tone={status === "active" ? "success" : status === "frozen" || status === "expiring" ? "warning" : "danger"}>{status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <p><span className="text-muted-foreground">Start date:</span> {membership?.startDate ?? accessRecord?.startDate ?? "Not set"}</p>
            <p><span className="text-muted-foreground">Expiration date:</span> {membership?.expirationDate ?? accessRecord?.expirationDate ?? "Not set"}</p>
            <p><span className="text-muted-foreground">Auto-renew:</span> {autoRenew ? "On" : "Off"}</p>
            <p><span className="text-muted-foreground">Billing frequency:</span> {billingFrequency}</p>
            <p><span className="text-muted-foreground">Next renewal date:</span> {renewalDate ?? "Not scheduled"}</p>
            <p><span className="text-muted-foreground">Upcoming payment:</span> {upcomingPayment}</p>
            <p><span className="text-muted-foreground">Days remaining:</span> {remainingDays !== null ? Math.max(0, remainingDays) : "—"}</p>
            <p><span className="text-muted-foreground">Remaining punches:</span> {relatedPunchPass ? relatedPunchPass.remainingUses : "N/A"}</p>
          </div>

          {totalDays ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Time remaining</span>
                <span>{Math.round(100 - progressPercent)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-sky-500 transition-all" style={{ width: `${Math.max(0, 100 - progressPercent)}%` }} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Coverage</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="mb-1 font-medium">Associated household members</p>
            <ul className="space-y-1 text-muted-foreground">
              {associatedMembers.map((entry) => (
                <li key={entry!.id}>{entry!.firstName} {entry!.lastName}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium">Included locations</p>
            <ul className="space-y-1 text-muted-foreground">
              {includedLocations.map((entry) => <li key={entry}>{entry}</li>)}
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 font-medium">Included programs</p>
            <ul className="space-y-1 text-muted-foreground">
              {includedPrograms.length === 0 ? <li>No specific programs included</li> : includedPrograms.map((entry) => <li key={entry}>{entry}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Related Receipts</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {relatedReceipts.length === 0 ? <p className="text-muted-foreground">No related receipts yet.</p> : null}
          {relatedReceipts.map((receipt) => (
            <div key={receipt.id} className="rounded-md border p-3">
              <p className="font-medium">{receipt.receiptNumber}</p>
              <p className="text-muted-foreground">{formatDateTime(receipt.completedAt)}</p>
              <p>{receipt.items.map((item) => item.productName).join(", ")}</p>
              <p>Total: {formatCurrency(receipt.total)}</p>
              <Link href={`/p/${orgSlug}/purchases/${receipt.id}`} className="mt-2 inline-flex h-8 items-center rounded-md border px-3 text-xs">
                View Receipt
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary">View billing history</Button>
        <Button variant="secondary">Download agreement (Soon)</Button>
        <Button variant="secondary">Freeze membership (Soon)</Button>
        <Button variant="secondary">Cancel membership (Soon)</Button>
      </div>

      <Link href={`/p/${orgSlug}/memberships`} className="inline-flex text-sm underline">Back to Memberships</Link>
    </section>
  );
}
