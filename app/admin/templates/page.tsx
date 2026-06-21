"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformAdminState } from "@/lib/state/platform-admin-state";

export default function AdminTemplatesPage() {
  const { templates } = usePlatformAdminState();

  return (
    <section className="space-y-4">
      <PageHeader title="Facility Templates" description="Starter facility presets for roles, products, waivers, dashboard widgets, reports, and settings." />
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{template.description}</p>
              <p><span className="font-medium">Facility type:</span> {template.facilityType}</p>
              <p><span className="font-medium">Starter products:</span> {template.starterProducts.join(", ")}</p>
              <p><span className="font-medium">Starter waivers:</span> {template.starterWaivers.join(", ")}</p>
              <p><span className="font-medium">Dashboard widgets:</span> {template.dashboardWidgets.join(", ")}</p>
              <p><span className="font-medium">Reports:</span> {template.reports.join(", ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
