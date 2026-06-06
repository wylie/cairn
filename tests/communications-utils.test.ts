import { describe, expect, it } from "vitest";
import { getDefaultCommunicationTemplates, renderTemplateVariables } from "@/lib/communications/templates";
import { mockEmailProvider, mockNotificationProvider, mockSmsProvider } from "@/lib/communications/providers";

describe("communications utilities", () => {
  it("renders default templates and replaces variables", () => {
    const templates = getDefaultCommunicationTemplates("org_summit");
    const template = templates.find((entry) => entry.type === "registration_confirmation");
    expect(template).toBeDefined();
    expect(renderTemplateVariables(template!.body, {
      customerName: "Maya Patel",
      programName: "Summer Camp",
      sessionDate: "2026-06-12",
      facilityName: "Summit Rec Collective"
    })).toContain("Maya Patel");
    expect(renderTemplateVariables("Hello {{customerName}}", { customerName: "Maya" })).toBe("Hello Maya");
  });

  it("uses mock providers without external dependencies", async () => {
    const request = {
      type: "email" as const,
      subject: "Test",
      body: "Hello",
      recipients: [{ id: "cust_001", type: "customer" as const, label: "Maya Patel", customerId: "cust_001", email: "maya@example.com" }],
      sender: { kind: "staff" as const, name: "Taylor Nguyen", staffUserId: "staff_001" }
    };

    const emailResult = await mockEmailProvider.send(request);
    const smsResult = await mockSmsProvider.send({ ...request, type: "sms", recipients: [{ ...request.recipients[0], phone: "2125550100" }] });
    const notificationResult = await mockNotificationProvider.send({ ...request, type: "in_app_notification" });

    expect(emailResult.ok).toBe(true);
    expect(smsResult.ok).toBe(true);
    expect(notificationResult.ok).toBe(true);
    expect(emailResult.providerMessageId).toMatch(/^mock_email_/);
  });
});
