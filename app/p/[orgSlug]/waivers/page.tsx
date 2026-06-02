"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format/date";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";

export default function CustomerPortalWaiversPage() {
  const pathname = usePathname() ?? "";
  const orgSlug = pathname.split("/").filter(Boolean)[1] ?? "summit";
  const {
    visibleCustomerIds,
    visibleCustomers,
    waivers,
    signedWaiverRecords,
    waiverTemplates,
    getWaiverStatusForCustomer
  } = useCustomerPortalData();
  const visibleWaivers = waivers.filter((entry) => visibleCustomerIds.includes(entry.customerId));
  const visibleSigned = signedWaiverRecords.filter((entry) => visibleCustomerIds.includes(entry.customerId));
  const requiredRows = visibleCustomers.flatMap((customer) =>
    waiverTemplates
      .filter((template) => template.active && !template.archived)
      .map((template) => {
        const status = getWaiverStatusForCustomer(customer.id, template.id);
        const record = visibleWaivers.find((entry) => entry.customerId === customer.id && entry.templateId === template.id);
        return { customer, template, status, record };
      })
  );

  return (
    <CustomerPortalContainer>
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Waivers</h2>
      <Card>
        <CardHeader><CardTitle>Required Waivers</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requiredRows.map((row) => (
            <div key={`${row.customer.id}-${row.template.id}`} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{row.template.name}</p>
              <p className="text-xs text-muted-foreground">For: {row.customer.firstName} {row.customer.lastName}</p>
              <p>Status: {row.status === "expiring_soon" ? "Expiring Soon" : row.status === "outdated_version" ? "Outdated Version" : row.status === "missing" ? "Missing" : row.status === "expired" ? "Expired" : "Valid"}</p>
              <p>Expires: {row.record?.expiresAt ?? "No expiration"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm" href={`/p/${orgSlug}/waivers/${row.template.id}?customerId=${row.customer.id}`}>View</Link>
                <Link className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground" href={`/p/${orgSlug}/waivers/${row.template.id}?customerId=${row.customer.id}`}>
                  {row.status === "valid" ? "Re-sign" : "Sign"}
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Signed Records</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {visibleSigned.length === 0 ? <p className="text-muted-foreground">No signed records yet.</p> : null}
          {visibleSigned.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3">
              <p className="font-medium">{entry.templateName} v{entry.templateVersion}</p>
              <p>Signed: {entry.signedAt ? formatDateTime(entry.signedAt) : "Unknown"}</p>
              <p>Status: {entry.status}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
    </CustomerPortalContainer>
  );
}
