import type {
  ApiFoundationSpec,
  IntegrationCategory,
  IntegrationConnectionRecord,
  IntegrationProviderKey,
  WebhookEndpoint,
  WebhookEventType
} from "@/types/domain";

export type IntegrationCatalogEntry = {
  providerKey: IntegrationProviderKey;
  name: string;
  category: IntegrationCategory;
  description: string;
  configurationSummary: string;
};

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    providerKey: "google_calendar",
    name: "Google Calendar",
    category: "calendar",
    description: "Sync facility schedules, session updates, and reservation blocks into Google Calendar.",
    configurationSummary: "OAuth calendar connection placeholder"
  },
  {
    providerKey: "microsoft_calendar",
    name: "Microsoft Calendar",
    category: "calendar",
    description: "Publish and reconcile schedules with Microsoft 365 calendars.",
    configurationSummary: "Microsoft tenant connection placeholder"
  },
  {
    providerKey: "sendgrid",
    name: "SendGrid",
    category: "communication",
    description: "Deliver transactional and campaign email through a provider-backed adapter.",
    configurationSummary: "API key and sender identity placeholder"
  },
  {
    providerKey: "twilio",
    name: "Twilio",
    category: "communication",
    description: "Send SMS notifications, reminders, and operational messaging.",
    configurationSummary: "Messaging service SID placeholder"
  },
  {
    providerKey: "stripe",
    name: "Stripe",
    category: "payment",
    description: "Future-ready payment sync for online checkout, invoicing, and recurring billing.",
    configurationSummary: "Secret key and webhook secret placeholder"
  },
  {
    providerKey: "square",
    name: "Square",
    category: "payment",
    description: "Future-ready POS and online payment provider sync.",
    configurationSummary: "Application ID and location mapping placeholder"
  },
  {
    providerKey: "quickbooks",
    name: "QuickBooks",
    category: "accounting",
    description: "Sync invoices, payments, refunds, and account balances into accounting workflows.",
    configurationSummary: "Company file and ledger mapping placeholder"
  },
  {
    providerKey: "okta",
    name: "Okta",
    category: "identity",
    description: "Support SSO and directory-backed staff authentication in future phases.",
    configurationSummary: "OIDC issuer and client placeholder"
  },
  {
    providerKey: "auth0",
    name: "Auth0",
    category: "identity",
    description: "Prepare for centralized identity across staff and customer auth journeys.",
    configurationSummary: "Domain and application placeholder"
  },
  {
    providerKey: "homebase",
    name: "Homebase",
    category: "scheduling",
    description: "Future scheduling and staffing sync for shifts and coverage.",
    configurationSummary: "Team mapping placeholder"
  },
  {
    providerKey: "deputy",
    name: "Deputy",
    category: "scheduling",
    description: "Future staff scheduling sync for workforce coverage workflows.",
    configurationSummary: "Workplace and roster mapping placeholder"
  },
  {
    providerKey: "when_i_work",
    name: "When I Work",
    category: "scheduling",
    description: "Future workforce schedule and staffing import/export support.",
    configurationSummary: "Shift sync placeholder"
  },
  {
    providerKey: "mailchimp",
    name: "Mailchimp",
    category: "marketing",
    description: "Prepare audience sync and outbound lifecycle campaigns.",
    configurationSummary: "Audience ID placeholder"
  },
  {
    providerKey: "hubspot",
    name: "HubSpot",
    category: "crm",
    description: "Prepare customer and lifecycle sync with CRM workflows.",
    configurationSummary: "Portal and object mapping placeholder"
  }
];

export const WEBHOOK_EVENT_TYPES: Array<{ value: WebhookEventType; label: string; description: string }> = [
  { value: "customer.created", label: "Customer Created", description: "Fires when a new customer record is created." },
  { value: "membership.renewed", label: "Membership Renewed", description: "Fires when a membership renewal succeeds." },
  { value: "waiver.signed", label: "Waiver Signed", description: "Fires when a signed waiver record is created." },
  { value: "registration.created", label: "Registration Created", description: "Fires when a registration is completed." },
  { value: "checkin.occurred", label: "Check-In Occurred", description: "Fires when a customer check-in succeeds." },
  { value: "reservation.created", label: "Reservation Created", description: "Fires when a rental/resource reservation is created." },
  { value: "invoice.paid", label: "Invoice Paid", description: "Fires when a billing invoice is marked paid." }
];

export const API_FOUNDATION_SPEC: ApiFoundationSpec = {
  version: "v1",
  basePath: "/api/v1",
  authentication: "Session auth today; future bearer-token API keys and OAuth client credentials.",
  pagination: "Cursor-friendly page model with limit, page, and nextCursor support.",
  filtering: "Field-based query params with exact, status, date-range, and search filters.",
  errorHandling: "Consistent JSON errors with code, message, and requestId fields.",
  rateLimiting: "Per-organization and per-token throttles with burst and daily caps."
};

export function buildDefaultIntegrationConnections(organizationId: string): IntegrationConnectionRecord[] {
  const now = "2026-06-01T09:00:00Z";
  return INTEGRATION_CATALOG.map((entry, index) => ({
    id: `int_${organizationId}_${entry.providerKey}`,
    organizationId,
    providerKey: entry.providerKey,
    category: entry.category,
    name: entry.name,
    description: entry.description,
    status: index < 2 ? "enabled" : "disabled",
    health: index < 2 ? "healthy" : "unknown",
    configurationSummary: entry.configurationSummary,
    enabledAt: index < 2 ? now : undefined,
    lastActivityAt: index < 2 ? `2026-06-0${index + 2}T14:30:00Z` : undefined,
    updatedAt: now,
    updatedByStaffName: index < 2 ? "Taylor Nguyen" : undefined,
    updatedByStaffId: index < 2 ? "staff_001" : undefined
  }));
}

export function buildDefaultWebhookEndpoints(organizationId: string): WebhookEndpoint[] {
  return [
    {
      id: `wh_${organizationId}_primary`,
      organizationId,
      label: "Primary automation endpoint",
      url: "https://example.com/cairn/webhooks",
      secretHint: "whsec_••••••8h2",
      enabled: false,
      subscribedEvents: ["customer.created", "membership.renewed", "waiver.signed", "registration.created"],
      health: "unknown",
      updatedAt: "2026-06-01T09:00:00Z"
    }
  ];
}

export function getIntegrationsByCategory(category: IntegrationCategory) {
  return INTEGRATION_CATALOG.filter((entry) => entry.category === category);
}
