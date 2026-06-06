import { NextResponse } from "next/server";
import { API_FOUNDATION_SPEC, INTEGRATION_CATALOG, WEBHOOK_EVENT_TYPES } from "@/lib/integrations/catalog";

export async function GET() {
  return NextResponse.json({
    api: API_FOUNDATION_SPEC,
    authentication: {
      current: "session",
      future: ["api_key", "oauth_client_credentials"]
    },
    pagination: {
      supported: ["page", "limit", "nextCursor"],
      defaultLimit: 25,
      maxLimit: 100
    },
    filtering: {
      supported: ["status", "search", "dateFrom", "dateTo", "locationId"],
      notes: "Resource-specific filters extend this base pattern in /api/v1 endpoints."
    },
    errors: {
      shape: {
        error: {
          code: "string",
          message: "string",
          requestId: "string"
        }
      }
    },
    rateLimiting: {
      strategy: API_FOUNDATION_SPEC.rateLimiting,
      headers: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"]
    },
    webhooks: WEBHOOK_EVENT_TYPES,
    integrationCategories: Array.from(new Set(INTEGRATION_CATALOG.map((entry) => entry.category)))
  });
}
