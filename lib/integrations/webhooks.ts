import type {
  IntegrationAuditEvent,
  IntegrationConnectionRecord,
  WebhookDeliveryRecord,
  WebhookEndpoint,
  WebhookEventType
} from "@/types/domain";

export function buildWebhookPayload(input: {
  organizationId: string;
  eventType: WebhookEventType;
  resourceId: string;
  occurredAt?: string;
  data?: Record<string, unknown>;
}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2, 10)}`,
    type: input.eventType,
    organizationId: input.organizationId,
    resourceId: input.resourceId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    data: input.data ?? {}
  };
}

export function generateWebhookDeliveries(input: {
  organizationId: string;
  endpoints: WebhookEndpoint[];
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
}) {
  return input.endpoints
    .filter((endpoint) => endpoint.enabled && endpoint.subscribedEvents.includes(input.eventType))
    .map<WebhookDeliveryRecord>((endpoint) => ({
      id: `whd_${Math.random().toString(36).slice(2, 10)}`,
      organizationId: input.organizationId,
      endpointId: endpoint.id,
      eventType: input.eventType,
      payload: input.payload,
      status: endpoint.url.startsWith("https://") ? "delivered" : "failed",
      createdAt: new Date().toISOString(),
      deliveredAt: endpoint.url.startsWith("https://") ? new Date().toISOString() : undefined,
      httpStatus: endpoint.url.startsWith("https://") ? 202 : 500,
      errorMessage: endpoint.url.startsWith("https://") ? undefined : "Endpoint URL must use HTTPS."
    }));
}

export function buildWebhookAuditEvents(input: {
  deliveries: WebhookDeliveryRecord[];
  connections: IntegrationConnectionRecord[];
  createdByStaffId?: string;
  createdByStaffName?: string;
}) {
  return input.deliveries
    .filter((delivery) => delivery.status === "failed")
    .map<IntegrationAuditEvent>((delivery) => {
      const connection = input.connections.find((entry) => entry.category === "communication" || entry.category === "payment");
      return {
        id: `intaudit_${Math.random().toString(36).slice(2, 10)}`,
        organizationId: delivery.organizationId,
        integrationId: connection?.id,
        providerKey: connection?.providerKey,
        action: "webhook_failed",
        summary: `Webhook ${delivery.eventType} failed for endpoint ${delivery.endpointId}.`,
        createdAt: delivery.createdAt,
        createdByStaffId: input.createdByStaffId,
        createdByStaffName: input.createdByStaffName,
        metadata: {
          endpointId: delivery.endpointId,
          httpStatus: delivery.httpStatus ?? null,
          errorMessage: delivery.errorMessage ?? null
        }
      };
    });
}
