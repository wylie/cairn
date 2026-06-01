"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";

export default function CustomerPortalVisitsPage() {
  const { visibleCustomerIds, checkInRecords } = useCustomerPortalData();
  const visits = checkInRecords.filter((entry) => visibleCustomerIds.includes(entry.customerId)).sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));

  return (
    <CustomerPortalContainer>
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Visit History</h2>
      <Card>
        <CardHeader><CardTitle>Visits</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {visits.length === 0 ? <p className="text-muted-foreground">No visits yet.</p> : null}
          {visits.map((visit) => {
            return (
              <div key={visit.id} className="rounded-md border p-3">
                <p>Date: {new Date(visit.checkInTime).toLocaleDateString("en-US")}</p>
                <p>Check-In: {new Date(visit.checkInTime).toLocaleTimeString("en-US")}</p>
                <p>Check-Out: {visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleTimeString("en-US") : "In progress"}</p>
                <p>Location: {visit.locationId}</p>
                <p>Programs Attended: {visit.entryMethod === "class_registration" || visit.entryMethod === "camp_registration" ? visit.membershipPassType : "General facility visit"}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
    </CustomerPortalContainer>
  );
}
