"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformAdminState } from "@/lib/state/platform-admin-state";
import {
  readIntegrationConnectionsClient,
  readIntegrationAuditEventsClient,
  readWebhookDeliveriesClient
} from "@/lib/integrations/storage";

export default function AdminIntegrationsPage() {
  const { organizations } = usePlatformAdminState();

  const rows = useMemo(
    () =>
      organizations.map((organization) => {
        const connections = readIntegrationConnectionsClient(organization.id);
        const audit = readIntegrationAuditEventsClient(organization.id);
        const deliveries = readWebhookDeliveriesClient(organization.id);
        return {
          organization,
          enabled: connections.filter((entry) => entry.status === "enabled").length,
          warnings: connections.filter((entry) => entry.health === "warning" || entry.health === "offline").length,
          lastActivityAt:
            [...connections.map((entry) => entry.lastActivityAt).filter(Boolean), ...deliveries.map((entry) => entry.createdAt)]
              .sort()
              .at(-1) ?? null,
          auditCount: audit.length
        };
      }),
    [organizations]
  );

  return (
    <section className="space-y-4">
      <PageHeader title="Integrations" description="Platform-wide view of organization integration readiness, health placeholders, webhook activity, and API adoption groundwork." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Organizations</p><p className="mt-2 text-2xl font-semibold">{rows.length}</p></article>
        <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Enabled Connections</p><p className="mt-2 text-2xl font-semibold">{rows.reduce((sum, row) => sum + row.enabled, 0)}</p></article>
        <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Warnings</p><p className="mt-2 text-2xl font-semibold">{rows.reduce((sum, row) => sum + row.warnings, 0)}</p></article>
        <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Audit Events</p><p className="mt-2 text-2xl font-semibold">{rows.reduce((sum, row) => sum + row.auditCount, 0)}</p></article>
      </div>

      <Card>
        <CardHeader><CardTitle>Organization Integration Health</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <article key={row.organization.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.organization.name}</p>
                  <p className="text-sm text-muted-foreground">/{row.organization.slug} • {row.organization.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={row.enabled > 0 ? "success" : "muted"}>{row.enabled} enabled</Badge>
                  <Badge tone={row.warnings > 0 ? "warning" : "muted"}>{row.warnings} warnings</Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Activity</p>
                  <p className="mt-1">{row.lastActivityAt ?? "No activity yet"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audit Events</p>
                  <p className="mt-1">{row.auditCount}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</p>
                  <p className="mt-1">Organization-managed settings, platform-visible health</p>
                </div>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
