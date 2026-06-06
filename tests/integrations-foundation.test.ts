import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/route";
import { buildDefaultIntegrationConnections, buildDefaultWebhookEndpoints } from "@/lib/integrations/catalog";
import { accountingProvider, calendarProvider, emailProvider, identityProvider, paymentProvider, smsProvider } from "@/lib/integrations/providers";
import { buildWebhookPayload, generateWebhookDeliveries } from "@/lib/integrations/webhooks";

describe("integrations foundation", () => {
  it("generates outbound webhook delivery records for enabled subscribed endpoints", () => {
    const endpoints = buildDefaultWebhookEndpoints("org_summit").map((entry) => ({ ...entry, enabled: true }));
    const payload = buildWebhookPayload({
      organizationId: "org_summit",
      eventType: "waiver.signed",
      resourceId: "signed_001",
      data: { customerId: "cust_001" }
    });

    const deliveries = generateWebhookDeliveries({
      organizationId: "org_summit",
      endpoints,
      eventType: "waiver.signed",
      payload
    });

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.status).toBe("delivered");
    expect(deliveries[0]?.eventType).toBe("waiver.signed");
  });

  it("keeps provider boundaries stable across categories", async () => {
    const [calendarResult, emailResult, smsResult, paymentResult, identityResult, accountingResult] = await Promise.all([
      calendarProvider.createEvent({ title: "Demo", startsAt: "2026-06-06T10:00:00Z", endsAt: "2026-06-06T11:00:00Z" }),
      emailProvider.send({
        type: "email",
        subject: "Hello",
        body: "World",
        recipients: [{ id: "r1", type: "customer", label: "Maya Patel", email: "maya@example.com" }],
        sender: { name: "Cairn", kind: "system" }
      }),
      smsProvider.send({
        type: "sms",
        subject: "",
        body: "World",
        recipients: [{ id: "r2", type: "customer", label: "Maya Patel", phone: "+12125550123" }],
        sender: { name: "Cairn", kind: "system" }
      }),
      paymentProvider.charge({ amountCents: 5000, method: "card", locationId: "loc_001", organizationId: "org_summit" }),
      identityProvider.provisionAccount({ email: "owner@example.com", name: "Owner" }),
      accountingProvider.exportInvoice({ invoiceNumber: "INV-1", totalCents: 5000, customerName: "Maya Patel" })
    ]);

    [calendarResult, emailResult, smsResult, paymentResult, identityResult, accountingResult].forEach((result) => {
      expect(result.ok).toBe(true);
      expect(result.provider).toBeTruthy();
      expect(result.message).toBeTruthy();
    });
  });

  it("returns a consistent v1 API foundation descriptor", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(payload.api.basePath).toBe("/api/v1");
    expect(payload.api.version).toBe("v1");
    expect(payload.pagination.supported).toContain("nextCursor");
    expect(payload.errors.shape.error.code).toBe("string");
    expect(payload.webhooks.length).toBeGreaterThan(0);
  });

  it("seeds organization integration settings predictably", () => {
    const connections = buildDefaultIntegrationConnections("org_summit");
    expect(connections.some((entry) => entry.providerKey === "google_calendar")).toBe(true);
    expect(connections.some((entry) => entry.status === "enabled")).toBe(true);
  });
});
