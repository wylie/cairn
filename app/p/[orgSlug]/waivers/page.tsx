"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";

export default function CustomerPortalWaiversPage() {
  const { visibleCustomerIds, waivers, signedWaiverRecords } = useCustomerPortalData();
  const visibleWaivers = waivers.filter((entry) => visibleCustomerIds.includes(entry.customerId));
  const visibleSigned = signedWaiverRecords.filter((entry) => visibleCustomerIds.includes(entry.customerId));

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Waivers</h2>
      <Card>
        <CardHeader><CardTitle>Required Waivers</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {visibleWaivers.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{entry.templateName ?? "General Facility Waiver"}</p>
              <p>Status: {entry.status}</p>
              <p>Expires: {entry.expiresAt ?? "No expiration"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" className="h-9">View Signed Copy</Button>
                <Button className="h-9">Sign Waiver</Button>
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
              <p>Signed: {entry.signedAt ? new Date(entry.signedAt).toLocaleString("en-US") : "Unknown"}</p>
              <p>Status: {entry.status}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
