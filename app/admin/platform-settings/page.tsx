"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformAdminState } from "@/lib/state/platform-admin-state";

export default function AdminPlatformSettingsPage() {
  const { platformSettings } = usePlatformAdminState();

  return (
    <section className="space-y-4">
      <PageHeader title="Platform Settings" description="Platform-wide defaults for trials, support, demos, and future white-label capabilities." />
      <Card>
        <CardHeader><CardTitle>Control Plane Defaults</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Support Email</p>
            <p className="font-medium">{platformSettings.supportEmail}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Default Trial Days</p>
            <p className="font-medium">{platformSettings.defaultTrialDays}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Allow Demo Resets</p>
            <p className="font-medium">{platformSettings.allowDemoResets ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Allow Custom Domains</p>
            <p className="font-medium">{platformSettings.allowCustomDomains ? "Enabled" : "Not Yet Enabled"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">White Labeling</p>
            <p className="font-medium">{platformSettings.whiteLabelReady ? "Ready" : "Future Roadmap"}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
