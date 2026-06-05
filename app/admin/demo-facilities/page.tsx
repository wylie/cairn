"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformAdminState } from "@/lib/state/platform-admin-state";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DemoFacilitiesPage() {
  const { demoFacilities, resetDemoFacility } = usePlatformAdminState();

  return (
    <section className="space-y-4">
      <PageHeader title="Demo Facilities" description="Platform-managed demo organizations used for walkthroughs, testing, and repeatable environment resets." />
      <div className="grid gap-4 lg:grid-cols-2">
        {demoFacilities.map((facility) => (
          <Card key={facility.id}>
            <CardHeader>
              <CardTitle>{facility.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border px-2 py-0.5 text-xs">Demo Only</span>
                {facility.isReadOnlyDemo ? <span className="rounded-full border px-2 py-0.5 text-xs">Read Only</span> : null}
                {facility.isResettableDemo ? <span className="rounded-full border px-2 py-0.5 text-xs">Resettable</span> : null}
              </div>
              <p><span className="font-medium">Status:</span> {titleCase(facility.status)}</p>
              <p><span className="font-medium">Template:</span> {facility.templateId}</p>
              <p><span className="font-medium">Routes:</span> {facility.generatedAssets.facilityLandingPage}, {facility.generatedAssets.customerPortal}, {facility.generatedAssets.staffPortal}</p>
              <Button variant="outline" onClick={() => resetDemoFacility(facility.slug)}>
                Reset Demo
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
