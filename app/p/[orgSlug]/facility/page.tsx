"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsState } from "@/lib/state/settings-state";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";

export default function CustomerPortalFacilityPage() {
  const { settings } = useSettingsState();
  const locations = settings.locations;
  return (
    <CustomerPortalContainer>
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Facility Information</h2>
      <Card>
        <CardHeader><CardTitle>{settings.facilityProfile.facilityName}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Email: {settings.facilityProfile.email}</p>
          <p>Phone: {settings.facilityProfile.phone}</p>
          <p>Website: {settings.facilityProfile.website}</p>
          <p>Address: {settings.facilityProfile.addressLine1}</p>
          <p>Hours: Placeholder</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Locations</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {locations.map((location) => (
            <div key={location.id} className="rounded-md border p-3">
              <p className="font-medium">{location.name}</p>
              <p>{location.addressLine1}</p>
              <p>{location.city}, {location.state} {location.postalCode}</p>
              <p>{location.phone}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
    </CustomerPortalContainer>
  );
}
