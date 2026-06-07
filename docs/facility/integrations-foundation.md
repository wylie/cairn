# Integrations Foundation

## Overview

Cairn includes an integrations framework and API foundation, but it does not yet ship live third-party connections. The current goal is to make provider boundaries, webhooks, and organization-level integration settings explicit.

## What Exists Today
- organization-scoped integrations workspace
- platform admin integrations overview
- versioned API foundation at `/api/v1`
- outbound webhook event generation
- provider abstraction interfaces for calendar, email, SMS, payment, identity, and accounting

## Common Workflows
- review available integration categories
- enable or disable integration placeholders
- inspect recent webhook deliveries and audit entries
- test webhook generation

## Tips
- Do not promise live Stripe, Twilio, SendGrid, or QuickBooks connectivity yet.
- The current implementation is an architectural foundation, not a production integration marketplace.

## Related Features
- [Communications](./communications.md)
- [Analytics](./analytics.md)
- [Organizations & Provisioning](../developer/organizations.md)
