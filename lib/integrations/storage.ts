import type {
  IntegrationAuditEvent,
  IntegrationConnectionRecord,
  WebhookDeliveryRecord,
  WebhookEndpoint
} from "@/types/domain";
import { loadMockState, saveMockState } from "@/lib/mock-storage";
import { buildDefaultIntegrationConnections, buildDefaultWebhookEndpoints } from "@/lib/integrations/catalog";

function buildKey(organizationId: string, suffix: string) {
  return `cairn_${organizationId}_integrations_${suffix}`;
}

export function readIntegrationConnectionsClient(organizationId: string) {
  return loadMockState<IntegrationConnectionRecord[]>(
    buildKey(organizationId, "connections"),
    buildDefaultIntegrationConnections(organizationId)
  );
}

export function writeIntegrationConnectionsClient(organizationId: string, value: IntegrationConnectionRecord[]) {
  saveMockState(buildKey(organizationId, "connections"), value);
}

export function readWebhookEndpointsClient(organizationId: string) {
  return loadMockState<WebhookEndpoint[]>(
    buildKey(organizationId, "webhooks"),
    buildDefaultWebhookEndpoints(organizationId)
  );
}

export function writeWebhookEndpointsClient(organizationId: string, value: WebhookEndpoint[]) {
  saveMockState(buildKey(organizationId, "webhooks"), value);
}

export function readIntegrationAuditEventsClient(organizationId: string) {
  return loadMockState<IntegrationAuditEvent[]>(buildKey(organizationId, "audit"), []);
}

export function writeIntegrationAuditEventsClient(organizationId: string, value: IntegrationAuditEvent[]) {
  saveMockState(buildKey(organizationId, "audit"), value);
}

export function readWebhookDeliveriesClient(organizationId: string) {
  return loadMockState<WebhookDeliveryRecord[]>(buildKey(organizationId, "deliveries"), []);
}

export function writeWebhookDeliveriesClient(organizationId: string, value: WebhookDeliveryRecord[]) {
  saveMockState(buildKey(organizationId, "deliveries"), value);
}
