"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { PermissionGate } from "@/components/staff/permission-gate";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_FOUNDATION_SPEC, WEBHOOK_EVENT_TYPES } from "@/lib/integrations/catalog";
import {
  readIntegrationAuditEventsClient,
  readIntegrationConnectionsClient,
  readWebhookDeliveriesClient,
  readWebhookEndpointsClient,
  writeIntegrationAuditEventsClient,
  writeIntegrationConnectionsClient,
  writeWebhookDeliveriesClient,
  writeWebhookEndpointsClient
} from "@/lib/integrations/storage";
import { buildWebhookAuditEvents, buildWebhookPayload, generateWebhookDeliveries } from "@/lib/integrations/webhooks";
import { accountingProvider, calendarProvider, emailProvider, identityProvider, paymentProvider, smsProvider } from "@/lib/integrations/providers";
import { formatDateTime } from "@/lib/format/date";
import { resolveTenant } from "@/lib/tenant/resolve";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type {
  IntegrationAuditEvent,
  IntegrationCategory,
  IntegrationConnectionRecord,
  IntegrationProviderResult,
  WebhookDeliveryRecord,
  WebhookEndpoint,
  WebhookEventType
} from "@/types/domain";

const CATEGORY_LABELS: Array<{ value: "all" | IntegrationCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "calendar", label: "Calendar" },
  { value: "communication", label: "Communication" },
  { value: "payment", label: "Payment" },
  { value: "accounting", label: "Accounting" },
  { value: "identity", label: "Identity" },
  { value: "scheduling", label: "Scheduling" },
  { value: "marketing", label: "Marketing" },
  { value: "crm", label: "CRM" }
];

function toneForHealth(health: IntegrationConnectionRecord["health"]) {
  if (health === "healthy") return "success" as const;
  if (health === "warning") return "warning" as const;
  if (health === "offline") return "danger" as const;
  return "muted" as const;
}

function toneForStatus(status: IntegrationConnectionRecord["status"]) {
  return status === "enabled" ? ("success" as const) : ("muted" as const);
}

function renderProviderBoundaries(results: IntegrationProviderResult[]) {
  return results.map((entry) => `${entry.provider}: ${entry.message}`).join(" • ");
}

export default function IntegrationsPage() {
  const pathname = usePathname() ?? "";
  const orgSlug = pathname.match(/^\/o\/([^/]+)/)?.[1] ?? "summit";
  const tenant = useMemo(() => resolveTenant(orgSlug), [orgSlug]);
  const organizationId = tenant?.organizationId ?? "org_summit";
  const organizationName = tenant?.organizationName ?? "Summit Rec Collective";
  const { activeStaff, logAuditEvent } = useWorkstationState();
  const [connections, setConnections] = useState<IntegrationConnectionRecord[]>([]);
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDeliveryRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<IntegrationAuditEvent[]>([]);
  const [category, setCategory] = useState<"all" | IntegrationCategory>("all");
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventType>("customer.created");
  const [feedback, setFeedback] = useState("");
  const [providerPreview, setProviderPreview] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConnections(readIntegrationConnectionsClient(organizationId));
    setWebhookEndpoints(readWebhookEndpointsClient(organizationId));
    setWebhookDeliveries(readWebhookDeliveriesClient(organizationId));
    setAuditEvents(readIntegrationAuditEventsClient(organizationId));
    setHydrated(true);
  }, [organizationId]);

  useEffect(() => {
    if (!hydrated) return;
    writeIntegrationConnectionsClient(organizationId, connections);
  }, [connections, hydrated, organizationId]);

  useEffect(() => {
    if (!hydrated) return;
    writeWebhookEndpointsClient(organizationId, webhookEndpoints);
  }, [webhookEndpoints, hydrated, organizationId]);

  useEffect(() => {
    if (!hydrated) return;
    writeWebhookDeliveriesClient(organizationId, webhookDeliveries);
  }, [webhookDeliveries, hydrated, organizationId]);

  useEffect(() => {
    if (!hydrated) return;
    writeIntegrationAuditEventsClient(organizationId, auditEvents);
  }, [auditEvents, hydrated, organizationId]);

  const filteredConnections = useMemo(
    () => connections.filter((entry) => category === "all" || entry.category === category),
    [category, connections]
  );

  const metrics = useMemo(() => {
    const enabled = connections.filter((entry) => entry.status === "enabled").length;
    const healthy = connections.filter((entry) => entry.health === "healthy").length;
    const attention = connections.filter((entry) => entry.health === "warning" || entry.health === "offline").length;
    const webhookFailures = webhookDeliveries.filter((entry) => entry.status === "failed").length;
    return { enabled, healthy, attention, webhookFailures };
  }, [connections, webhookDeliveries]);

  const toggleIntegration = (integrationId: string) => {
    const current = connections.find((entry) => entry.id === integrationId);
    if (!current) return;
    const nextStatus: IntegrationConnectionRecord["status"] = current.status === "enabled" ? "disabled" : "enabled";
    const now = new Date().toISOString();
    const updated: IntegrationConnectionRecord[] = connections.map((entry) =>
      entry.id === integrationId
        ? {
            ...entry,
            status: nextStatus,
            health: nextStatus === "enabled" ? ("healthy" as const) : ("unknown" as const),
            enabledAt: nextStatus === "enabled" ? now : entry.enabledAt,
            disabledAt: nextStatus === "disabled" ? now : undefined,
            updatedAt: now,
            updatedByStaffId: activeStaff?.id,
            updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Owner"
          }
        : entry
    );
    setConnections(updated);
    const auditEntry: IntegrationAuditEvent = {
      id: `intaudit_${Math.random().toString(36).slice(2, 10)}`,
      organizationId,
      integrationId: current.id,
      providerKey: current.providerKey,
      action: nextStatus === "enabled" ? "integration_enabled" : "integration_disabled",
      summary: `${current.name} ${nextStatus}.`,
      createdAt: now,
      createdByStaffId: activeStaff?.id,
      createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Owner"
    };
    setAuditEvents((prev) => [auditEntry, ...prev]);
    logAuditEvent({
      action: `integrations.${nextStatus}`,
      actorStaffId: activeStaff?.id ?? "system",
      actorStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Owner",
      targetType: "system",
      targetId: current.id,
      metadata: { provider: current.providerKey, category: current.category }
    });
    setFeedback(`${current.name} ${nextStatus}.`);
  };

  const toggleWebhookEndpoint = (endpointId: string) => {
    const now = new Date().toISOString();
    setWebhookEndpoints((prev) =>
      prev.map((entry) =>
        entry.id === endpointId
          ? {
              ...entry,
              enabled: !entry.enabled,
              health: !entry.enabled ? "healthy" : "unknown",
              updatedAt: now
            }
          : entry
      )
    );
    setAuditEvents((prev) => [
      {
        id: `intaudit_${Math.random().toString(36).slice(2, 10)}`,
        organizationId,
        action: "configuration_changed",
        summary: `Webhook endpoint ${endpointId} ${webhookEndpoints.find((entry) => entry.id === endpointId)?.enabled ? "disabled" : "enabled"}.`,
        createdAt: now,
        createdByStaffId: activeStaff?.id,
        createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Owner"
      },
      ...prev
    ]);
  };

  const sendTestWebhook = () => {
    const payload = buildWebhookPayload({
      organizationId,
      eventType: selectedEvent,
      resourceId: `preview_${selectedEvent.replaceAll(".", "_")}`,
      data: { organizationName, source: "integrations-workspace" }
    });
    const deliveries = generateWebhookDeliveries({
      organizationId,
      endpoints: webhookEndpoints,
      eventType: selectedEvent,
      payload
    });
    const webhookAudit = buildWebhookAuditEvents({
      deliveries,
      connections,
      createdByStaffId: activeStaff?.id,
      createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Owner"
    });
    setWebhookDeliveries((prev) => [...deliveries, ...prev].slice(0, 24));
    setAuditEvents((prev) => [
      {
        id: `intaudit_${Math.random().toString(36).slice(2, 10)}`,
        organizationId,
        action: "webhook_test_sent",
        summary: `Sent ${selectedEvent} test webhook to ${deliveries.length} endpoint(s).`,
        createdAt: new Date().toISOString(),
        createdByStaffId: activeStaff?.id,
        createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Owner"
      },
      ...webhookAudit,
      ...prev
    ]);
    setFeedback(deliveries.length > 0 ? `Generated ${deliveries.length} webhook delivery record(s).` : "No enabled webhook endpoints are subscribed to that event.");
  };

  const previewProviderBoundaries = async () => {
    const [calendarResult, emailResult, smsResult, paymentResult, identityResult, accountingResult] = await Promise.all([
      calendarProvider.createEvent({ title: "Session Update", startsAt: "2026-06-06T12:00:00Z", endsAt: "2026-06-06T13:00:00Z", locationName: "Summit Downtown" }),
      emailProvider.send({
        type: "email",
        subject: "Hello",
        body: "Test",
        recipients: [{ id: "recipient_email", type: "customer", label: "Demo Recipient", email: "demo@example.com" }],
        sender: { name: "Cairn", kind: "system" }
      }),
      smsProvider.send({
        type: "sms",
        subject: "",
        body: "Test",
        recipients: [{ id: "recipient_sms", type: "customer", label: "Demo Recipient", phone: "+12125550199" }],
        sender: { name: "Cairn", kind: "system" }
      }),
      paymentProvider.charge({ amountCents: 2500, method: "card", locationId: tenant?.currentLocationId ?? "loc_001", organizationId }),
      identityProvider.provisionAccount({ email: "owner@example.com", name: "Owner Admin", role: "owner" }),
      accountingProvider.exportInvoice({ invoiceNumber: "INV-1001", totalCents: 2500, customerName: "Maya Patel" })
    ]);
    setProviderPreview(renderProviderBoundaries([calendarResult, emailResult, smsResult, paymentResult, identityResult, accountingResult]));
  };

  return (
    <PermissionGate permission="managePlatformSettings">
      <section className="space-y-4" data-testid="integrations-workspace">
        <PageHeader title="Integrations" description="Manage integration categories, outbound webhooks, provider adapters, and the v1 public API foundation." />

        {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Enabled Integrations</p><p className="mt-2 text-2xl font-semibold">{metrics.enabled}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Healthy Connections</p><p className="mt-2 text-2xl font-semibold">{metrics.healthy}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Needs Attention</p><p className="mt-2 text-2xl font-semibold">{metrics.attention}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Webhook Failures</p><p className="mt-2 text-2xl font-semibold">{metrics.webhookFailures}</p></article>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="space-y-4 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Organization Integrations</h2>
                <p className="text-sm text-muted-foreground">Enable or disable provider placeholders for {organizationName}. Configuration, health, and activity are tracked per organization.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_LABELS.map((entry) => (
                  <Button key={entry.value} type="button" variant={category === entry.value ? "primary" : "secondary"} size="sm" onClick={() => setCategory(entry.value)}>
                    {entry.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredConnections.map((connection) => (
                <article key={connection.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{connection.name}</h3>
                        <Badge tone={toneForStatus(connection.status)}>{connection.status === "enabled" ? "Enabled" : "Disabled"}</Badge>
                        <Badge tone={toneForHealth(connection.health)}>{connection.health}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{connection.description}</p>
                    </div>
                    <Button type="button" variant={connection.status === "enabled" ? "destructiveSubtle" : "secondary"} onClick={() => toggleIntegration(connection.id)}>
                      {connection.status === "enabled" ? "Disable" : "Enable"}
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
                      <p className="mt-1 text-sm">{connection.category}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Configuration</p>
                      <p className="mt-1 text-sm">{connection.configurationSummary ?? "Configuration placeholder"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Health</p>
                      <p className="mt-1 text-sm">{connection.health}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Activity</p>
                      <p className="mt-1 text-sm">{connection.lastActivityAt ? formatDateTime(connection.lastActivityAt) : "No activity yet"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <div>
              <h2 className="text-lg font-semibold">Provider Abstractions</h2>
              <p className="text-sm text-muted-foreground">Calendar, communication, payment, identity, and accounting providers are mocked behind stable boundaries so external vendors can be swapped in later.</p>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="rounded-lg border p-3">calendarProvider.createEvent / updateEvent</div>
              <div className="rounded-lg border p-3">emailProvider.send</div>
              <div className="rounded-lg border p-3">smsProvider.send</div>
              <div className="rounded-lg border p-3">paymentProvider.charge / refund</div>
              <div className="rounded-lg border p-3">identityProvider.provisionAccount</div>
              <div className="rounded-lg border p-3">accountingProvider.exportInvoice</div>
            </div>
            <Button type="button" variant="secondary" onClick={previewProviderBoundaries}>Preview Provider Boundaries</Button>
            {providerPreview ? <p className="rounded-lg border bg-secondary/30 p-3 text-sm text-muted-foreground">{providerPreview}</p> : null}
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4 rounded-xl border bg-card p-4">
            <div>
              <h2 className="text-lg font-semibold">Webhook Framework</h2>
              <p className="text-sm text-muted-foreground">Outbound webhooks support customer, membership, waiver, registration, check-in, reservation, and invoice events.</p>
            </div>
            <div className="space-y-3">
              {webhookEndpoints.map((endpoint) => (
                <article key={endpoint.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{endpoint.label}</h3>
                      <p className="text-sm text-muted-foreground">{endpoint.url}</p>
                    </div>
                    <Button type="button" variant={endpoint.enabled ? "destructiveSubtle" : "secondary"} size="sm" onClick={() => toggleWebhookEndpoint(endpoint.id)}>
                      {endpoint.enabled ? "Disable" : "Enable"}
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Health</p>
                      <p className="mt-1 text-sm">{endpoint.health}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Activity</p>
                      <p className="mt-1 text-sm">{endpoint.lastActivityAt ? formatDateTime(endpoint.lastActivityAt) : "No deliveries yet"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {endpoint.subscribedEvents.map((eventType) => <Badge key={eventType} tone="muted">{eventType}</Badge>)}
                  </div>
                </article>
              ))}
            </div>
            <div className="rounded-xl border p-4">
              <label className="mb-2 block text-sm font-medium" htmlFor="webhook-event-select">Test Event</label>
              <select id="webhook-event-select" className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value as WebhookEventType)}>
                {WEBHOOK_EVENT_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
              </select>
              <div className="mt-3 flex gap-2">
                <Button type="button" onClick={sendTestWebhook}>Generate Webhook</Button>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <div>
              <h2 className="text-lg font-semibold">API Foundation</h2>
              <p className="text-sm text-muted-foreground">Versioned public API groundwork for integrations, exports, and third-party system sync.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Base Path</p><p className="mt-1 text-sm font-medium">{API_FOUNDATION_SPEC.basePath}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Version</p><p className="mt-1 text-sm font-medium">{API_FOUNDATION_SPEC.version}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Authentication</p><p className="mt-1 text-sm">{API_FOUNDATION_SPEC.authentication}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagination</p><p className="mt-1 text-sm">{API_FOUNDATION_SPEC.pagination}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtering</p><p className="mt-1 text-sm">{API_FOUNDATION_SPEC.filtering}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error Handling</p><p className="mt-1 text-sm">{API_FOUNDATION_SPEC.errorHandling}</p></div>
              <div className="rounded-lg border p-3 md:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rate Limiting</p><p className="mt-1 text-sm">{API_FOUNDATION_SPEC.rateLimiting}</p></div>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">v1 Event Coverage</p>
              <div className="mt-3 grid gap-2">
                {WEBHOOK_EVENT_TYPES.map((entry) => (
                  <div key={entry.value} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{entry.label}</p>
                    <p className="text-muted-foreground">{entry.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="text-lg font-semibold">Integration Audit Log</h2>
            <div className="space-y-2">
              {auditEvents.slice(0, 8).map((entry) => (
                <article key={entry.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{entry.summary}</p>
                    <Badge tone={entry.action === "webhook_failed" ? "danger" : "muted"}>{entry.action}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{formatDateTime(entry.createdAt)} • {entry.createdByStaffName ?? "System"}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="text-lg font-semibold">Recent Webhook Deliveries</h2>
            <div className="space-y-2">
              {webhookDeliveries.slice(0, 8).map((entry) => (
                <article key={entry.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{entry.eventType}</p>
                    <Badge tone={entry.status === "failed" ? "danger" : entry.status === "delivered" ? "success" : "muted"}>{entry.status}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">Endpoint: {entry.endpointId}</p>
                  <p className="text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </PermissionGate>
  );
}
